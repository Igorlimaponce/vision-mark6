from typing import List, Dict, Any
import json
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from app.core.config import settings


class ConnectionManager:
    """
    WebSocket connection manager para broadcast de atualizações em tempo real.
    """

    def __init__(self):
        # Dictionary to store active connections by organization_id
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Dictionary to store user info for each connection
        self.connection_users: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, organization_id: str, user_info: Dict[str, Any]):
        """
        Accept WebSocket connection and add to organization group.
        """
        await websocket.accept()
        
        if organization_id not in self.active_connections:
            self.active_connections[organization_id] = []
        
        self.active_connections[organization_id].append(websocket)
        self.connection_users[websocket] = {
            "organization_id": organization_id,
            "user_id": user_info.get("user_id"),
            "email": user_info.get("email"),
            "role": user_info.get("role")
        }
        
        print(f"WebSocket connected: user {user_info.get('email')} in organization {organization_id}")

    def disconnect(self, websocket: WebSocket):
        """
        Remove WebSocket connection.
        """
        if websocket in self.connection_users:
            user_info = self.connection_users[websocket]
            organization_id = user_info["organization_id"]
            
            if organization_id in self.active_connections:
                self.active_connections[organization_id].remove(websocket)
                
                # Clean up empty organization groups
                if not self.active_connections[organization_id]:
                    del self.active_connections[organization_id]
            
            del self.connection_users[websocket]
            print(f"WebSocket disconnected: user {user_info.get('email')}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """
        Send message to specific WebSocket connection.
        """
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")
            self.disconnect(websocket)

    async def broadcast_to_organization(self, message: Dict[str, Any], organization_id: str):
        """
        Broadcast message to all connections in an organization.
        """
        if organization_id in self.active_connections:
            message_str = json.dumps(message)
            disconnected_connections = []
            
            for connection in self.active_connections[organization_id]:
                try:
                    await connection.send_text(message_str)
                except Exception as e:
                    print(f"Error broadcasting to connection: {e}")
                    disconnected_connections.append(connection)
            
            # Clean up disconnected connections
            for connection in disconnected_connections:
                self.disconnect(connection)

    async def broadcast_device_status(self, device_id: str, status: str, organization_id: str, metadata: Dict[str, Any] = None):
        """
        Broadcast device status update to organization.
        """
        message = {
            "type": "device_status_update",
            "device_id": device_id,
            "status": status,
            "timestamp": asyncio.get_event_loop().time(),
            "metadata": metadata or {}
        }
        await self.broadcast_to_organization(message, organization_id)

    async def broadcast_new_event(self, event_data: Dict[str, Any], organization_id: str):
        """
        Broadcast new event to organization.
        """
        message = {
            "type": "new_event",
            "event": event_data,
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.broadcast_to_organization(message, organization_id)

    async def broadcast_pipeline_status(self, pipeline_id: str, status: str, organization_id: str, metadata: Dict[str, Any] = None):
        """
        Broadcast pipeline status update to organization.
        """
        message = {
            "type": "pipeline_status_update",
            "pipeline_id": pipeline_id,
            "status": status,
            "timestamp": asyncio.get_event_loop().time(),
            "metadata": metadata or {}
        }
        await self.broadcast_to_organization(message, organization_id)

    async def broadcast_detection_batch(self, detections: List[Dict[str, Any]], organization_id: str):
        """
        Broadcast batch of new detections to organization.
        """
        message = {
            "type": "detection_batch",
            "detections": detections,
            "timestamp": asyncio.get_event_loop().time(),
            "count": len(detections)
        }
        await self.broadcast_to_organization(message, organization_id)

    def get_organization_connections_count(self, organization_id: str) -> int:
        """
        Get number of active connections for an organization.
        """
        return len(self.active_connections.get(organization_id, []))

    def get_total_connections_count(self) -> int:
        """
        Get total number of active connections.
        """
        return sum(len(connections) for connections in self.active_connections.values())

    async def heartbeat(self):
        """
        Send heartbeat to all connections to keep them alive.
        """
        heartbeat_message = {
            "type": "heartbeat",
            "timestamp": asyncio.get_event_loop().time()
        }
        
        for organization_id in list(self.active_connections.keys()):
            await self.broadcast_to_organization(heartbeat_message, organization_id)


# Global connection manager instance
connection_manager = ConnectionManager()


async def start_heartbeat():
    """
    Start heartbeat task to keep WebSocket connections alive.
    """
    while True:
        await asyncio.sleep(settings.WEBSOCKET_HEARTBEAT_INTERVAL)
        await connection_manager.heartbeat()
