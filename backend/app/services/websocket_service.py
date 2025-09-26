from typing import Dict, List, Any
import json
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud import crud_device, crud_pipeline, crud_event
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Dicionário para armazenar conexões ativas por usuário
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Dicionário para mapear websockets para user_ids
        self.connection_user_map: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Conectar um usuário ao WebSocket"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        self.connection_user_map[websocket] = user_id
        
        logger.info(f"User {user_id} connected to WebSocket")
        
        # Enviar estado inicial
        await self.send_initial_state(websocket, user_id)

    def disconnect(self, websocket: WebSocket):
        """Desconectar um usuário do WebSocket"""
        user_id = self.connection_user_map.get(websocket)
        
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            
            # Remover lista vazia
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        if websocket in self.connection_user_map:
            del self.connection_user_map[websocket]
            
        logger.info(f"User {user_id} disconnected from WebSocket")

    async def send_personal_message(self, message: dict, user_id: str):
        """Enviar mensagem para um usuário específico"""
        if user_id in self.active_connections:
            disconnected = []
            
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    # Marcar conexão como desconectada
                    disconnected.append(connection)
            
            # Remover conexões desconectadas
            for connection in disconnected:
                self.disconnect(connection)

    async def broadcast(self, message: dict):
        """Enviar mensagem para todos os usuários conectados"""
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(message, user_id)

    async def broadcast_to_organization(self, message: dict, organization_id: str):
        """Enviar mensagem para todos os usuários de uma organização"""
        # Por simplicidade, enviamos para todos por enquanto
        # TODO: Implementar filtro por organização
        await self.broadcast(message)

    async def send_initial_state(self, websocket: WebSocket, user_id: str):
        """Enviar estado inicial do sistema para o usuário"""
        try:
            db = next(get_db())
            
            # Buscar dados iniciais (mock por enquanto)
            initial_data = {
                "type": "initial_state",
                "data": {
                    "devices_online": 3,
                    "devices_total": 4,
                    "pipelines_active": 2,
                    "events_pending": 2,
                    "timestamp": asyncio.get_event_loop().time()
                }
            }
            
            await websocket.send_text(json.dumps(initial_data))
            
        except Exception as e:
            logger.error(f"Error sending initial state: {e}")

# Instância global do gerenciador de conexões
manager = ConnectionManager()

async def notify_device_status_change(device_id: str, new_status: str, organization_id: str):
    """Notificar mudança de status de dispositivo"""
    message = {
        "type": "device_status_change",
        "data": {
            "device_id": device_id,
            "new_status": new_status,
            "timestamp": asyncio.get_event_loop().time()
        }
    }
    await manager.broadcast_to_organization(message, organization_id)

async def notify_new_event(event_data: dict, organization_id: str):
    """Notificar novo evento/alerta"""
    message = {
        "type": "new_event",
        "data": {
            **event_data,
            "timestamp": asyncio.get_event_loop().time()
        }
    }
    await manager.broadcast_to_organization(message, organization_id)

async def notify_pipeline_status_change(pipeline_id: str, new_status: str, organization_id: str):
    """Notificar mudança de status de pipeline"""
    message = {
        "type": "pipeline_status_change",
        "data": {
            "pipeline_id": pipeline_id,
            "new_status": new_status,
            "timestamp": asyncio.get_event_loop().time()
        }
    }
    await manager.broadcast_to_organization(message, organization_id)

async def notify_system_metrics(metrics: dict):
    """Notificar métricas do sistema"""
    message = {
        "type": "system_metrics",
        "data": {
            **metrics,
            "timestamp": asyncio.get_event_loop().time()
        }
    }
    await manager.broadcast(message)

# Função para simular updates periódicos
async def periodic_updates():
    """Enviar atualizações periódicas (simulação)"""
    while True:
        try:
            # Simular métricas atualizadas
            import random
            metrics = {
                "cpu_usage": round(random.uniform(30, 80), 1),
                "memory_usage": round(random.uniform(50, 90), 1),
                "active_connections": len(manager.connection_user_map),
                "devices_online": random.randint(2, 4)
            }
            
            await notify_system_metrics(metrics)
            
            # Aguardar 30 segundos antes da próxima atualização
            await asyncio.sleep(30)
            
        except Exception as e:
            logger.error(f"Error in periodic updates: {e}")
            await asyncio.sleep(30)