from __future__ import annotations

from collections.abc import Callable

from fastapi import APIRouter, HTTPException

from apps.api.workflow_graph import build_workflow_graph_payload
from engine.config import Settings
from engine.generation.comfy.model_installer import ModelInstaller
from engine.generation.comfy.workflow_factory import ModelRequirement
from engine.generation.comfy.workflow_templates import (
    WorkflowTemplateCatalogue,
    WorkflowTemplateSpec,
)


def create_workflow_template_router(
    settings_provider: Callable[[], Settings],
) -> APIRouter:
    router = APIRouter(prefix="/api/workflow-templates", tags=["workflow-templates"])

    @router.get("")
    def list_templates() -> dict[str, object]:
        settings = settings_provider()
        catalogue = WorkflowTemplateCatalogue()
        templates = catalogue.build()
        requirements = {
            model.filename: ModelRequirement(
                role=model.role,
                filename=model.filename,
                folder=model.folder,
                url=model.url or "",
            )
            for template in templates
            for model in template.spec.models
        }
        detected = ModelInstaller.detect_model_roots()
        configured_root = (
            settings.comfyui_models_dir.resolve()
            if settings.comfyui_models_dir is not None
            else detected[0]
        )
        roots = tuple(
            dict.fromkeys((configured_root, *detected))
        )
        installer = ModelInstaller(
            tuple(requirements.values()),
            downloads_dir=settings.downloads_dir,
            models_root=roots[0],
            model_search_roots=roots,
        )
        status_by_filename = {
            str(item["filename"]): item for item in installer.inspect()
        }
        return {
            "schema_version": 1,
            "continuity_chain": list(catalogue.chain),
            "models_roots": [str(root) for root in roots],
            "downloads_dir": str(settings.downloads_dir),
            "templates": [
                _template_response(template.spec, status_by_filename)
                for template in templates
            ],
        }

    @router.get("/{template_id}/graph")
    def template_graph(template_id: str) -> dict[str, object]:
        template = next(
            (
                item
                for item in WorkflowTemplateCatalogue().build()
                if item.spec.id == template_id
            ),
            None,
        )
        if template is None:
            raise HTTPException(status_code=404, detail="Template introuvable")
        return build_workflow_graph_payload(
            template.spec.id,
            template.workflow,
            template.profile.model_dump(mode="json"),
        )

    return router


def _template_response(
    spec: WorkflowTemplateSpec,
    status_by_filename: dict[str, dict[str, object]],
) -> dict[str, object]:
    model_specs = spec.models
    models: list[dict[str, object]] = []
    for model in model_specs:
        raw_status = status_by_filename.get(model.filename)
        status = raw_status if isinstance(raw_status, dict) else {}
        models.append(
            {
                **model.model_dump(mode="json"),
                **status,
                "installed": status.get("state") == "installed",
            }
        )
    return {
        "id": spec.id,
        "version": spec.version,
        "label": spec.label,
        "description": spec.description,
        "stage": spec.stage,
        "model_family": spec.model_family,
        "required_nodes": spec.required_nodes,
        "models": models,
        "models_ready": all(bool(item["installed"]) for item in models),
        "defaults": spec.defaults,
        "prompt_sections": spec.prompt_sections,
        "receives": spec.receives,
        "produces": spec.produces,
        "next_templates": spec.next_templates,
        "limitations": spec.limitations,
    }
