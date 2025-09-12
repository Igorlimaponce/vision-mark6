from typing import Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_active_user
from app.crud import crud_event
from app.db.session import get_db
from app.schemas.event import (
    Event,
    EventCreate,
    EventUpdate,
    Detection,
    DetectionCreate,
    DashboardAnalytics,
    EventAnalytics,
    DetectionAnalytics
)
from app.db.models.user import User

router = APIRouter()


@router.get("/analytics", response_model=DashboardAnalytics)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    days: int = Query(7, description="Number of days to analyze"),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get analytics data for dashboard.
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get events analytics
    events_data = crud_event.get_events_analytics(
        db, current_user.organization_id, start_date, end_date
    )
    
    # Get recent events
    recent_events = crud_event.get_recent_events(
        db, current_user.organization_id, hours=24, limit=10
    )
    
    events_analytics = EventAnalytics(
        total_events=events_data["total_events"],
        events_by_type=events_data["events_by_type"],
        events_by_severity=events_data["events_by_severity"],
        events_by_device={},  # TODO: Implement
        recent_events=recent_events
    )
    
    # Get detections analytics
    detections_data = crud_event.get_detections_analytics(
        db, current_user.organization_id, start_date, end_date
    )
    
    detections_analytics = DetectionAnalytics(
        total_detections=detections_data["total_detections"],
        detections_by_class=detections_data["detections_by_class"],
        detections_by_device={},  # TODO: Implement
        average_confidence=detections_data["average_confidence"]
    )
    
    return DashboardAnalytics(
        events=events_analytics,
        detections=detections_analytics,
        period_start=start_date,
        period_end=end_date
    )


@router.get("/events", response_model=List[Event])
def read_events(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    pipeline_id: Optional[str] = Query(None, description="Filter by pipeline ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    acknowledged: Optional[str] = Query(None, description="Filter by acknowledged status"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve events with optional filters.
    """
    events = crud_event.get_events(
        db,
        organization_id=current_user.organization_id,
        skip=skip,
        limit=limit,
        device_id=device_id,
        pipeline_id=pipeline_id,
        event_type=event_type,
        severity=severity,
        acknowledged=acknowledged,
        start_date=start_date,
        end_date=end_date
    )
    return events


@router.post("/events", response_model=Event)
def create_event(
    *,
    db: Session = Depends(get_db),
    event_in: EventCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new event.
    This endpoint is typically used by pipeline execution engines.
    """
    # TODO: Verify that the device belongs to the user's organization
    event = crud_event.create_event(db, event=event_in)
    return event


@router.get("/events/{event_id}", response_model=Event)
def read_event(
    *,
    db: Session = Depends(get_db),
    event_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get a specific event by id.
    """
    event = crud_event.get_event(db, event_id=event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # TODO: Check if the event's device belongs to the same organization
    
    return event


@router.put("/events/{event_id}/acknowledge", response_model=Event)
def acknowledge_event(
    *,
    db: Session = Depends(get_db),
    event_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Acknowledge an event.
    """
    event = crud_event.get_event(db, event_id=event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # TODO: Check if the event's device belongs to the same organization
    
    event = crud_event.acknowledge_event(db, event_id=event_id, user_id=current_user.id)
    return event


@router.get("/detections", response_model=List[Detection])
def read_detections(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    class_name: Optional[str] = Query(None, description="Filter by object class"),
    min_confidence: Optional[float] = Query(None, description="Minimum confidence threshold"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve detections with optional filters.
    """
    detections = crud_event.get_detections(
        db,
        organization_id=current_user.organization_id,
        skip=skip,
        limit=limit,
        device_id=device_id,
        class_name=class_name,
        min_confidence=min_confidence,
        start_date=start_date,
        end_date=end_date
    )
    return detections


@router.post("/detections", response_model=Detection)
def create_detection(
    *,
    db: Session = Depends(get_db),
    detection_in: DetectionCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new detection.
    This endpoint is typically used by computer vision processing engines.
    """
    # TODO: Verify that the device belongs to the user's organization
    detection = crud_event.create_detection(db, detection=detection_in)
    return detection


@router.post("/detections/bulk", response_model=List[Detection])
def create_detections_bulk(
    *,
    db: Session = Depends(get_db),
    detections_in: List[DetectionCreate],
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create multiple detections in bulk for better performance.
    This endpoint is used by computer vision processing engines.
    """
    # TODO: Verify that all devices belong to the user's organization
    detections = crud_event.bulk_create_detections(db, detections=detections_in)
    return detections


@router.get("/events/recent", response_model=List[Event])
def get_recent_events(
    db: Session = Depends(get_db),
    hours: int = Query(24, description="Hours to look back"),
    limit: int = Query(10, description="Maximum number of events"),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get recent events for the organization.
    """
    events = crud_event.get_recent_events(
        db, current_user.organization_id, hours=hours, limit=limit
    )
    return events
