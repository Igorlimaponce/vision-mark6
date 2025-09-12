# Endpoints da API para Sistema de Integração AIOS v2.0

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from typing import Dict, List, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import logging

from ..services.integration_engine import (
    integration_engine,
    AIOSEvent,
    IntegrationConfig,
    emit_aios_event,
    emit_detection,
    get_integration_status
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/integration", tags=["integration"])

# Modelos Pydantic para requisições/respostas

class EventEmissionRequest(BaseModel):
    """Requisição para emitir evento"""
    event_type: str = Field(..., description="Tipo do evento")
    source: str = Field(..., description="Fonte do evento")
    severity: str = Field(..., description="Severidade: low, medium, high, critical")
    data: Dict[str, Any] = Field(default_factory=dict, description="Dados do evento")

class DetectionEmissionRequest(BaseModel):
    """Requisição para emitir detecção de IA"""
    camera_id: str = Field(..., description="ID da câmera")
    class_name: str = Field(..., description="Classe detectada")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confiança da detecção")
    bbox: List[float] = Field(..., description="Bounding box [x, y, w, h]")
    additional_data: Dict[str, Any] = Field(default_factory=dict, description="Dados adicionais")

class PLCActionRequest(BaseModel):
    """Requisição para ação PLC"""
    action_id: str = Field(..., description="ID da ação PLC")
    context: Dict[str, Any] = Field(default_factory=dict, description="Contexto da ação")

class WhatsAppMessageRequest(BaseModel):
    """Requisição para mensagem WhatsApp"""
    phone: str = Field(..., description="Número do telefone")
    template_name: str = Field(..., description="Nome do template")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Parâmetros da mensagem")

class KanbanTaskRequest(BaseModel):
    """Requisição para criar task no Kanban"""
    provider: str = Field(..., description="Provedor: trello, asana, monday, jira")
    title: str = Field(..., description="Título da task")
    description: str = Field(default="", description="Descrição da task")
    priority: str = Field(default="medium", description="Prioridade")
    project: str = Field(default="general", description="Projeto")
    labels: List[str] = Field(default_factory=list, description="Labels/tags")

class IntegrationConfigRequest(BaseModel):
    """Requisição para configurar integração"""
    enable_whatsapp: bool = True
    enable_kanban: bool = True
    enable_plc: bool = True
    enable_streaming: bool = True
    event_action_mapping: Optional[Dict[str, List[str]]] = None
    notification_thresholds: Optional[Dict[str, str]] = None

# Endpoints principais

@router.get("/status")
async def get_integration_system_status():
    """Obter status completo do sistema de integração"""
    try:
        status = get_integration_status()
        return JSONResponse(content=status)
    except Exception as e:
        logger.error(f"Error getting integration status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/history")
async def get_event_history(limit: int = 100):
    """Obter histórico de eventos"""
    try:
        history = integration_engine.get_event_history(limit)
        return JSONResponse(content={
            "events": history,
            "total": len(history),
            "limit": limit
        })
    except Exception as e:
        logger.error(f"Error getting event history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/events/emit")
async def emit_event(request: EventEmissionRequest, background_tasks: BackgroundTasks):
    """Emitir evento no sistema AIOS"""
    try:
        event = AIOSEvent(
            id=f"api_{int(datetime.now().timestamp())}",
            type=request.event_type,
            source=request.source,
            severity=request.severity,
            timestamp=datetime.now(),
            data=request.data
        )
        
        background_tasks.add_task(emit_aios_event, event)
        
        return JSONResponse(content={
            "success": True,
            "message": "Event emitted successfully",
            "event_id": event.id
        })
    except Exception as e:
        logger.error(f"Error emitting event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detection/emit")
async def emit_detection_event(request: DetectionEmissionRequest, background_tasks: BackgroundTasks):
    """Emitir evento de detecção de IA"""
    try:
        detection_data = {
            "camera_id": request.camera_id,
            "class": request.class_name,
            "confidence": request.confidence,
            "bbox": request.bbox,
            **request.additional_data
        }
        
        background_tasks.add_task(emit_detection, detection_data)
        
        return JSONResponse(content={
            "success": True,
            "message": "Detection event emitted successfully"
        })
    except Exception as e:
        logger.error(f"Error emitting detection event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoints PLC

@router.get("/plc/status")
async def get_plc_status():
    """Obter status do sistema PLC"""
    try:
        if not integration_engine.plc_service:
            raise HTTPException(status_code=503, detail="PLC service not available")
        
        stats = integration_engine.plc_service.get_system_stats()
        return JSONResponse(content=stats)
    except Exception as e:
        logger.error(f"Error getting PLC status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/plc/devices")
async def get_plc_devices():
    """Listar dispositivos PLC"""
    try:
        if not integration_engine.plc_service:
            raise HTTPException(status_code=503, detail="PLC service not available")
        
        devices = []
        for device_id in integration_engine.plc_service.devices:
            device_status = integration_engine.plc_service.get_device_status(device_id)
            devices.append(device_status)
        
        return JSONResponse(content={"devices": devices})
    except Exception as e:
        logger.error(f"Error getting PLC devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/plc/tags/{tag_name}")
async def get_plc_tag_value(tag_name: str):
    """Obter valor atual de um tag PLC"""
    try:
        if not integration_engine.plc_service:
            raise HTTPException(status_code=503, detail="PLC service not available")
        
        value = integration_engine.plc_service.get_tag_value(tag_name)
        timestamp = integration_engine.plc_service.get_tag_timestamp(tag_name)
        
        if value is None:
            raise HTTPException(status_code=404, detail="Tag not found or no data")
        
        return JSONResponse(content={
            "tag_name": tag_name,
            "value": value,
            "timestamp": timestamp.isoformat() if timestamp else None
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting PLC tag value: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/plc/tags/{tag_name}/write")
async def write_plc_tag(tag_name: str, value: Any, device_id: str):
    """Escrever valor em tag PLC"""
    try:
        if not integration_engine.plc_service:
            raise HTTPException(status_code=503, detail="PLC service not available")
        
        success = await integration_engine.plc_service.write_tag(device_id, tag_name, value)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to write tag value")
        
        return JSONResponse(content={
            "success": True,
            "message": f"Tag {tag_name} written successfully",
            "value": value
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error writing PLC tag: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/plc/actions/execute")
async def execute_plc_action(request: PLCActionRequest, background_tasks: BackgroundTasks):
    """Executar ação PLC"""
    try:
        if not integration_engine.plc_service:
            raise HTTPException(status_code=503, detail="PLC service not available")
        
        background_tasks.add_task(
            integration_engine.plc_service.execute_action,
            request.action_id,
            request.context
        )
        
        return JSONResponse(content={
            "success": True,
            "message": f"PLC action {request.action_id} queued for execution"
        })
    except Exception as e:
        logger.error(f"Error executing PLC action: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/plc/alarms/history")
async def get_plc_alarm_history(limit: int = 100):
    """Obter histórico de alarmes PLC"""
    try:
        if not integration_engine.plc_service:
            raise HTTPException(status_code=503, detail="PLC service not available")
        
        history = integration_engine.plc_service.get_alarm_history(limit)
        return JSONResponse(content={
            "alarms": history,
            "total": len(history),
            "limit": limit
        })
    except Exception as e:
        logger.error(f"Error getting PLC alarm history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoints WhatsApp

@router.get("/whatsapp/status")
async def get_whatsapp_status():
    """Obter status do serviço WhatsApp"""
    try:
        if not integration_engine.whatsapp_service:
            raise HTTPException(status_code=503, detail="WhatsApp service not available")
        
        stats = integration_engine.whatsapp_service.get_service_stats()
        return JSONResponse(content=stats)
    except Exception as e:
        logger.error(f"Error getting WhatsApp status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/whatsapp/send")
async def send_whatsapp_message(request: WhatsAppMessageRequest, background_tasks: BackgroundTasks):
    """Enviar mensagem WhatsApp"""
    try:
        if not integration_engine.whatsapp_service:
            raise HTTPException(status_code=503, detail="WhatsApp service not available")
        
        background_tasks.add_task(
            integration_engine.whatsapp_service.send_template_message,
            request.phone,
            request.template_name,
            request.parameters
        )
        
        return JSONResponse(content={
            "success": True,
            "message": "WhatsApp message queued for sending"
        })
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/whatsapp/contacts")
async def get_whatsapp_contacts():
    """Listar contatos WhatsApp"""
    try:
        if not integration_engine.whatsapp_service:
            raise HTTPException(status_code=503, detail="WhatsApp service not available")
        
        contacts = integration_engine.whatsapp_service.get_contacts()
        return JSONResponse(content={"contacts": contacts})
    except Exception as e:
        logger.error(f"Error getting WhatsApp contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/whatsapp/templates")
async def get_whatsapp_templates():
    """Listar templates WhatsApp"""
    try:
        if not integration_engine.whatsapp_service:
            raise HTTPException(status_code=503, detail="WhatsApp service not available")
        
        templates = integration_engine.whatsapp_service.get_message_templates()
        return JSONResponse(content={"templates": templates})
    except Exception as e:
        logger.error(f"Error getting WhatsApp templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoints Kanban

@router.get("/kanban/status")
async def get_kanban_status():
    """Obter status do serviço Kanban"""
    try:
        if not integration_engine.kanban_service:
            raise HTTPException(status_code=503, detail="Kanban service not available")
        
        stats = integration_engine.kanban_service.get_service_stats()
        return JSONResponse(content=stats)
    except Exception as e:
        logger.error(f"Error getting Kanban status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/kanban/task/create")
async def create_kanban_task(request: KanbanTaskRequest, background_tasks: BackgroundTasks):
    """Criar task no Kanban"""
    try:
        if not integration_engine.kanban_service:
            raise HTTPException(status_code=503, detail="Kanban service not available")
        
        task_data = {
            "title": request.title,
            "description": request.description,
            "priority": request.priority,
            "project": request.project,
            "labels": request.labels
        }
        
        background_tasks.add_task(
            integration_engine.kanban_service.create_task_from_alert,
            f"api_{int(datetime.now().timestamp())}",
            task_data,
            request.provider
        )
        
        return JSONResponse(content={
            "success": True,
            "message": f"Kanban task queued for creation on {request.provider}"
        })
    except Exception as e:
        logger.error(f"Error creating Kanban task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/kanban/providers")
async def get_kanban_providers():
    """Listar provedores Kanban disponíveis"""
    try:
        if not integration_engine.kanban_service:
            raise HTTPException(status_code=503, detail="Kanban service not available")
        
        providers = ["trello", "asana", "monday", "jira"]
        return JSONResponse(content={"providers": providers})
    except Exception as e:
        logger.error(f"Error getting Kanban providers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoints de configuração

@router.post("/config/update")
async def update_integration_config(request: IntegrationConfigRequest):
    """Atualizar configuração da integração"""
    try:
        new_config = IntegrationConfig(
            enable_whatsapp=request.enable_whatsapp,
            enable_kanban=request.enable_kanban,
            enable_plc=request.enable_plc,
            enable_streaming=request.enable_streaming,
            event_action_mapping=request.event_action_mapping,
            notification_thresholds=request.notification_thresholds
        )
        
        integration_engine.config = new_config
        
        return JSONResponse(content={
            "success": True,
            "message": "Integration configuration updated successfully"
        })
    except Exception as e:
        logger.error(f"Error updating integration config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_integration_config():
    """Obter configuração atual da integração"""
    try:
        config_dict = {
            "enable_whatsapp": integration_engine.config.enable_whatsapp,
            "enable_kanban": integration_engine.config.enable_kanban,
            "enable_plc": integration_engine.config.enable_plc,
            "enable_streaming": integration_engine.config.enable_streaming,
            "event_action_mapping": integration_engine.config.event_action_mapping,
            "notification_thresholds": integration_engine.config.notification_thresholds
        }
        
        return JSONResponse(content=config_dict)
    except Exception as e:
        logger.error(f"Error getting integration config: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoints de teste

@router.post("/test/integration")
async def test_integration():
    """Executar teste completo de integração"""
    try:
        test_results = await integration_engine.test_integration()
        return JSONResponse(content=test_results)
    except Exception as e:
        logger.error(f"Error running integration test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test/event")
async def test_event_emission():
    """Testar emissão de evento"""
    try:
        test_event = AIOSEvent(
            id=f"test_api_{int(datetime.now().timestamp())}",
            type="test_event",
            source="api_test",
            severity="low",
            timestamp=datetime.now(),
            data={"test": True, "origin": "api_endpoint"}
        )
        
        await emit_aios_event(test_event)
        
        return JSONResponse(content={
            "success": True,
            "message": "Test event emitted successfully",
            "event_id": test_event.id
        })
    except Exception as e:
        logger.error(f"Error testing event emission: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Endpoints de métricas

@router.get("/metrics")
async def get_integration_metrics():
    """Obter métricas detalhadas do sistema"""
    try:
        status = get_integration_status()
        
        metrics = {
            "system_metrics": {
                "uptime_seconds": status.get("uptime_seconds", 0),
                "events_processed": status.get("statistics", {}).get("events_processed", 0),
                "events_failed": status.get("statistics", {}).get("events_failed", 0),
                "notifications_sent": status.get("statistics", {}).get("notifications_sent", 0),
                "plc_actions_executed": status.get("statistics", {}).get("plc_actions_executed", 0)
            },
            "service_availability": status.get("services", {}),
            "queue_size": status.get("events_in_queue", 0),
            "success_rate": 0
        }
        
        # Calcular taxa de sucesso
        total_events = metrics["system_metrics"]["events_processed"] + metrics["system_metrics"]["events_failed"]
        if total_events > 0:
            metrics["success_rate"] = (metrics["system_metrics"]["events_processed"] / total_events) * 100
        
        return JSONResponse(content=metrics)
    except Exception as e:
        logger.error(f"Error getting integration metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
