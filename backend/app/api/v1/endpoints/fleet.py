from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_active_user
from app.crud import crud_device
from app.db.session import get_db
from app.schemas.device import (
    Device, 
    DeviceCreate, 
    DeviceUpdate, 
    DeviceStatusUpdate,
    DeviceListResponse,
    FleetSummary
)
from app.db.models.user import User

router = APIRouter()


@router.get("/devices", response_model=DeviceListResponse)
def read_devices(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search by device name or location"),
    status: Optional[str] = Query(None, description="Filter by status (ON, OFF, WARNING)"),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve devices for Fleet Management.
    """
    devices = crud_device.get_devices(
        db,
        organization_id=current_user.organization_id,
        skip=skip,
        limit=limit,
        search=search,
        status=status
    )
    
    summary = crud_device.get_fleet_summary(db, current_user.organization_id)
    total = crud_device.count_devices_by_organization(db, current_user.organization_id)
    
    return DeviceListResponse(
        devices=devices,
        total=total,
        summary=summary
    )


@router.get("/summary", response_model=FleetSummary)
def get_fleet_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get fleet summary for dashboard cards.
    """
    return crud_device.get_fleet_summary(db, current_user.organization_id)


@router.post("/devices", response_model=Device)
def create_device(
    *,
    db: Session = Depends(get_db),
    device_in: DeviceCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new device.
    """
    # Ensure the device is created in the same organization
    device_in.organization_id = current_user.organization_id
    
    # Check if device name already exists in the organization
    existing_device = crud_device.get_device_by_name(
        db, name=device_in.name, organization_id=current_user.organization_id
    )
    if existing_device:
        raise HTTPException(
            status_code=400,
            detail="Device with this name already exists in your organization."
        )
    
    device = crud_device.create_device(db, device=device_in)
    return device


@router.get("/devices/{device_id}", response_model=Device)
def read_device(
    *,
    db: Session = Depends(get_db),
    device_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get a specific device by id.
    """
    device = crud_device.get_device(db, device_id=device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check if the device belongs to the same organization
    if device.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    return device


@router.put("/devices/{device_id}", response_model=Device)
def update_device(
    *,
    db: Session = Depends(get_db),
    device_id: str,
    device_in: DeviceUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a device.
    """
    device = crud_device.get_device(db, device_id=device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check if the device belongs to the same organization
    if device.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    device = crud_device.update_device(db, device_id=device_id, device=device_in)
    return device


@router.patch("/devices/{device_id}/status", response_model=Device)
def update_device_status(
    *,
    db: Session = Depends(get_db),
    device_id: str,
    status_update: DeviceStatusUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update device status.
    """
    device = crud_device.get_device(db, device_id=device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    if device.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    device = crud_device.update_device_status(db, device_id=device_id, status=status_update.status)
    return device


@router.delete("/devices/{device_id}")
def delete_device(
    *,
    db: Session = Depends(get_db),
    device_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a device.
    Only admin can delete devices.
    """
    if current_user.role not in ["admin", "operator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    device = crud_device.get_device(db, device_id=device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Check if the device belongs to the same organization
    if device.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    success = crud_device.delete_device(db, device_id=device_id)
    if not success:
        raise HTTPException(status_code=404, detail="Device not found")
    
    return {"message": "Device deleted successfully"}


@router.get("/status/{status}", response_model=List[Device])
def get_devices_by_status(
    *,
    db: Session = Depends(get_db),
    status: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get devices by specific status.
    """
    if status not in ["ON", "OFF", "WARNING"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    devices = crud_device.get_devices_by_status(
        db, organization_id=current_user.organization_id, status=status
    )
    return devices
