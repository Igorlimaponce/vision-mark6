from typing import Any, Dict, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.v1.deps import get_current_active_user
from app.db.session import get_db
from app.db.models.device import Device
from app.db.models.user import User

router = APIRouter()


@router.get("/metrics")
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Get general dashboard metrics
    """
    # Count devices by status
    devices_query = db.query(Device).filter(
        Device.organization_id == current_user.organization_id
    )
    
    total_devices = devices_query.count()
    online_devices = devices_query.filter(Device.status == "online").count()
    offline_devices = devices_query.filter(Device.status == "offline").count()
    warning_devices = devices_query.filter(Device.status == "warning").count()
    
    return {
        "devices": {
            "total": total_devices,
            "online": online_devices,
            "offline": offline_devices,
            "warning": warning_devices
        },
        "events": {
            "last_24h": 12  # Mock data for now
        },
        "system": {
            "uptime_hours": 24.5,
            "active_pipelines": 2,
            "cpu_usage": 45.2,
            "memory_usage": 68.1
        }
    }


@router.get("/devices-status")
def get_devices_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Get devices status breakdown for charts
    """
    # Get device status counts
    status_counts = db.query(
        Device.status,
        func.count(Device.id).label('count')
    ).filter(
        Device.organization_id == current_user.organization_id
    ).group_by(Device.status).all()
    
    # Convert to dictionary
    status_data = {status: count for status, count in status_counts}
    
    # Ensure all statuses are present with 0 if not found
    result = {
        "online": status_data.get("online", 0),
        "offline": status_data.get("offline", 0),
        "warning": status_data.get("warning", 0)
    }
    
    return {
        "data": result,
        "total": sum(result.values())
    }


@router.get("/recent-events")
def get_recent_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[Dict[str, Any]]:
    """
    Get recent events for timeline (mock data for now)
    """
    return [
        {
            "id": "1",
            "type": "detection",
            "severity": "medium",
            "message": "Pessoa detectada na zona restrita",
            "device_name": "Camera Portaria",
            "created_at": "2025-09-26T10:30:00Z",
            "status": "pending"
        },
        {
            "id": "2",
            "type": "system",
            "severity": "low",
            "message": "Device reconnected successfully",
            "device_name": "Sensor Estacionamento",
            "created_at": "2025-09-26T09:15:00Z",
            "status": "acknowledged"
        },
        {
            "id": "3",
            "type": "alert",
            "severity": "high",
            "message": "Movimento suspeito detectado",
            "device_name": "Camera Doca",
            "created_at": "2025-09-26T08:45:00Z",
            "status": "pending"
        }
    ]


@router.get("/pipeline-stats")  
def get_pipeline_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Get pipeline execution statistics (mock data for now)
    """
    return {
        "total_pipelines": 5,
        "active_pipelines": 2,
        "paused_pipelines": 1, 
        "failed_pipelines": 0,
        "executions_today": 148,
        "avg_execution_time": 2.3,
        "success_rate": 98.7,
        "last_24h_executions": [
            {"hour": "06:00", "count": 12},
            {"hour": "07:00", "count": 15},
            {"hour": "08:00", "count": 18},
            {"hour": "09:00", "count": 22},
            {"hour": "10:00", "count": 20},
            {"hour": "11:00", "count": 19}
        ]
    }


@router.get("/performance")
def get_performance_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Get system performance metrics (mock data for now)
    """
    return {
        "cpu": {
            "current": 45.2,
            "avg_24h": 42.1,
            "max_24h": 78.3
        },
        "memory": {
            "current": 68.1,
            "avg_24h": 65.4,
            "max_24h": 89.2
        },
        "network": {
            "bytes_in": 1024 * 1024 * 150,  # 150MB
            "bytes_out": 1024 * 1024 * 89,  # 89MB
            "packets_in": 125000,
            "packets_out": 98000
        },
        "storage": {
            "total_gb": 500,
            "used_gb": 187,
            "free_gb": 313,
            "usage_percent": 37.4
        }
    }