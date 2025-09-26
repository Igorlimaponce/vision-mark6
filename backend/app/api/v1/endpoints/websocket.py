from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_service import manager
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = None
):
    """
    WebSocket endpoint para receber atualizações em tempo real.
    
    O token JWT deve ser enviado como query parameter: /ws?token=<jwt_token>
    
    Tipos de mensagens enviadas:
    - initial_state: Estado inicial do sistema
    - device_status_change: Mudança de status de dispositivo
    - new_event: Novo evento/alerta
    - pipeline_status_change: Mudança de status de pipeline
    - system_metrics: Métricas do sistema atualizadas
    """
    
    if not token:
        await websocket.close(code=4001, reason="Token required")
        return
    
    try:
        # Validar token JWT (simulado por enquanto)
        # TODO: Implementar validação real do token
        user_id = "admin@aios.com"  # Mock user
        
        await manager.connect(websocket, user_id)
        
        try:
            while True:
                # Aguardar mensagens do cliente (heartbeat, etc.)
                data = await websocket.receive_text()
                
                # Processar mensagens do cliente se necessário
                if data == "ping":
                    await websocket.send_text("pong")
                    
        except WebSocketDisconnect:
            manager.disconnect(websocket)
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=4000, reason="Internal error")


@router.get("/test-notification")
async def test_notification():
    """Endpoint para testar notificações WebSocket"""
    
    # Simular notificação de novo evento
    await manager.broadcast({
        "type": "new_event",
        "data": {
            "id": "test-event-123",
            "title": "Teste de Notificação",
            "severity": "medium",
            "message": "Esta é uma notificação de teste via WebSocket",
            "timestamp": asyncio.get_event_loop().time()
        }
    })
    
    return {"message": "Notificação de teste enviada"}


@router.get("/stats")
async def websocket_stats():
    """Estatísticas das conexões WebSocket"""
    return {
        "active_connections": len(manager.connection_user_map),
        "users_connected": len(manager.active_connections),
        "connections_by_user": {
            user_id: len(connections) 
            for user_id, connections in manager.active_connections.items()
        }
    }