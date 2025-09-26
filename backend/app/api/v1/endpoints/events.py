# API client para Eventos e Alertas conectado ao backend real

from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.api.v1.deps import get_current_active_user
from app.db.session import get_db
from app.db.models.user import User

router = APIRouter()

# Mock data for events (seria substituído por modelo real do banco)
MOCK_EVENTS = [
    {
        "id": "evt_001",
        "type": "detection",
        "severity": "high",
        "title": "Movimento suspeito detectado",
        "description": "Pessoa detectada na zona restrita durante horário não autorizado",
        "device_id": "550e8400-e29b-41d4-a716-446655440010",
        "device_name": "Camera Portaria Principal",
        "location": "Portaria",
        "created_at": datetime.utcnow() - timedelta(minutes=5),
        "acknowledged": False,
        "acknowledged_by": None,
        "acknowledged_at": None,
        "metadata": {
            "confidence": 0.95,
            "zone": "entrance_gate",
            "coordinates": [120, 150, 80, 120]
        }
    },
    {
        "id": "evt_002", 
        "type": "system",
        "severity": "medium",
        "title": "Dispositivo reconectado",
        "description": "Camera Estacionamento reconectou após interrupção",
        "device_id": "550e8400-e29b-41d4-a716-446655440011",
        "device_name": "Camera Estacionamento",
        "location": "Estacionamento",
        "created_at": datetime.utcnow() - timedelta(minutes=15),
        "acknowledged": True,
        "acknowledged_by": "admin@aios.com",
        "acknowledged_at": datetime.utcnow() - timedelta(minutes=10),
        "metadata": {
            "downtime_duration": "00:02:30",
            "reason": "network_interruption"
        }
    },
    {
        "id": "evt_003",
        "type": "alert",
        "severity": "high", 
        "title": "Zona de segurança violada",
        "description": "Veículo não autorizado detectado na área restrita",
        "device_id": "550e8400-e29b-41d4-a716-446655440012",
        "device_name": "Camera Doca 1",
        "location": "Doca",
        "created_at": datetime.utcnow() - timedelta(hours=1),
        "acknowledged": False,
        "acknowledged_by": None,
        "acknowledged_at": None,
        "metadata": {
            "vehicle_type": "truck",
            "license_plate": "ABC-1234",
            "confidence": 0.87
        }
    },
    {
        "id": "evt_004",
        "type": "maintenance",
        "severity": "low",
        "title": "Limpeza de lente programada",
        "description": "Manutenção preventiva agendada para Camera Armazém",
        "device_id": "550e8400-e29b-41d4-a716-446655440013",
        "device_name": "Sensor Temperatura Armazém",
        "location": "Armazém",
        "created_at": datetime.utcnow() - timedelta(hours=2),
        "acknowledged": True,
        "acknowledged_by": "operator@aios.com",
        "acknowledged_at": datetime.utcnow() - timedelta(hours=1, minutes=30),
        "metadata": {
            "maintenance_type": "preventive",
            "estimated_duration": "00:30:00"
        }
    }
]


@router.get("/")
def get_events(
    db: Session = Depends(get_db),
    skip: int = Query(0, description="Número de eventos para pular"),
    limit: int = Query(50, description="Número máximo de eventos para retornar"), 
    event_type: Optional[str] = Query(None, description="Filtrar por tipo de evento"),
    severity: Optional[str] = Query(None, description="Filtrar por severidade"),
    acknowledged: Optional[bool] = Query(None, description="Filtrar por status de reconhecimento"),
    device_id: Optional[str] = Query(None, description="Filtrar por ID do dispositivo"),
    start_date: Optional[datetime] = Query(None, description="Data inicial"),
    end_date: Optional[datetime] = Query(None, description="Data final"),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Listar eventos e alertas com filtros opcionais.
    """
    # Filtrar eventos mock (seria substituído por query no banco)
    filtered_events = MOCK_EVENTS.copy()
    
    if event_type:
        filtered_events = [e for e in filtered_events if e["type"] == event_type]
    
    if severity:
        filtered_events = [e for e in filtered_events if e["severity"] == severity]
    
    if acknowledged is not None:
        filtered_events = [e for e in filtered_events if e["acknowledged"] == acknowledged]
        
    if device_id:
        filtered_events = [e for e in filtered_events if e["device_id"] == device_id]
    
    # Aplicar paginação
    total = len(filtered_events)
    paginated_events = filtered_events[skip:skip + limit]
    
    # Converter datetime para ISO string (se necessário)
    for event in paginated_events:
        if hasattr(event["created_at"], 'isoformat'):
            event["created_at"] = event["created_at"].isoformat()
        if event["acknowledged_at"] and hasattr(event["acknowledged_at"], 'isoformat'):
            event["acknowledged_at"] = event["acknowledged_at"].isoformat()
    
    return {
        "events": paginated_events,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/")
def create_event(
    *,
    db: Session = Depends(get_db),
    event_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Criar um novo evento.
    """
    # Mock implementation - seria substituído por criação real no banco
    new_event = {
        "id": f"evt_{len(MOCK_EVENTS) + 1:03d}",
        "type": event_data.get("type", "system"),
        "severity": event_data.get("severity", "medium"),
        "title": event_data.get("title", "Novo evento"),
        "description": event_data.get("description", ""),
        "device_id": event_data.get("device_id"),
        "device_name": event_data.get("device_name", "Dispositivo desconhecido"),
        "location": event_data.get("location", ""),
        "created_at": datetime.utcnow().isoformat(),
        "acknowledged": False,
        "acknowledged_by": None,
        "acknowledged_at": None,
        "metadata": event_data.get("metadata", {})
    }
    
    return new_event


@router.put("/{event_id}/acknowledge")
def acknowledge_event(
    *,
    db: Session = Depends(get_db),
    event_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Marcar um evento como reconhecido.
    """
    # Encontrar evento mock
    event = next((e for e in MOCK_EVENTS if e["id"] == event_id), None)
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    # Marcar como reconhecido
    event["acknowledged"] = True
    event["acknowledged_by"] = current_user.email
    event["acknowledged_at"] = datetime.utcnow().isoformat()
    
    return event


@router.get("/summary")
def get_events_summary(
    db: Session = Depends(get_db),
    hours: int = Query(24, description="Horas para análise"),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Obter resumo de eventos das últimas X horas.
    """
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    
    recent_events = [
        e for e in MOCK_EVENTS 
        if isinstance(e["created_at"], datetime) and e["created_at"] >= cutoff_time
    ]
    
    # Contar por severidade
    severity_counts = {}
    type_counts = {}
    acknowledged_count = 0
    
    for event in recent_events:
        # Contar por severidade
        severity = event["severity"]
        severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        # Contar por tipo
        event_type = event["type"]
        type_counts[event_type] = type_counts.get(event_type, 0) + 1
        
        # Contar reconhecidos
        if event["acknowledged"]:
            acknowledged_count += 1
    
    return {
        "total_events": len(recent_events),
        "acknowledged": acknowledged_count,
        "pending": len(recent_events) - acknowledged_count,
        "by_severity": severity_counts,
        "by_type": type_counts,
        "period_hours": hours
    }


@router.get("/types")
def get_event_types(
    current_user: User = Depends(get_current_active_user),
) -> List[str]:
    """
    Obter lista de tipos de eventos disponíveis.
    """
    return ["detection", "alert", "system", "maintenance", "security", "performance"]


@router.get("/severities") 
def get_event_severities(
    current_user: User = Depends(get_current_active_user),
) -> List[str]:
    """
    Obter lista de severidades disponíveis.
    """
    return ["low", "medium", "high", "critical"]


@router.delete("/{event_id}")
def delete_event(
    *,
    db: Session = Depends(get_db),
    event_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, str]:
    """
    Deletar um evento (apenas admins).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Apenas administradores podem deletar eventos"
        )
    
    # Mock deletion
    global MOCK_EVENTS
    MOCK_EVENTS = [e for e in MOCK_EVENTS if e["id"] != event_id]
    
    return {"message": "Evento deletado com sucesso"}


@router.get("/recent")
def get_recent_events(
    db: Session = Depends(get_db),
    limit: int = Query(10, description="Número de eventos recentes"),
    current_user: User = Depends(get_current_active_user),
) -> List[Dict[str, Any]]:
    """
    Obter eventos mais recentes para widgets.
    """
    # Ordenar por data de criação (mais recentes primeiro)
    sorted_events = sorted(MOCK_EVENTS, key=lambda x: x["created_at"], reverse=True)
    recent = sorted_events[:limit]
    
    # Converter datetime para ISO string
    for event in recent:
        event = event.copy()
        event["created_at"] = event["created_at"].isoformat()
        if event["acknowledged_at"]:
            event["acknowledged_at"] = event["acknowledged_at"].isoformat()
    
    return recent