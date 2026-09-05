from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class GraphModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GraphScope(StrEnum):
    SERIES = "series"
    EPISODE = "episode"
    SHOT = "shot"


class GraphStructure(StrEnum):
    CORE = "core"
    OPTIONAL = "optional"
    CONTAINER = "container"


class GraphRuntimeState(StrEnum):
    IDLE = "idle"
    READY = "ready"
    ACTIVE = "active"
    DONE = "done"
    BLOCKED = "blocked"
    STALE = "stale"
    ERROR = "error"


class GraphActionKind(StrEnum):
    NAVIGATE = "navigate"
    WORKSPACE = "workspace"
    GENERATE = "generate"
    STAGE = "stage"
    WORKFLOW = "workflow"
    IMPORT = "import"
    DIRECTOR = "director"
    VALIDATE = "validate"


class GraphTarget(GraphModel):
    scope: GraphScope
    id: str = Field(min_length=1)


class GraphPosition(GraphModel):
    x: int = Field(ge=0)
    y: int = Field(ge=0)


class GraphProgress(GraphModel):
    completed: int = Field(ge=0)
    total: int = Field(ge=0)
    percent: int = Field(ge=0, le=100)
    label: str = ""


class GraphAction(GraphModel):
    id: str = Field(pattern=r"^[a-z][a-z0-9-]*$")
    label: str = Field(min_length=1)
    kind: GraphActionKind
    value: str = ""
    target: GraphTarget | None = None
    primary: bool = False


class GraphNode(GraphModel):
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    subtitle: str = ""
    type_label: str = Field(min_length=1)
    index: str = ""
    structure: GraphStructure = GraphStructure.CORE
    state: GraphRuntimeState = GraphRuntimeState.IDLE
    status: str = ""
    position: GraphPosition
    description: str = ""
    provider: str = ""
    progress: GraphProgress | None = None
    container: GraphTarget | None = None
    actions: list[GraphAction] = Field(default_factory=list)
    slot: str | None = None
    metadata: dict[str, str | int | float | bool] = Field(default_factory=dict)


class GraphEdge(GraphModel):
    id: str = Field(pattern=r"^[a-zA-Z0-9:_-]+>[a-zA-Z0-9:_-]+$")
    source: str = Field(min_length=1)
    target: str = Field(min_length=1)
    structure: GraphStructure = GraphStructure.CORE
    state: GraphRuntimeState = GraphRuntimeState.IDLE
    description: str = ""
    active: bool = False
    progress: GraphProgress | None = None


class GraphViewport(GraphModel):
    width: int = Field(ge=640)
    height: int = Field(ge=480)


class GraphDTO(GraphModel):
    scope: GraphScope
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    subtitle: str = ""
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    viewport: GraphViewport
    parent: GraphTarget | None = None
    progress: GraphProgress | None = None
    metadata: dict[str, str | int | float | bool] = Field(default_factory=dict)
