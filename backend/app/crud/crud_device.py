from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from app.db.models.device import Device
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceStatusUpdate, FleetSummary


def get_device(db: Session, device_id: UUID) -> Optional[Device]:
    """
    Busca um dispositivo por ID.
    """
    return db.query(Device).filter(Device.id == device_id).first()


def get_device_by_name(db: Session, name: str, organization_id: UUID) -> Optional[Device]:
    """
    Busca um dispositivo por nome dentro de uma organização.
    """
    return db.query(Device).filter(
        and_(Device.name == name, Device.organization_id == organization_id)
    ).first()


def get_devices(
    db: Session, 
    organization_id: UUID,
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None
) -> List[Device]:
    """
    Lista dispositivos de uma organização com filtros opcionais.
    """
    query = db.query(Device).filter(Device.organization_id == organization_id)
    
    if search:
        search_filter = or_(
            Device.name.ilike(f"%{search}%"),
            Device.location.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if status:
        query = query.filter(Device.status == status)
    
    return query.order_by(desc(Device.last_seen), Device.name).offset(skip).limit(limit).all()


def create_device(db: Session, device: DeviceCreate) -> Device:
    """
    Cria um novo dispositivo.
    """
    db_device = Device(
        name=device.name,
        device_type=device.device_type,
        rtsp_url=device.rtsp_url,
        location=device.location,
        device_metadata=device.metadata,
        organization_id=device.organization_id,
        status="OFF"  # Default status
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device


def update_device(db: Session, device_id: UUID, device: DeviceUpdate) -> Optional[Device]:
    """
    Atualiza um dispositivo existente.
    """
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if not db_device:
        return None
    
    update_data = device.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_device, field, value)
    
    db.commit()
    db.refresh(db_device)
    return db_device


def update_device_status(db: Session, status_update: DeviceStatusUpdate) -> Optional[Device]:
    """
    Atualiza o status de um dispositivo.
    """
    db_device = db.query(Device).filter(Device.id == status_update.device_id).first()
    if not db_device:
        return None
    
    db_device.status = status_update.status
    if status_update.last_seen:
        db_device.last_seen = status_update.last_seen
    else:
        db_device.last_seen = datetime.utcnow()
    
    if status_update.metadata:
        if db_device.device_metadata:
            db_device.device_metadata.update(status_update.metadata)
        else:
            db_device.device_metadata = status_update.metadata
    
    db.commit()
    db.refresh(db_device)
    return db_device


def delete_device(db: Session, device_id: UUID) -> bool:
    """
    Remove um dispositivo.
    """
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if not db_device:
        return False
    
    db.delete(db_device)
    db.commit()
    return True


def get_fleet_summary(db: Session, organization_id: UUID) -> FleetSummary:
    """
    Obtém resumo da frota de dispositivos.
    """
    total_query = db.query(func.count(Device.id)).filter(Device.organization_id == organization_id)
    total_devices = total_query.scalar()
    
    online_devices = total_query.filter(Device.status == "ON").scalar()
    offline_devices = total_query.filter(Device.status == "OFF").scalar()
    warning_devices = total_query.filter(Device.status == "WARNING").scalar()
    
    return FleetSummary(
        total_devices=total_devices,
        online_devices=online_devices,
        offline_devices=offline_devices,
        warning_devices=warning_devices,
        last_updated=datetime.utcnow()
    )


def count_devices_by_organization(db: Session, organization_id: UUID) -> int:
    """
    Conta o número de dispositivos em uma organização.
    """
    return db.query(func.count(Device.id)).filter(Device.organization_id == organization_id).scalar()


def get_devices_by_status(db: Session, organization_id: UUID, status: str) -> List[Device]:
    """
    Busca dispositivos por status específico.
    """
    return db.query(Device).filter(
        and_(Device.organization_id == organization_id, Device.status == status)
    ).all()


def mark_device_offline_if_stale(db: Session, minutes_threshold: int = 5) -> int:
    """
    Marca dispositivos como offline se não enviaram sinal há X minutos.
    Retorna o número de dispositivos atualizados.
    """
    threshold_time = datetime.utcnow() - timedelta(minutes=minutes_threshold)
    
    stale_devices = db.query(Device).filter(
        and_(
            Device.last_seen < threshold_time,
            Device.status.in_(["ON", "WARNING"])
        )
    )
    
    count = stale_devices.count()
    stale_devices.update({"status": "OFF"}, synchronize_session=False)
    db.commit()
    
    return count
