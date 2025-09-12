from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, UUID4


# Pipeline Node schemas
class PipelineNodeBase(BaseModel):
    node_type: str
    node_id: str
    config: Dict[str, Any]
    position: Dict[str, Any]


class PipelineNodeCreate(PipelineNodeBase):
    pass


class PipelineNodeUpdate(BaseModel):
    node_type: Optional[str] = None
    node_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    position: Optional[Dict[str, Any]] = None


class PipelineNode(PipelineNodeBase):
    id: UUID4
    pipeline_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True


# Pipeline Edge schemas
class PipelineEdgeBase(BaseModel):
    edge_id: str
    source_node_id: UUID4
    target_node_id: UUID4
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None


class PipelineEdgeCreate(PipelineEdgeBase):
    pass


class PipelineEdgeUpdate(BaseModel):
    edge_id: Optional[str] = None
    source_node_id: Optional[UUID4] = None
    target_node_id: Optional[UUID4] = None
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None


class PipelineEdge(PipelineEdgeBase):
    id: UUID4
    pipeline_id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True


# Pipeline schemas
class PipelineBase(BaseModel):
    name: str
    description: Optional[str] = None


class PipelineCreate(PipelineBase):
    organization_id: UUID4
    nodes: Optional[List[PipelineNodeCreate]] = []
    edges: Optional[List[PipelineEdgeCreate]] = []


class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    nodes: Optional[List[PipelineNodeCreate]] = None
    edges: Optional[List[PipelineEdgeCreate]] = None


class Pipeline(PipelineBase):
    id: UUID4
    organization_id: UUID4
    status: str
    created_by_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime
    nodes: List[PipelineNode] = []
    edges: List[PipelineEdge] = []

    class Config:
        from_attributes = True


# Pipeline execution schemas
class PipelineExecution(BaseModel):
    pipeline_id: UUID4
    action: str  # start, stop, restart
    device_ids: Optional[List[UUID4]] = None


class PipelineStatus(BaseModel):
    pipeline_id: UUID4
    status: str
    is_running: bool
    last_execution: Optional[datetime] = None
    error_message: Optional[str] = None
    devices_count: int
    events_count: int


# Pipeline list response
class PipelineListResponse(BaseModel):
    pipelines: List[Pipeline]
    total: int
