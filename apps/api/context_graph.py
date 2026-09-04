from __future__ import annotations

import json
from collections.abc import Callable, Iterable
from pathlib import Path

from fastapi import APIRouter, HTTPException

from apps.api.graph_contract import (
    GraphAction,
    GraphActionKind,
    GraphDTO,
    GraphEdge,
    GraphNode,
    GraphPosition,
    GraphProgress,
    GraphRuntimeState,
    GraphScope,
    GraphStructure,
    GraphTarget,
    GraphViewport,
)
from apps.api.project_explorer import ExplorerState, aggregate_state, inspect_shot_state
from engine.narrative.episode_models import EpisodePackage, EpisodeStatus
from engine.world.catalog import EpisodeCatalog

SHOT_NODE_POSITIONS = {
    "story": (80, 340),
    "director": (380, 340),
    "shot": (680, 340),
    "cast": (390, 80),
    "keyframe": (980, 120),
    "review": (1270, 120),
    "motion": (1560, 120),
    "voice": (980, 570),
    "mix": (1270, 570),
    "montage": (1840, 340),
    "export": (2130, 340),
}
SHOT_OPTIONAL_EDGES = {
    "cast>director",
    "cast>keyframe",
    "shot>voice",
    "voice>mix",
    "mix>montage",
}
EXPLORER_RUNTIME = {
    "idea": GraphRuntimeState.IDLE,
    "draft": GraphRuntimeState.IDLE,
    "review": GraphRuntimeState.READY,
    "approved": GraphRuntimeState.DONE,
    "production": GraphRuntimeState.ACTIVE,
    "complete": GraphRuntimeState.DONE,
    "error": GraphRuntimeState.ERROR,
    "stale": GraphRuntimeState.STALE,
}
RUNTIME_PROGRESS = {
    GraphRuntimeState.IDLE: 0,
    GraphRuntimeState.BLOCKED: 0,
    GraphRuntimeState.READY: 55,
    GraphRuntimeState.ACTIVE: 75,
    GraphRuntimeState.STALE: 65,
    GraphRuntimeState.ERROR: 0,
    GraphRuntimeState.DONE: 100,
}


def create_context_graph_router(
    catalog_provider: Callable[[], EpisodeCatalog],
    output_root_provider: Callable[[], Path],
) -> APIRouter:
    router = APIRouter(prefix="/api/graphs", tags=["graphs"])

    @router.get("/{scope}/{graph_id}", response_model=GraphDTO)
    def context_graph(scope: GraphScope, graph_id: str) -> GraphDTO:
        try:
            return ContextGraphBuilder(
                catalog_provider(),
                output_root_provider(),
            ).build(scope, graph_id)
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=404,
                detail=f"Graph context not found: {graph_id}",
            ) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    return router


class ContextGraphBuilder:
    def __init__(self, catalog: EpisodeCatalog, output_root: Path) -> None:
        self.catalog = catalog
        self.output_root = output_root

    def build(self, scope: GraphScope, graph_id: str) -> GraphDTO:
        if scope is GraphScope.SERIES:
            if graph_id != "series":
                raise ValueError("The series graph id must be 'series'")
            return self.series()
        if scope is GraphScope.EPISODE:
            return self.episode(graph_id)
        return self.shot(graph_id)

    def series(self) -> GraphDTO:
        summaries = self.catalog.list_episodes()
        states: list[GraphRuntimeState] = []
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []
        previous_id: str | None = None
        for index, summary in enumerate(summaries):
            package = self.catalog.load(summary.id)
            shot_states = [
                self._shot_explorer_state(package, shot.id) for shot in package.shots
            ]
            explorer_state = aggregate_state(
                shot_states,
                base=self._episode_base_state(package.episode.status),
            )
            state = EXPLORER_RUNTIME[explorer_state]
            states.append(state)
            node_id = f"episode:{summary.id}"
            x = 120 + index * 330
            progress = self._progress(
                [EXPLORER_RUNTIME[item] for item in shot_states],
                f"{sum(item == 'complete' for item in shot_states)} / {len(shot_states)} plans",
            )
            nodes.append(
                GraphNode(
                    id=node_id,
                    label=summary.title,
                    subtitle=f"{summary.id} · {summary.duration_target:g} s",
                    type_label="ÉPISODE",
                    index=str(index + 1).zfill(2),
                    structure=GraphStructure.CONTAINER,
                    state=state,
                    status=self._state_label(state),
                    position=GraphPosition(x=x, y=270),
                    description=summary.logline,
                    provider="Catalogue narratif",
                    progress=progress,
                    container=GraphTarget(scope=GraphScope.EPISODE, id=summary.id),
                    actions=[
                        self._navigate_action(
                            "open-episode",
                            "Ouvrir l’épisode",
                            GraphScope.EPISODE,
                            summary.id,
                            primary=True,
                        )
                    ],
                    metadata={"episode_id": summary.id, "shot_count": summary.shot_count},
                )
            )
            if previous_id:
                edges.append(self._edge(previous_id, node_id, "Ordre de diffusion de la série."))
            previous_id = node_id

        if not nodes:
            nodes.append(
                GraphNode(
                    id="series:empty",
                    label="Projet sans épisode",
                    subtitle="Le catalogue narratif est vide",
                    type_label="SÉRIE",
                    index="—",
                    structure=GraphStructure.CONTAINER,
                    state=GraphRuntimeState.BLOCKED,
                    status="Aucun épisode",
                    position=GraphPosition(x=160, y=270),
                    description=(
                        "Ajoute un épisode au contenu privé du projet pour commencer "
                        "la production."
                    ),
                    provider="Catalogue narratif",
                )
            )

        return GraphDTO(
            scope=GraphScope.SERIES,
            id="series",
            title="Série",
            subtitle=f"{len(summaries)} épisode{'s' if len(summaries) != 1 else ''}",
            nodes=nodes,
            edges=edges,
            viewport=GraphViewport(width=max(900, 280 + len(nodes) * 330), height=720),
            progress=self._progress(
                states,
                f"{sum(state is GraphRuntimeState.DONE for state in states)} / "
                f"{len(states)} épisodes",
            ),
            metadata={"episode_count": len(summaries)},
        )

    def episode(self, episode_id: str) -> GraphDTO:
        package = self.catalog.load(episode_id)
        explorer_states = [
            self._shot_explorer_state(package, shot.id) for shot in package.shots
        ]
        shot_states = [EXPLORER_RUNTIME[state] for state in explorer_states]
        episode_state = EXPLORER_RUNTIME[
            aggregate_state(
                explorer_states,
                base=self._episode_base_state(package.episode.status),
            )
        ]
        nodes = [
            GraphNode(
                id=f"episode:{episode_id}",
                label=package.episode.title,
                subtitle=f"{package.episode.duration_target:g} s · {len(package.shots)} plans",
                type_label="ÉPISODE",
                index="E",
                structure=GraphStructure.CONTAINER,
                state=episode_state,
                status=self._state_label(episode_state),
                position=GraphPosition(x=70, y=270),
                description=package.episode.logline,
                provider="Contrat Episode",
                progress=self._progress(shot_states, "Progression des plans"),
                actions=[self._workspace_action("open-episode", "Voir l’épisode", "plan")],
            )
        ]
        previous_id = f"episode:{episode_id}"
        edges: list[GraphEdge] = []
        for index, (shot, state) in enumerate(zip(package.shots, shot_states, strict=True)):
            node_id = f"shot:{shot.id}"
            nodes.append(
                GraphNode(
                    id=node_id,
                    label=f"Plan {index + 1:02d}",
                    subtitle=f"{shot.duration:g} s · {shot.camera.shot_type}",
                    type_label="PLAN",
                    index=str(index + 1).zfill(2),
                    structure=GraphStructure.CONTAINER,
                    state=state,
                    status=self._state_label(state),
                    position=GraphPosition(x=390 + index * 300, y=270),
                    description=shot.action,
                    provider="Contrat Shot",
                    progress=GraphProgress(
                        completed=1 if state is GraphRuntimeState.DONE else 0,
                        total=1,
                        percent=RUNTIME_PROGRESS[state],
                        label=self._state_label(state),
                    ),
                    container=GraphTarget(scope=GraphScope.SHOT, id=shot.id),
                    actions=[
                        self._navigate_action(
                            "open-shot",
                            "Ouvrir le plan",
                            GraphScope.SHOT,
                            shot.id,
                            primary=True,
                        )
                    ],
                    metadata={"shot_id": shot.id, "duration": shot.duration},
                )
            )
            edges.append(self._edge(previous_id, node_id, "Enchaînement narratif des plans."))
            previous_id = node_id

        soundtrack_state = self._soundtrack_state(package)
        soundtrack_id = f"audio:{episode_id}"
        nodes.append(
            GraphNode(
                id=soundtrack_id,
                label="Bande-son",
                subtitle="Voix, musique et ambiance",
                type_label="AUDIO",
                index="A",
                structure=GraphStructure.OPTIONAL,
                state=soundtrack_state,
                status=self._state_label(soundtrack_state),
                position=GraphPosition(x=390, y=540),
                description="Couche sonore commune synchronisée avec les plans.",
                provider="TTS · score · SFX",
                actions=[
                    GraphAction(
                        id="generate-music",
                        label="Générer la musique",
                        kind=GraphActionKind.STAGE,
                        value="music",
                    )
                ],
            )
        )
        master_state = self._episode_master_state(episode_id)
        master_id = f"master:{episode_id}"
        master_x = 430 + len(package.shots) * 300
        nodes.append(
            GraphNode(
                id=master_id,
                label="Épisode final",
                subtitle="Montage 9:16 avec sous-titres",
                type_label="MASTER",
                index="✓",
                structure=GraphStructure.CORE,
                state=master_state,
                status=self._state_label(master_state),
                position=GraphPosition(x=master_x, y=270),
                description="Assemblage final des plans, de la bande-son et des sous-titres.",
                provider="FFmpeg",
                actions=[self._workspace_action("show-master", "Voir les sorties", "outputs")],
            )
        )
        edges.append(self._edge(previous_id, master_id, "Le dernier plan rejoint le master."))
        edges.append(
            self._edge(
                f"episode:{episode_id}",
                soundtrack_id,
                "L’intention de l’épisode guide sa bande-son.",
                optional=True,
            )
        )
        edges.append(
            self._edge(
                soundtrack_id,
                master_id,
                "La bande-son est synchronisée dans le master.",
                optional=True,
            )
        )
        return GraphDTO(
            scope=GraphScope.EPISODE,
            id=episode_id,
            title=f"{episode_id} — {package.episode.title}",
            subtitle=package.episode.logline,
            nodes=nodes,
            edges=edges,
            viewport=GraphViewport(width=max(1200, master_x + 310), height=820),
            parent=GraphTarget(scope=GraphScope.SERIES, id="series"),
            progress=self._progress(shot_states, "Plans finalisés"),
            metadata={
                "episode_id": episode_id,
                "shot_count": len(package.shots),
                "duration": package.episode.duration_target,
            },
        )

    def shot(self, shot_id: str) -> GraphDTO:
        episode_id = shot_id.rsplit("-S", 1)[0]
        package = self.catalog.load(episode_id)
        shot = next((item for item in package.shots if item.id == shot_id), None)
        if shot is None:
            raise FileNotFoundError(shot_id)
        state = self._shot_explorer_state(package, shot_id)
        output = self.output_root / shot_id
        assets = self._mapping(output / "imports" / "assets.json")
        keyframes = [
            output / "keyframe.png",
            output / "keyframe-guide-1.png",
            output / "keyframe-guide-2.png",
        ]
        generated_keyframes = sum(path.is_file() for path in keyframes)
        if isinstance(assets.get("keyframe"), dict):
            generated_keyframes = max(1, generated_keyframes)
        has_keyframe = generated_keyframes > 0
        has_video = (output / "clip.mp4").is_file() or isinstance(assets.get("video"), dict)
        has_voice = (
            any((output / name).is_file() for name in ("voice.wav", "voice.mp3"))
            or isinstance(assets.get("audio"), dict)
        )
        has_music = self._has_music(package)
        has_master = (self.output_root / episode_id / "episode.mp4").is_file()
        stale_or_error = {
            "stale": GraphRuntimeState.STALE,
            "error": GraphRuntimeState.ERROR,
        }.get(state)
        keyframe_state = stale_or_error or (
            GraphRuntimeState.DONE if has_keyframe else GraphRuntimeState.READY
        )
        motion_state = stale_or_error or (
            GraphRuntimeState.DONE
            if has_video
            else GraphRuntimeState.READY
            if has_keyframe
            else GraphRuntimeState.BLOCKED
        )
        review_state = (
            GraphRuntimeState.DONE
            if has_video
            else GraphRuntimeState.ACTIVE
            if has_keyframe
            else GraphRuntimeState.READY
        )
        voice_state = (
            GraphRuntimeState.DONE
            if has_voice
            else GraphRuntimeState.READY
            if shot.dialogue
            else GraphRuntimeState.BLOCKED
        )
        mix_state = (
            GraphRuntimeState.DONE
            if has_music and (has_voice or shot.dialogue is None)
            else GraphRuntimeState.READY
            if has_music or has_voice
            else GraphRuntimeState.IDLE
        )
        montage_state = (
            GraphRuntimeState.DONE
            if has_master
            else GraphRuntimeState.READY
            if has_video
            else GraphRuntimeState.BLOCKED
        )
        states = {
            "story": GraphRuntimeState.DONE,
            "director": GraphRuntimeState.IDLE,
            "shot": GraphRuntimeState.STALE if state == "stale" else GraphRuntimeState.DONE,
            "cast": GraphRuntimeState.DONE,
            "keyframe": keyframe_state,
            "review": review_state,
            "motion": motion_state,
            "voice": voice_state,
            "mix": mix_state,
            "montage": montage_state,
            "export": GraphRuntimeState.DONE if has_master else GraphRuntimeState.BLOCKED,
        }
        nodes = self._shot_nodes(package, shot_id, states, generated_keyframes)
        edge_pairs = [
            ("story", "director"),
            ("cast", "director"),
            ("director", "shot"),
            ("shot", "keyframe"),
            ("cast", "keyframe"),
            ("keyframe", "review"),
            ("review", "motion"),
            ("shot", "voice"),
            ("voice", "mix"),
            ("motion", "montage"),
            ("mix", "montage"),
            ("montage", "export"),
        ]
        descriptions = {
            "story>director": "Le texte fournit l’intention narrative à mettre en scène.",
            "cast>director": "Le casting contraint les personnages et leur identité visuelle.",
            "director>shot": "La mise en scène devient un contrat de plan reproductible.",
            "shot>keyframe": "Le cadrage, l’action et la lumière pilotent les images clés.",
            "cast>keyframe": "Les références du casting maintiennent la continuité.",
            "keyframe>review": "Les trois poses sont soumises à la validation créative.",
            "review>motion": "Les poses approuvées guident l’animation vidéo.",
            "shot>voice": "Le dialogue et son intention pilotent la synthèse vocale.",
            "voice>mix": "La voix rejoint la musique et l’ambiance dans le mix.",
            "motion>montage": "Le clip animé devient une source du montage final.",
            "mix>montage": "La bande-son mixée est synchronisée avec les plans.",
            "montage>export": "Le montage validé est encodé avec ses sous-titres.",
        }
        edges = [
            self._edge(
                source,
                target,
                descriptions[f"{source}>{target}"],
                optional=f"{source}>{target}" in SHOT_OPTIONAL_EDGES,
                state=states[target],
            )
            for source, target in edge_pairs
        ]
        completed = sum(
            states[node_id] is GraphRuntimeState.DONE
            for node_id in ("keyframe", "review", "motion", "voice", "mix", "montage", "export")
        )
        return GraphDTO(
            scope=GraphScope.SHOT,
            id=shot_id,
            title=shot_id,
            subtitle=f"{shot.duration:g} s · {shot.camera.shot_type} · {shot.mood}",
            nodes=nodes,
            edges=edges,
            viewport=GraphViewport(width=2440, height=900),
            parent=GraphTarget(scope=GraphScope.EPISODE, id=episode_id),
            progress=GraphProgress(
                completed=completed,
                total=7,
                percent=round(completed / 7 * 100),
                label="Pipeline du plan",
            ),
            metadata={"episode_id": episode_id, "shot_id": shot_id},
        )

    def _shot_nodes(
        self,
        package: EpisodePackage,
        shot_id: str,
        states: dict[str, GraphRuntimeState],
        generated_keyframes: int,
    ) -> list[GraphNode]:
        shot = next(item for item in package.shots if item.id == shot_id)
        specs: list[dict[str, object]] = [
            self._node_spec(
                "story",
                "Histoire",
                "Texte et intention",
                "ENTRÉE",
                "01",
                "container",
                "Le matériau narratif du plan.",
                "Ollama ou fichier texte",
                [self._workspace_action("edit-story", "Éditer l’histoire", "plan#story-editor")],
                slot="story",
            ),
            self._node_spec(
                "director",
                "Director",
                "Découpage créatif",
                "OLLAMA",
                "02",
                "core",
                "Transforme l’histoire en instructions de mise en scène structurées.",
                "Ollama local",
                [
                    GraphAction(
                        id="draft-shot",
                        label="Proposer le Shot",
                        kind=GraphActionKind.DIRECTOR,
                        value="draft",
                        primary=True,
                    )
                ],
            ),
            self._node_spec(
                "shot",
                "Shot JSON",
                "Plan validé",
                "CONTRAT",
                "03",
                "container",
                "Contrat reproductible du cadrage, de l’action et des personnages.",
                "Schéma Pydantic",
                [
                    self._workspace_action(
                        "open-shot-json", "Ouvrir le Shot JSON", "plan#shot-editor"
                    ),
                    self._generate_action("generate-shot", "Générer le plan", "all"),
                ],
            ),
            self._node_spec(
                "cast",
                "Personnages",
                f"{len(shot.characters)} identités",
                "BIBLE",
                "C",
                "optional",
                "Références canoniques des personnages visibles.",
                "Bible privée du projet",
                [self._workspace_action("show-cast", "Voir le casting", "casting")],
            ),
            self._node_spec(
                "keyframe",
                "Keyframes",
                "Trois poses d’action",
                "SDXL / IMPORT",
                "04",
                "core",
                "Images maîtresses de début, milieu et fin pour guider l’animation.",
                "SDXL ou images importées",
                [
                    self._generate_action(
                        "generate-keyframes", "Générer les poses", "keyframe"
                    ),
                    self._workflow_action(
                        "keyframe-workflow", "Voir le sous-workflow", "keyframe"
                    ),
                    self._import_action(
                        "import-keyframe", "Importer une image", "keyframe"
                    ),
                ],
                slot="keyframe",
                progress=GraphProgress(
                    completed=generated_keyframes,
                    total=3,
                    percent=round(min(3, generated_keyframes) / 3 * 100),
                    label=f"{generated_keyframes} / 3 poses",
                ),
            ),
            self._node_spec(
                "review",
                "Validation",
                "Approuver ou relancer",
                "HUMAIN",
                "✓",
                "core",
                "Contrôle humain de la silhouette, du visage et de la composition.",
                "Validation créative",
                [
                    self._workspace_action(
                        "show-previews", "Voir les sorties", "outputs"
                    ),
                    self._workflow_action(
                        "continuity-workflow", "Voir la continuité", "keyframe-guide"
                    ),
                    self._generate_action(
                        "reroll-keyframes", "Régénérer", "keyframe"
                    ),
                ],
            ),
            self._node_spec(
                "motion",
                "Mouvement",
                "Images vers vidéo",
                "LTX / IMPORT",
                "05",
                "core",
                "Transforme les poses approuvées en clip animé cohérent.",
                "LTX Video ou vidéo importée",
                [
                    self._generate_action("animate-shot", "Animer les poses", "video"),
                    self._workflow_action(
                        "video-workflow", "Voir le sous-workflow", "video"
                    ),
                    self._import_action("import-video", "Importer une vidéo", "video"),
                ],
                slot="video",
            ),
            self._node_spec(
                "voice",
                "Voix & son",
                "Jeu, ambiance et effets",
                "AUDIO",
                "A",
                "optional",
                "La réplique et son intention deviennent une interprétation audio.",
                "TTS local ou audio importé",
                [
                    self._stage_action("generate-voice", "Générer la voix", "voice"),
                    self._import_action("import-audio", "Importer un son", "audio"),
                ],
                slot="audio",
            ),
            self._node_spec(
                "mix",
                "Synchronisation",
                "Voix, musique et SFX",
                "MIXAGE",
                "M",
                "optional",
                "Assemble la voix, la musique et l’ambiance du plan.",
                "Mixage local",
                [self._stage_action("generate-music", "Générer la musique", "music")],
            ),
            self._node_spec(
                "montage",
                "Montage",
                "Plans approuvés",
                "FFMPEG",
                "06",
                "core",
                "Ordonne les clips et synchronise leur bande-son.",
                "FFmpeg",
                [self._workspace_action("show-montage", "Voir les sorties", "outputs")],
            ),
            self._node_spec(
                "export",
                "Épisode final",
                "1080 × 1920",
                "9:16",
                "07",
                "container",
                "Épisode final avec image, son, sous-titres et manifeste.",
                "Export vertical",
                [
                    self._workspace_action(
                        "show-artifacts", "Voir la traçabilité", "outputs"
                    )
                ],
            ),
        ]
        nodes: list[GraphNode] = []
        for spec in specs:
            node_id = str(spec["id"])
            x, y = SHOT_NODE_POSITIONS[node_id]
            nodes.append(
                GraphNode.model_validate(
                    {
                        **spec,
                        "position": GraphPosition(x=x, y=y),
                        "state": states[node_id],
                        "status": self._state_label(states[node_id]),
                    }
                )
            )
        return nodes

    @staticmethod
    def _node_spec(
        node_id: str,
        label: str,
        subtitle: str,
        type_label: str,
        index: str,
        structure: str,
        description: str,
        provider: str,
        actions: list[GraphAction],
        *,
        slot: str | None = None,
        progress: GraphProgress | None = None,
    ) -> dict[str, object]:
        return {
            "id": node_id,
            "label": label,
            "subtitle": subtitle,
            "type_label": type_label,
            "index": index,
            "structure": GraphStructure(structure),
            "description": description,
            "provider": provider,
            "actions": actions,
            "slot": slot,
            "progress": progress,
        }

    def _shot_explorer_state(
        self,
        package: EpisodePackage,
        shot_id: str,
    ) -> ExplorerState:
        source = (
            self.catalog.root
            / "episodes"
            / f"season-{package.episode.season:02d}"
            / package.episode.id
            / "shots"
            / f"{shot_id}.json"
        )
        return inspect_shot_state(source, self.output_root / shot_id)

    def _soundtrack_state(self, package: EpisodePackage) -> GraphRuntimeState:
        if self._has_music(package):
            return GraphRuntimeState.DONE
        if any(shot.dialogue for shot in package.shots):
            return GraphRuntimeState.READY
        return GraphRuntimeState.IDLE

    def _has_music(self, package: EpisodePackage) -> bool:
        episode_id = package.episode.id
        private_episode = (
            self.catalog.root
            / "episodes"
            / f"season-{package.episode.season:02d}"
            / episode_id
        )
        return (private_episode / "music.wav").is_file() or (
            self.output_root / episode_id / "music.wav"
        ).is_file()

    def _episode_master_state(self, episode_id: str) -> GraphRuntimeState:
        episode_output = self.output_root / episode_id
        if (episode_output / "episode.mp4").is_file():
            return GraphRuntimeState.DONE
        manifest = self._mapping(episode_output / "episode-generation.json")
        status = str(manifest.get("status", "")).upper()
        if status in {"FAILED", "ERROR"}:
            return GraphRuntimeState.ERROR
        if status in {"QUEUED", "GENERATING", "RUNNING"}:
            return GraphRuntimeState.ACTIVE
        return GraphRuntimeState.BLOCKED

    @staticmethod
    def _mapping(path: Path) -> dict[str, object]:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}
        return payload if isinstance(payload, dict) else {}

    @staticmethod
    def _episode_base_state(status: EpisodeStatus) -> ExplorerState:
        mapping: dict[EpisodeStatus, ExplorerState] = {
            EpisodeStatus.DRAFT: "draft",
            EpisodeStatus.APPROVED: "approved",
            EpisodeStatus.FINAL: "complete",
        }
        return mapping[status]

    @staticmethod
    def _progress(
        states: Iterable[GraphRuntimeState],
        label: str,
    ) -> GraphProgress:
        items = list(states)
        completed = sum(state is GraphRuntimeState.DONE for state in items)
        percent = (
            round(sum(RUNTIME_PROGRESS[state] for state in items) / len(items))
            if items
            else 0
        )
        return GraphProgress(
            completed=completed,
            total=len(items),
            percent=percent,
            label=label,
        )

    @staticmethod
    def _state_label(state: GraphRuntimeState) -> str:
        return {
            GraphRuntimeState.IDLE: "Disponible",
            GraphRuntimeState.READY: "Prêt",
            GraphRuntimeState.ACTIVE: "En cours",
            GraphRuntimeState.DONE: "Terminé",
            GraphRuntimeState.BLOCKED: "Bloqué",
            GraphRuntimeState.STALE: "À actualiser",
            GraphRuntimeState.ERROR: "Erreur",
        }[state]

    @staticmethod
    def _edge(
        source: str,
        target: str,
        description: str,
        *,
        optional: bool = False,
        state: GraphRuntimeState = GraphRuntimeState.IDLE,
    ) -> GraphEdge:
        return GraphEdge(
            id=f"{source}>{target}",
            source=source,
            target=target,
            structure=GraphStructure.OPTIONAL if optional else GraphStructure.CORE,
            state=state,
            description=description,
            active=state is GraphRuntimeState.ACTIVE,
        )

    @staticmethod
    def _navigate_action(
        action_id: str,
        label: str,
        scope: GraphScope,
        target_id: str,
        *,
        primary: bool = False,
    ) -> GraphAction:
        return GraphAction(
            id=action_id,
            label=label,
            kind=GraphActionKind.NAVIGATE,
            target=GraphTarget(scope=scope, id=target_id),
            primary=primary,
        )

    @staticmethod
    def _workspace_action(action_id: str, label: str, value: str) -> GraphAction:
        return GraphAction(
            id=action_id,
            label=label,
            kind=GraphActionKind.WORKSPACE,
            value=value,
        )

    @staticmethod
    def _generate_action(action_id: str, label: str, value: str) -> GraphAction:
        return GraphAction(
            id=action_id,
            label=label,
            kind=GraphActionKind.GENERATE,
            value=value,
        )

    @staticmethod
    def _stage_action(action_id: str, label: str, value: str) -> GraphAction:
        return GraphAction(
            id=action_id,
            label=label,
            kind=GraphActionKind.STAGE,
            value=value,
        )

    @staticmethod
    def _workflow_action(action_id: str, label: str, value: str) -> GraphAction:
        return GraphAction(
            id=action_id,
            label=label,
            kind=GraphActionKind.WORKFLOW,
            value=value,
        )

    @staticmethod
    def _import_action(action_id: str, label: str, value: str) -> GraphAction:
        return GraphAction(
            id=action_id,
            label=label,
            kind=GraphActionKind.IMPORT,
            value=value,
        )
