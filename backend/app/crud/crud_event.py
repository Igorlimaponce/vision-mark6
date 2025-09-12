from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc

from app.db.models.event import Event, Detection
from app.db.models.device import Device
from app.schemas.event import EventCreate, EventUpdate, DetectionCreate


def get_event(db: Session, event_id: UUID) -> Optional[Event]:
    """
    Busca um evento por ID.
    """
    return db.query(Event).filter(Event.id == event_id).first()


def get_events(
    db: Session,
    organization_id: UUID,
    skip: int = 0,
    limit: int = 100,
    device_id: Optional[UUID] = None,
    pipeline_id: Optional[UUID] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    acknowledged: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[Event]:
    """
    Lista eventos com filtros opcionais.
    """
    # Base query with organization filter through device relationship
    query = db.query(Event).join(Event.device).filter(
        Device.organization_id == organization_id
    )
    
    if device_id:
        query = query.filter(Event.device_id == device_id)
    
    if pipeline_id:
        query = query.filter(Event.pipeline_id == pipeline_id)
    
    if event_type:
        query = query.filter(Event.event_type == event_type)
    
    if severity:
        query = query.filter(Event.severity == severity)
    
    if acknowledged:
        query = query.filter(Event.acknowledged == acknowledged)
    
    if start_date:
        query = query.filter(Event.timestamp >= start_date)
    
    if end_date:
        query = query.filter(Event.timestamp <= end_date)
    
    return query.order_by(desc(Event.timestamp)).offset(skip).limit(limit).all()


def create_event(db: Session, event: EventCreate) -> Event:
    """
    Cria um novo evento.
    """
    db_event = Event(
        timestamp=event.timestamp or datetime.utcnow(),
        device_id=event.device_id,
        pipeline_id=event.pipeline_id,
        event_type=event.event_type,
        severity=event.severity,
        title=event.title,
        description=event.description,
        metadata=event.metadata
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


def update_event(db: Session, event_id: UUID, event: EventUpdate) -> Optional[Event]:
    """
    Atualiza um evento (principalmente para reconhecimento).
    """
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        return None
    
    update_data = event.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_event, field, value)
    
    db.commit()
    db.refresh(db_event)
    return db_event


def acknowledge_event(db: Session, event_id: UUID, user_id: UUID) -> Optional[Event]:
    """
    Marca um evento como reconhecido por um usuário.
    """
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        return None
    
    db_event.acknowledged = "Y"
    db_event.acknowledged_by = user_id
    db_event.acknowledged_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_event)
    return db_event


def get_recent_events(db: Session, organization_id: UUID, hours: int = 24, limit: int = 10) -> List[Event]:
    """
    Busca eventos recentes de uma organização.
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    
    return db.query(Event).join(Event.device).filter(
        and_(
            Device.organization_id == organization_id,
            Event.timestamp >= since
        )
    ).order_by(desc(Event.timestamp)).limit(limit).all()


# Detection CRUD operations
def get_detection(db: Session, detection_id: UUID) -> Optional[Detection]:
    """
    Busca uma detecção por ID.
    """
    return db.query(Detection).filter(Detection.id == detection_id).first()


def get_detections(
    db: Session,
    organization_id: UUID,
    skip: int = 0,
    limit: int = 100,
    device_id: Optional[UUID] = None,
    class_name: Optional[str] = None,
    min_confidence: Optional[float] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[Detection]:
    """
    Lista detecções com filtros opcionais.
    """
    # Base query with organization filter through device relationship
    query = db.query(Detection).join(Detection.device).filter(
        Device.organization_id == organization_id
    )
    
    if device_id:
        query = query.filter(Detection.device_id == device_id)
    
    if class_name:
        query = query.filter(Detection.class_name == class_name)
    
    if min_confidence:
        query = query.filter(Detection.confidence >= min_confidence)
    
    if start_date:
        query = query.filter(Detection.timestamp >= start_date)
    
    if end_date:
        query = query.filter(Detection.timestamp <= end_date)
    
    return query.order_by(desc(Detection.timestamp)).offset(skip).limit(limit).all()


def create_detection(db: Session, detection: DetectionCreate) -> Detection:
    """
    Cria uma nova detecção.
    """
    db_detection = Detection(
        timestamp=detection.timestamp or datetime.utcnow(),
        device_id=detection.device_id,
        track_id=detection.track_id,
        class_name=detection.class_name,
        confidence=detection.confidence,
        bounding_box=detection.bounding_box,
        frame_number=detection.frame_number,
        additional_data=detection.additional_data
    )
    db.add(db_detection)
    db.commit()
    db.refresh(db_detection)
    return db_detection


def bulk_create_detections(db: Session, detections: List[DetectionCreate]) -> List[Detection]:
    """
    Cria múltiplas detecções em lote para melhor performance.
    """
    db_detections = []
    for detection in detections:
        db_detection = Detection(
            timestamp=detection.timestamp or datetime.utcnow(),
            device_id=detection.device_id,
            track_id=detection.track_id,
            class_name=detection.class_name,
            confidence=detection.confidence,
            bounding_box=detection.bounding_box,
            frame_number=detection.frame_number,
            additional_data=detection.additional_data
        )
        db_detections.append(db_detection)
    
    db.add_all(db_detections)
    db.commit()
    return db_detections


# Analytics functions
def get_events_analytics(
    db: Session,
    organization_id: UUID,
    start_date: datetime,
    end_date: datetime
) -> Dict[str, Any]:
    """
    Analisa eventos em um período específico.
    """
    # Total events
    total_events = db.query(func.count(Event.id)).join(Event.device).filter(
        and_(
            Device.organization_id == organization_id,
            Event.timestamp >= start_date,
            Event.timestamp <= end_date
        )
    ).scalar()
    
    # Events by type
    events_by_type = dict(
        db.query(Event.event_type, func.count(Event.id))
        .join(Event.device)
        .filter(
            and_(
                Device.organization_id == organization_id,
                Event.timestamp >= start_date,
                Event.timestamp <= end_date
            )
        )
        .group_by(Event.event_type)
        .all()
    )
    
    # Events by severity
    events_by_severity = dict(
        db.query(Event.severity, func.count(Event.id))
        .join(Event.device)
        .filter(
            and_(
                Device.organization_id == organization_id,
                Event.timestamp >= start_date,
                Event.timestamp <= end_date
            )
        )
        .group_by(Event.severity)
        .all()
    )
    
    return {
        "total_events": total_events,
        "events_by_type": events_by_type,
        "events_by_severity": events_by_severity
    }


def get_detections_analytics(
    db: Session,
    organization_id: UUID,
    start_date: datetime,
    end_date: datetime
) -> Dict[str, Any]:
    """
    Analisa detecções em um período específico.
    """
    # Total detections
    total_detections = db.query(func.count(Detection.id)).join(Detection.device).filter(
        and_(
            Device.organization_id == organization_id,
            Detection.timestamp >= start_date,
            Detection.timestamp <= end_date
        )
    ).scalar()
    
    # Detections by class
    detections_by_class = dict(
        db.query(Detection.class_name, func.count(Detection.id))
        .join(Detection.device)
        .filter(
            and_(
                Device.organization_id == organization_id,
                Detection.timestamp >= start_date,
                Detection.timestamp <= end_date
            )
        )
        .group_by(Detection.class_name)
        .all()
    )
    
    # Average confidence
    avg_confidence = db.query(func.avg(Detection.confidence)).join(Detection.device).filter(
        and_(
            Device.organization_id == organization_id,
            Detection.timestamp >= start_date,
            Detection.timestamp <= end_date
        )
    ).scalar() or 0.0
    
    return {
        "total_detections": total_detections,
        "detections_by_class": detections_by_class,
        "average_confidence": float(avg_confidence)
    }
