from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session
import json

from app.api.ws.manager import connection_manager
from app.api.v1.deps import get_current_user  # We'll need to adapt this for WebSocket
from app.core.security import verify_token
from app.crud.crud_user import get_user_by_email
from app.db.session import get_db


async def get_current_websocket_user(websocket: WebSocket, token: str, db: Session):
    """
    Get current user from WebSocket token for authentication.
    """
    try:
        username = verify_token(token)
        if username is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
        
        user = get_user_by_email(db, email=username)
        if user is None or user.is_active != "Y":
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
        
        return user
    except Exception as e:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return None


async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    """
    WebSocket endpoint for real-time updates.
    Usage: ws://localhost:8000/api/v1/ws?token=your_jwt_token
    """
    # Authenticate user
    user = await get_current_websocket_user(websocket, token, db)
    if not user:
        return
    
    # Connect to WebSocket manager
    user_info = {
        "user_id": str(user.id),
        "email": user.email,
        "role": user.role
    }
    
    await connection_manager.connect(websocket, str(user.organization_id), user_info)
    
    try:
        # Send welcome message
        welcome_message = {
            "type": "connection_established",
            "message": f"Welcome {user.email}! You are connected to real-time updates.",
            "organization_id": str(user.organization_id),
            "user_role": user.role
        }
        await connection_manager.send_personal_message(json.dumps(welcome_message), websocket)
        
        # Listen for messages from client
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get("type")
                
                # Handle different message types
                if message_type == "ping":
                    # Respond to ping
                    pong_response = {
                        "type": "pong",
                        "timestamp": message.get("timestamp")
                    }
                    await connection_manager.send_personal_message(json.dumps(pong_response), websocket)
                
                elif message_type == "subscribe_to_device":
                    # Client wants to subscribe to specific device updates
                    device_id = message.get("device_id")
                    # TODO: Verify user has access to this device
                    # For now, just acknowledge
                    response = {
                        "type": "subscription_confirmed",
                        "device_id": device_id,
                        "message": f"Subscribed to device {device_id} updates"
                    }
                    await connection_manager.send_personal_message(json.dumps(response), websocket)
                
                elif message_type == "subscribe_to_pipeline":
                    # Client wants to subscribe to specific pipeline updates
                    pipeline_id = message.get("pipeline_id")
                    # TODO: Verify user has access to this pipeline
                    response = {
                        "type": "subscription_confirmed",
                        "pipeline_id": pipeline_id,
                        "message": f"Subscribed to pipeline {pipeline_id} updates"
                    }
                    await connection_manager.send_personal_message(json.dumps(response), websocket)
                
                else:
                    # Unknown message type
                    error_response = {
                        "type": "error",
                        "message": f"Unknown message type: {message_type}"
                    }
                    await connection_manager.send_personal_message(json.dumps(error_response), websocket)
                    
            except json.JSONDecodeError:
                # Invalid JSON
                error_response = {
                    "type": "error",
                    "message": "Invalid JSON format"
                }
                await connection_manager.send_personal_message(json.dumps(error_response), websocket)
            
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        connection_manager.disconnect(websocket)
