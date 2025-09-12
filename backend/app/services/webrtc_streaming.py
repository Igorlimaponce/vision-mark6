"""
Sistema WebRTC para streaming de vídeo em tempo real
Integração com RTSP streams do backend
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, Set, Callable
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter
import cv2
import base64
import numpy as np

from app.services.rtsp_streaming import stream_manager, StreamConfig
from app.services.websocket_manager import connection_manager

logger = logging.getLogger(__name__)

class WebRTCStreamManager:
    """
    Gerenciador de streams WebRTC para o frontend
    """
    
    def __init__(self):
        """Inicializar gerenciador WebRTC"""
        self.active_streams: Dict[str, Set[str]] = {}  # stream_id -> set of client_ids
        self.client_streams: Dict[str, Set[str]] = {}  # client_id -> set of stream_ids
        self._lock = asyncio.Lock()
        
    async def start_stream_for_client(self, client_id: str, stream_id: str, rtsp_url: str) -> bool:
        """
        Iniciar stream para cliente específico
        
        Args:
            client_id: ID do cliente WebSocket
            stream_id: ID do stream
            rtsp_url: URL RTSP
            
        Returns:
            bool: True se iniciado com sucesso
        """
        async with self._lock:
            try:
                # Verificar se stream já existe
                existing_stream = stream_manager.get_stream(stream_id)
                
                if not existing_stream:
                    # Criar novo stream
                    config = StreamConfig(
                        stream_id=stream_id,
                        rtsp_url=rtsp_url,
                        fps=15,  # FPS reduzido para WebRTC
                        buffer_size=5
                    )
                    
                    if not stream_manager.create_stream(config):
                        logger.error(f"Falha ao criar stream: {stream_id}")
                        return False
                    
                    # Adicionar callback para frames
                    stream = stream_manager.get_stream(stream_id)
                    if stream:
                        stream.add_frame_callback(self._on_frame_received)
                        stream.add_status_callback(self._on_status_change)
                
                # Iniciar stream se não estiver rodando
                if not stream_manager.start_stream(stream_id):
                    logger.error(f"Falha ao iniciar stream: {stream_id}")
                    return False
                
                # Registrar cliente para este stream
                if stream_id not in self.active_streams:
                    self.active_streams[stream_id] = set()
                self.active_streams[stream_id].add(client_id)
                
                if client_id not in self.client_streams:
                    self.client_streams[client_id] = set()
                self.client_streams[client_id].add(stream_id)
                
                logger.info(f"Stream {stream_id} iniciado para cliente {client_id}")
                return True
                
            except Exception as e:
                logger.error(f"Erro ao iniciar stream para cliente: {e}")
                return False
    
    async def stop_stream_for_client(self, client_id: str, stream_id: str) -> bool:
        """
        Parar stream para cliente específico
        
        Args:
            client_id: ID do cliente
            stream_id: ID do stream
            
        Returns:
            bool: True se parado com sucesso
        """
        async with self._lock:
            try:
                # Remover cliente do stream
                if stream_id in self.active_streams:
                    self.active_streams[stream_id].discard(client_id)
                    
                    # Se não há mais clientes, parar stream
                    if not self.active_streams[stream_id]:
                        stream_manager.stop_stream(stream_id)
                        del self.active_streams[stream_id]
                        logger.info(f"Stream {stream_id} parado (sem clientes)")
                
                # Remover stream do cliente
                if client_id in self.client_streams:
                    self.client_streams[client_id].discard(stream_id)
                    
                    if not self.client_streams[client_id]:
                        del self.client_streams[client_id]
                
                logger.info(f"Stream {stream_id} parado para cliente {client_id}")
                return True
                
            except Exception as e:
                logger.error(f"Erro ao parar stream para cliente: {e}")
                return False
    
    async def disconnect_client(self, client_id: str):
        """
        Desconectar cliente e parar todos os seus streams
        
        Args:
            client_id: ID do cliente
        """
        if client_id in self.client_streams:
            streams_to_stop = list(self.client_streams[client_id])
            for stream_id in streams_to_stop:
                await self.stop_stream_for_client(client_id, stream_id)
    
    def _on_frame_received(self, frame: np.ndarray, frame_info: Dict[str, Any]):
        """
        Callback chamado quando um novo frame é recebido
        
        Args:
            frame: Frame de vídeo
            frame_info: Informações do frame
        """
        stream_id = frame_info['stream_id']
        
        # Verificar se há clientes interessados neste stream
        if stream_id not in self.active_streams or not self.active_streams[stream_id]:
            return
        
        try:
            # Converter frame para JPEG
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            
            # Converter para base64
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Criar mensagem WebSocket
            message = {
                'type': 'video_frame',
                'data': {
                    'stream_id': stream_id,
                    'frame': frame_base64,
                    'timestamp': frame_info['timestamp'],
                    'frame_count': frame_info['frame_count'],
                    'fps': frame_info['fps']
                }
            }
            
            # Enviar para todos os clientes interessados
            clients = list(self.active_streams[stream_id])
            for client_id in clients:
                asyncio.create_task(self._send_frame_to_client(client_id, message))
                
        except Exception as e:
            logger.error(f"Erro ao processar frame para WebRTC: {e}")
    
    def _on_status_change(self, status, message: str):
        """
        Callback chamado quando status do stream muda
        
        Args:
            status: Novo status
            message: Mensagem de status
        """
        # Implementar notificação de mudança de status para clientes
        pass
    
    async def _send_frame_to_client(self, client_id: str, message: Dict[str, Any]):
        """
        Enviar frame para cliente específico
        
        Args:
            client_id: ID do cliente
            message: Mensagem com frame
        """
        try:
            await connection_manager.send_personal_message(
                json.dumps(message),
                client_id
            )
        except Exception as e:
            logger.error(f"Erro ao enviar frame para cliente {client_id}: {e}")
            # Cliente pode ter desconectado - limpar recursos
            await self.disconnect_client(client_id)
    
    def get_stream_info(self, stream_id: str) -> Optional[Dict[str, Any]]:
        """
        Obter informações sobre um stream
        
        Args:
            stream_id: ID do stream
            
        Returns:
            Informações do stream ou None
        """
        stats = stream_manager.get_all_stats().get(stream_id)
        if stats:
            stats['active_clients'] = len(self.active_streams.get(stream_id, []))
            return stats
        return None
    
    def get_all_streams_info(self) -> Dict[str, Any]:
        """
        Obter informações de todos os streams
        
        Returns:
            Dicionário com informações de todos os streams
        """
        all_stats = stream_manager.get_all_stats()
        
        # Adicionar informações de clientes
        for stream_id, stats in all_stats.items():
            stats['active_clients'] = len(self.active_streams.get(stream_id, []))
        
        return {
            'streams': all_stats,
            'total_streams': len(all_stats),
            'total_clients': sum(len(clients) for clients in self.active_streams.values())
        }

# Instância global
webrtc_manager = WebRTCStreamManager()

# Router para endpoints WebRTC
router = APIRouter(prefix="/api/v1/streaming", tags=["streaming"])

@router.websocket("/ws/{client_id}")
async def websocket_streaming_endpoint(websocket: WebSocket, client_id: str):
    """
    Endpoint WebSocket para streaming de vídeo
    
    Args:
        websocket: Conexão WebSocket
        client_id: ID único do cliente
    """
    await websocket.accept()
    logger.info(f"Cliente WebRTC conectado: {client_id}")
    
    try:
        while True:
            # Receber mensagem do cliente
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get('type')
            
            if message_type == 'start_stream':
                # Iniciar stream
                stream_id = message['data']['stream_id']
                rtsp_url = message['data']['rtsp_url']
                
                success = await webrtc_manager.start_stream_for_client(
                    client_id, stream_id, rtsp_url
                )
                
                response = {
                    'type': 'stream_status',
                    'data': {
                        'stream_id': stream_id,
                        'status': 'started' if success else 'error',
                        'message': 'Stream iniciado com sucesso' if success else 'Erro ao iniciar stream'
                    }
                }
                
                await websocket.send_text(json.dumps(response))
                
            elif message_type == 'stop_stream':
                # Parar stream
                stream_id = message['data']['stream_id']
                
                success = await webrtc_manager.stop_stream_for_client(
                    client_id, stream_id
                )
                
                response = {
                    'type': 'stream_status',
                    'data': {
                        'stream_id': stream_id,
                        'status': 'stopped' if success else 'error',
                        'message': 'Stream parado com sucesso' if success else 'Erro ao parar stream'
                    }
                }
                
                await websocket.send_text(json.dumps(response))
                
            elif message_type == 'get_stream_info':
                # Obter informações do stream
                stream_id = message['data']['stream_id']
                info = webrtc_manager.get_stream_info(stream_id)
                
                response = {
                    'type': 'stream_info',
                    'data': {
                        'stream_id': stream_id,
                        'info': info
                    }
                }
                
                await websocket.send_text(json.dumps(response))
                
    except WebSocketDisconnect:
        logger.info(f"Cliente WebRTC desconectado: {client_id}")
    except Exception as e:
        logger.error(f"Erro na conexão WebRTC {client_id}: {e}")
    finally:
        # Limpar recursos do cliente
        await webrtc_manager.disconnect_client(client_id)

@router.get("/streams")
async def get_all_streams():
    """
    Obter informações de todos os streams ativos
    
    Returns:
        Informações de todos os streams
    """
    return webrtc_manager.get_all_streams_info()

@router.get("/streams/{stream_id}")
async def get_stream_info(stream_id: str):
    """
    Obter informações de um stream específico
    
    Args:
        stream_id: ID do stream
        
    Returns:
        Informações do stream
    """
    info = webrtc_manager.get_stream_info(stream_id)
    if info:
        return info
    else:
        return {"error": "Stream não encontrado"}

@router.post("/streams/{stream_id}/stop")
async def stop_stream(stream_id: str):
    """
    Parar stream específico para todos os clientes
    
    Args:
        stream_id: ID do stream
        
    Returns:
        Status da operação
    """
    success = stream_manager.stop_stream(stream_id)
    return {
        "stream_id": stream_id,
        "status": "stopped" if success else "error",
        "message": "Stream parado com sucesso" if success else "Erro ao parar stream"
    }
