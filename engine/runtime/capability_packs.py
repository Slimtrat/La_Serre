from __future__ import annotations

import hashlib
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator

DEFAULT_PACK_PATH = Path(__file__).resolve().parents[2] / "packs" / "tentafruit-local-12gb-v1.json"

ComponentKind = Literal["engine", "model", "node_bundle", "workflow_bundle"]
DetectionKind = Literal["ollama", "ollama_model", "comfyui", "comfy_model", "nodes", "files"]
PackState = Literal["ready", "incomplete", "incompatible"]
ComponentState = Literal["installed", "missing", "unavailable", "unknown", "invalid"]


class StrictPackModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LicenseNotice(StrictPackModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    url: HttpUrl
    summary: str = Field(min_length=1)
    commercial_use: Literal["allowed", "restricted", "review_required"]


class ChecksumSpec(StrictPackModel):
    algorithm: Literal["sha256", "ollama-manifest", "source-declared"]
    value: str | None = Field(default=None, min_length=8)
    verify_when_available: bool = True

    @model_validator(mode="after")
    def checksum_matches_algorithm(self) -> ChecksumSpec:
        if self.algorithm == "sha256" and self.value is not None:
            normalized = self.value.lower()
            if len(normalized) != 64 or any(
                character not in "0123456789abcdef" for character in normalized
            ):
                raise ValueError(
                    "A SHA-256 checksum must contain exactly 64 hexadecimal characters"
                )
        return self


class ComponentDetection(StrictPackModel):
    kind: DetectionKind
    value: str = Field(min_length=1)
    aliases: list[str] = Field(default_factory=list)


class PackComponent(StrictPackModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]*$")
    role: str = Field(min_length=1)
    kind: ComponentKind
    required: bool = True
    size_bytes: int = Field(default=0, ge=0)
    source: HttpUrl
    destination: str = Field(min_length=1)
    license: LicenseNotice
    checksum: ChecksumSpec
    detection: ComponentDetection
    action: str = Field(min_length=1)


class HardwareRequirement(StrictPackModel):
    minimum_vram_gb: float = Field(gt=0)
    recommended_vram_gb: float = Field(gt=0)
    minimum_system_ram_gb: float = Field(gt=0)
    workspace_reserve_bytes: int = Field(ge=0)
    supported_gpu_vendor: str = Field(min_length=1)
    preset: str = Field(min_length=1)

    @model_validator(mode="after")
    def recommendation_meets_minimum(self) -> HardwareRequirement:
        if self.recommended_vram_gb < self.minimum_vram_gb:
            raise ValueError("recommended_vram_gb must meet minimum_vram_gb")
        return self


class SmokeCheck(StrictPackModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]*$")
    label: str = Field(min_length=1)
    description: str = Field(min_length=1)
    required_roles: list[str] = Field(min_length=1)
    command: str = Field(min_length=1)


class CapabilityPack(StrictPackModel):
    schema_version: int = 1
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9._-]*$")
    version: int = Field(ge=1)
    label: str = Field(min_length=1)
    description: str = Field(min_length=1)
    hardware: HardwareRequirement
    workflow_model_roles: list[str] = Field(min_length=1)
    components: list[PackComponent] = Field(min_length=1)
    smoke_checks: list[SmokeCheck] = Field(min_length=1)

    @model_validator(mode="after")
    def identifiers_and_roles_are_coherent(self) -> CapabilityPack:
        ids = [component.id for component in self.components]
        if len(ids) != len(set(ids)):
            raise ValueError("Capability pack component ids must be unique")
        comfy_roles = {
            component.detection.value
            for component in self.components
            if component.detection.kind == "comfy_model"
        }
        missing = set(self.workflow_model_roles) - comfy_roles
        if missing:
            raise ValueError("Unknown workflow model roles: " + ", ".join(sorted(missing)))
        smoke_roles = {role for check in self.smoke_checks for role in check.required_roles}
        component_ids = set(ids)
        if smoke_roles - component_ids:
            raise ValueError(
                "Smoke checks reference unknown components: "
                + ", ".join(sorted(smoke_roles - component_ids))
            )
        return self

    def component(self, component_id: str) -> PackComponent:
        try:
            return next(item for item in self.components if item.id == component_id)
        except StopIteration as exc:
            raise KeyError(f"Unknown pack component: {component_id}") from exc

    @property
    def recommended_narrative_model(self) -> str:
        return self.component("narrative-qwen3-4b").detection.value

    def comfy_model_requirements(self) -> tuple[ModelRequirement, ...]:
        roles = set(self.workflow_model_roles)
        return tuple(
            ModelRequirement(
                role=component.role,
                filename=Path(component.destination).name,
                folder=Path(component.destination).parent.as_posix(),
                url=str(component.source),
                component_id=component.id,
                capability_role=component.detection.value,
                size_bytes=component.size_bytes,
                license_id=component.license.id,
            )
            for component in self.components
            if component.detection.kind == "comfy_model" and component.detection.value in roles
        )


@dataclass(frozen=True, slots=True)
class ModelRequirement:
    """Legacy Comfy contract, now projected from a CapabilityPack component."""

    role: str
    filename: str
    folder: str
    url: str
    component_id: str = ""
    capability_role: str = ""
    size_bytes: int = 0
    license_id: str = ""


class HardwareSnapshot(StrictPackModel):
    vram_gb: float | None = Field(default=None, ge=0)
    system_ram_gb: float | None = Field(default=None, ge=0)
    disk_free_bytes: int = Field(ge=0)
    disk_path: str
    gpu_name: str | None = None
    source: str = "unknown"


class ComponentDiagnosis(StrictPackModel):
    id: str
    role: str
    kind: ComponentKind
    required: bool
    state: ComponentState
    reason: str
    action: str
    size_bytes: int
    source: str
    destination: str
    license: LicenseNotice
    checksum: ChecksumSpec
    detected_path: str | None = None


class PackDiagnosis(StrictPackModel):
    pack_id: str
    pack_version: int
    status: PackState
    summary: str
    requirements: HardwareRequirement
    hardware: HardwareSnapshot
    required_download_bytes: int
    components: list[ComponentDiagnosis]
    reasons: list[str]
    actions: list[str]
    smoke_checks: list[SmokeCheck]


def load_capability_pack(path: Path = DEFAULT_PACK_PATH) -> CapabilityPack:
    return CapabilityPack.model_validate_json(path.read_text(encoding="utf-8-sig"))


DEFAULT_CAPABILITY_PACK = load_capability_pack()


class CapabilityPackInspector:
    def __init__(self, pack: CapabilityPack = DEFAULT_CAPABILITY_PACK) -> None:
        self.pack = pack

    def inspect(
        self,
        *,
        hardware: HardwareSnapshot,
        model_roots: tuple[Path, ...],
        workflow_root: Path,
        installed_ollama_models: set[str] | frozenset[str] = frozenset(),
        ollama_reachable: bool = False,
        comfyui_reachable: bool = False,
        available_nodes: set[str] | frozenset[str] | None = None,
    ) -> PackDiagnosis:
        components = [
            self._component_status(
                component,
                model_roots=model_roots,
                workflow_root=workflow_root,
                installed_ollama_models=installed_ollama_models,
                ollama_reachable=ollama_reachable,
                comfyui_reachable=comfyui_reachable,
                available_nodes=available_nodes,
            )
            for component in self.pack.components
        ]
        missing_required = [
            item for item in components if item.required and item.state != "installed"
        ]
        required_download_bytes = sum(
            item.size_bytes
            for item in missing_required
            if item.kind == "model" and item.state != "invalid"
        )
        reasons: list[str] = []
        actions: list[str] = []
        incompatible = False
        if hardware.vram_gb is None:
            reasons.append("Impossible de mesurer la VRAM NVIDIA; vérifie le GPU manuellement.")
            actions.append("Installe le pilote NVIDIA et rends nvidia-smi disponible.")
        elif hardware.vram_gb < self.pack.hardware.minimum_vram_gb:
            incompatible = True
            reasons.append(
                f"VRAM {hardware.vram_gb:g} Go < minimum {self.pack.hardware.minimum_vram_gb:g} Go."
            )
            actions.append("Utilise un GPU NVIDIA de 12 Go ou plus pour ce pack.")
        required_disk = required_download_bytes + self.pack.hardware.workspace_reserve_bytes
        if hardware.disk_free_bytes < required_disk:
            incompatible = True
            reasons.append(
                f"Disque libre insuffisant: {hardware.disk_free_bytes} octets disponibles, "
                f"{required_disk} requis avec la réserve de travail."
            )
            actions.append(
                "Libère de l’espace ou configure le dossier de modèles sur un autre disque."
            )
        for item in missing_required:
            reasons.append(f"{item.role}: {item.reason}")
            actions.append(item.action)
        actions = list(dict.fromkeys(actions))
        if incompatible:
            status: PackState = "incompatible"
            summary = "Le matériel ne satisfait pas le pack Tentafruit 12 Go."
        elif missing_required or hardware.vram_gb is None:
            status = "incomplete"
            summary = "Le matériel est compatible, mais des composants restent à préparer."
        else:
            status = "ready"
            summary = "Le pack Tentafruit local 12 Go est prêt."
        return PackDiagnosis(
            pack_id=self.pack.id,
            pack_version=self.pack.version,
            status=status,
            summary=summary,
            requirements=self.pack.hardware,
            hardware=hardware,
            required_download_bytes=required_download_bytes,
            components=components,
            reasons=reasons,
            actions=actions,
            smoke_checks=self.pack.smoke_checks,
        )

    def _component_status(
        self,
        component: PackComponent,
        *,
        model_roots: tuple[Path, ...],
        workflow_root: Path,
        installed_ollama_models: set[str] | frozenset[str],
        ollama_reachable: bool,
        comfyui_reachable: bool,
        available_nodes: set[str] | frozenset[str] | None,
    ) -> ComponentDiagnosis:
        detection = component.detection
        detected_path: Path | None = None
        state: ComponentState
        reason: str
        if detection.kind == "ollama":
            state = "installed" if ollama_reachable else "unavailable"
            reason = "Ollama répond localement." if ollama_reachable else "Ollama ne répond pas."
        elif detection.kind == "ollama_model":
            candidates = {detection.value, *detection.aliases}
            found = bool(candidates.intersection(installed_ollama_models))
            state = "installed" if found else "missing"
            reason = "Modèle présent dans Ollama." if found else "Modèle absent d’Ollama."
        elif detection.kind == "comfyui":
            state = "installed" if comfyui_reachable else "unavailable"
            reason = (
                "ComfyUI répond localement."
                if comfyui_reachable
                else "ComfyUI est arrêté ou inaccessible; le diagnostic reste disponible."
            )
        elif detection.kind == "comfy_model":
            relative_paths = (component.destination, *detection.aliases)
            detected_path = next(
                (
                    root / relative
                    for root in model_roots
                    for relative in relative_paths
                    if (root / relative).is_file() and (root / relative).stat().st_size > 0
                ),
                None,
            )
            state = "installed" if detected_path else "missing"
            reason = (
                "Fichier détecté dans un chemin supporté." if detected_path else "Fichier absent."
            )
            if detected_path and not self._checksum_matches(detected_path, component.checksum):
                state = "invalid"
                reason = "Le checksum du fichier installé ne correspond pas au manifeste."
        elif detection.kind == "nodes":
            required_nodes = {detection.value, *detection.aliases}
            if available_nodes is None:
                state = "unknown"
                reason = "Nodes non vérifiables tant que ComfyUI est arrêté."
            else:
                missing = sorted(required_nodes - set(available_nodes))
                state = "installed" if not missing else "missing"
                reason = (
                    "Tous les nodes sont disponibles."
                    if not missing
                    else "Nodes absents: " + ", ".join(missing)
                )
        else:
            required_files = (detection.value, *detection.aliases)
            missing_files = [
                name for name in required_files if not (workflow_root / name).is_file()
            ]
            state = "installed" if not missing_files else "missing"
            reason = (
                "Workflows locaux présents."
                if not missing_files
                else "Fichiers absents: " + ", ".join(missing_files)
            )
        return ComponentDiagnosis(
            id=component.id,
            role=component.role,
            kind=component.kind,
            required=component.required,
            state=state,
            reason=reason,
            action=component.action,
            size_bytes=component.size_bytes,
            source=str(component.source),
            destination=component.destination,
            license=component.license,
            checksum=component.checksum,
            detected_path=str(detected_path) if detected_path else None,
        )

    @staticmethod
    def _checksum_matches(path: Path, checksum: ChecksumSpec) -> bool:
        if (
            checksum.algorithm != "sha256"
            or not checksum.value
            or not checksum.verify_when_available
        ):
            return True
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest() == checksum.value.lower()


def inspect_hardware(disk_path: Path) -> HardwareSnapshot:
    resolved = _existing_ancestor(disk_path)
    disk_free = shutil.disk_usage(resolved).free
    vram_gb: float | None = None
    gpu_name: str | None = None
    source = "unknown"
    try:
        completed = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            check=True,
            text=True,
            timeout=3,
        )
        first = completed.stdout.strip().splitlines()[0]
        name, memory_mib = (part.strip() for part in first.rsplit(",", 1))
        gpu_name = name
        vram_gb = round(float(memory_mib) / 1024, 1)
        source = "nvidia-smi"
    except (FileNotFoundError, IndexError, subprocess.SubprocessError, ValueError):
        pass
    return HardwareSnapshot(
        vram_gb=vram_gb,
        disk_free_bytes=disk_free,
        disk_path=str(resolved),
        gpu_name=gpu_name,
        source=source,
    )


def _existing_ancestor(path: Path) -> Path:
    candidate = path.resolve()
    while not candidate.exists() and candidate != candidate.parent:
        candidate = candidate.parent
    return candidate
