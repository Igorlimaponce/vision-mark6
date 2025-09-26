from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, UUID4


# Base schemas
class DeviceBase(BaseModel):
    name: str
    device_type: str = "camera"
    rtsp_url: Optional[str] = None
    location: Optional[str] = None
    device_data: Optional[Dict[str, Any]] = None


class DeviceCreate(DeviceBase):
    organization_id: UUID4


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    rtsp_url: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    device_data: Optional[Dict[str, Any]] = None
    last_seen: Optional[datetime] = None


class Device(DeviceBase):
    id: UUID4
    organization_id: UUID4
    status: str
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Status update schema
class DeviceStatusUpdate(BaseModel):
    device_id: UUID4
    status: str
    last_seen: Optional[datetime] = None
    device_data: Optional[Dict[str, Any]] = None


# Fleet summary schema
class FleetSummary(BaseModel):
    total_devices: int
    online_devices: int
    offline_devices: int
    warning_devices: int
    last_updated: datetime


# Device list response
class DeviceListResponse(BaseModel):
    devices: list[Device]
    total: int
    summary: FleetSummary
