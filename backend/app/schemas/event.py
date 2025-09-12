from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, UUID4


# Event schemas
class EventBase(BaseModel):
    event_type: str
    severity: str = "info"
    title: str
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class EventCreate(EventBase):
    device_id: UUID4
    pipeline_id: UUID4
    timestamp: Optional[datetime] = None


class EventUpdate(BaseModel):
    acknowledged: Optional[str] = None
    acknowledged_by: Optional[UUID4] = None
    acknowledged_at: Optional[datetime] = None


class Event(EventBase):
    id: UUID4
    timestamp: datetime
    device_id: UUID4
    pipeline_id: UUID4
    acknowledged: str
    acknowledged_by: Optional[UUID4] = None
    acknowledged_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Detection schemas
class DetectionBase(BaseModel):
    class_name: str
    confidence: float
    bounding_box: Dict[str, Any]
    track_id: Optional[int] = None
    frame_number: Optional[int] = None
    additional_data: Optional[Dict[str, Any]] = None


class DetectionCreate(DetectionBase):
    device_id: UUID4
    timestamp: Optional[datetime] = None


class Detection(DetectionBase):
    id: UUID4
    timestamp: datetime
    device_id: UUID4

    class Config:
        from_attributes = True


# Analytics schemas
class EventAnalytics(BaseModel):
    total_events: int
    events_by_type: Dict[str, int]
    events_by_severity: Dict[str, int]
    events_by_device: Dict[str, int]
    recent_events: list[Event]


class DetectionAnalytics(BaseModel):
    total_detections: int
    detections_by_class: Dict[str, int]
    detections_by_device: Dict[str, int]
    average_confidence: float


class DashboardAnalytics(BaseModel):
    events: EventAnalytics
    detections: DetectionAnalytics
    period_start: datetime
    period_end: datetime
