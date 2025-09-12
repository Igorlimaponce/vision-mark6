"""
Serviço de integração entre Pipeline Manager e WebSocket.
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from app.api.ws.manager import connection_manager
from app.cv.pipeline import pipeline_manager
from app.crud import crud_pipeline
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


class PipelineWebSocketService:
    """Serviço para integrar Pipeline Manager com WebSocket."""
    
    def __init__(self):
        self.is_initialized = False
        
    def initialize(self):
        """Inicializa o serviço conectando os callbacks."""
        if self.is_initialized:
            return
            
        # Registrar callbacks globais do pipeline manager
        pipeline_manager.set_global_status_callback(self._on_pipeline_status_change)
        pipeline_manager.set_global_frame_callback(self._on_pipeline_frame)
        pipeline_manager.set_global_error_callback(self._on_pipeline_error)
        pipeline_manager.set_global_analytics_callback(self._on_pipeline_analytics)
        
        self.is_initialized = True
        logger.info("PipelineWebSocketService inicializado")
    
    async def _get_pipeline_organization_id(self, pipeline_id: str) -> Optional[str]:
        """Obtém o organization_id do pipeline."""
        try:
            db = SessionLocal()
            try:
                pipeline = crud_pipeline.get_pipeline(db, pipeline_id=pipeline_id)
                if pipeline:
                    return str(pipeline.organization_id)
                return None
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Erro ao obter organization_id do pipeline {pipeline_id}: {str(e)}")
            return None
    
    def _on_pipeline_status_change(self, pipeline_id: str, status: str):
        """Callback para mudança de status de pipeline."""
        try:
            # Executar em thread assíncrona
            asyncio.create_task(self._broadcast_pipeline_status(pipeline_id, status))
        except Exception as e:
            logger.error(f"Erro ao processar mudança de status do pipeline {pipeline_id}: {str(e)}")
    
    async def _broadcast_pipeline_status(self, pipeline_id: str, status: str):
        """Envia atualização de status via WebSocket."""
        try:
            organization_id = await self._get_pipeline_organization_id(pipeline_id)
            if not organization_id:
                logger.warning(f"Organization ID não encontrado para pipeline {pipeline_id}")
                return
            
            # Obter dados completos do pipeline
            pipeline_status = pipeline_manager.get_pipeline_status(pipeline_id)
            
            metadata = {
                'detailed_status': pipeline_status,
                'event_type': 'status_change'
            }
            
            await connection_manager.broadcast_pipeline_status(
                pipeline_id, 
                status, 
                organization_id, 
                metadata
            )
            
            logger.info(f"Status do pipeline {pipeline_id} ({status}) enviado via WebSocket")
            
        except Exception as e:
            logger.error(f"Erro ao enviar status do pipeline via WebSocket: {str(e)}")
    
    def _on_pipeline_frame(self, pipeline_id: str, frame_data: Dict[str, Any]):
        """Callback para frame processado."""
        try:
            # Executar em thread assíncrona
            asyncio.create_task(self._broadcast_pipeline_frame(pipeline_id, frame_data))
        except Exception as e:
            logger.error(f"Erro ao processar frame do pipeline {pipeline_id}: {str(e)}")
    
    async def _broadcast_pipeline_frame(self, pipeline_id: str, frame_data: Dict[str, Any]):
        """Envia dados do frame via WebSocket."""
        try:
            organization_id = await self._get_pipeline_organization_id(pipeline_id)
            if not organization_id:
                return
            
            # Filtrar dados do frame para reduzir payload
            filtered_frame_data = {
                'pipeline_id': pipeline_id,
                'frame_id': frame_data.get('frame_id'),
                'timestamp': frame_data.get('timestamp'),
                'detections_count': len(frame_data.get('detections', [])),
                'processing_time': frame_data.get('processing_time'),
                'fps': frame_data.get('fps'),
                'node_results': {
                    node_id: {
                        'success': result.get('success', False),
                        'processing_time': result.get('processing_time', 0)
                    }
                    for node_id, result in frame_data.get('node_results', {}).items()
                }
            }
            
            message = {
                "type": "pipeline_frame_update",
                "pipeline_id": pipeline_id,
                "frame_data": filtered_frame_data,
                "timestamp": asyncio.get_event_loop().time()
            }
            
            await connection_manager.broadcast_to_organization(message, organization_id)
            
        except Exception as e:
            logger.error(f"Erro ao enviar frame do pipeline via WebSocket: {str(e)}")
    
    def _on_pipeline_error(self, pipeline_id: str, error_message: str):
        """Callback para erro em pipeline."""
        try:
            # Executar em thread assíncrona
            asyncio.create_task(self._broadcast_pipeline_error(pipeline_id, error_message))
        except Exception as e:
            logger.error(f"Erro ao processar erro do pipeline {pipeline_id}: {str(e)}")
    
    async def _broadcast_pipeline_error(self, pipeline_id: str, error_message: str):
        """Envia erro do pipeline via WebSocket."""
        try:
            organization_id = await self._get_pipeline_organization_id(pipeline_id)
            if not organization_id:
                return
            
            message = {
                "type": "pipeline_error",
                "pipeline_id": pipeline_id,
                "error_message": error_message,
                "timestamp": asyncio.get_event_loop().time(),
                "severity": "error"
            }
            
            await connection_manager.broadcast_to_organization(message, organization_id)
            logger.info(f"Erro do pipeline {pipeline_id} enviado via WebSocket")
            
        except Exception as e:
            logger.error(f"Erro ao enviar erro do pipeline via WebSocket: {str(e)}")
    
    def _on_pipeline_analytics(self, pipeline_id: str, node_id: str, analytics_data: Dict[str, Any]):
        """Callback para dados de análise."""
        try:
            # Executar em thread assíncrona
            asyncio.create_task(self._broadcast_pipeline_analytics(pipeline_id, node_id, analytics_data))
        except Exception as e:
            logger.error(f"Erro ao processar analytics do pipeline {pipeline_id}: {str(e)}")
    
    async def _broadcast_pipeline_analytics(self, pipeline_id: str, node_id: str, analytics_data: Dict[str, Any]):
        """Envia dados de análise via WebSocket."""
        try:
            organization_id = await self._get_pipeline_organization_id(pipeline_id)
            if not organization_id:
                return
            
            # Extrair informações importantes dos analytics
            analytics_summary = {
                'node_id': node_id,
                'node_type': analytics_data.get('node_type'),
                'timestamp': analytics_data.get('timestamp'),
                'results': analytics_data.get('results', {})
            }
            
            # Adicionar dados específicos por tipo de nó analítico
            if 'people_count' in analytics_data:
                analytics_summary['people_count'] = analytics_data['people_count']
                analytics_summary['trend'] = analytics_data.get('trend')
            
            if 'line_crossings' in analytics_data:
                analytics_summary['new_crossings'] = len(analytics_data.get('new_crossings', []))
                analytics_summary['total_crossings'] = analytics_data.get('total_crossings', 0)
            
            if 'intrusion_events' in analytics_data:
                analytics_summary['new_intrusions'] = len(analytics_data.get('new_intrusions', []))
                analytics_summary['active_zones'] = analytics_data.get('active_zones', 0)
            
            message = {
                "type": "pipeline_analytics",
                "pipeline_id": pipeline_id,
                "analytics": analytics_summary,
                "timestamp": asyncio.get_event_loop().time()
            }
            
            await connection_manager.broadcast_to_organization(message, organization_id)
            
        except Exception as e:
            logger.error(f"Erro ao enviar analytics do pipeline via WebSocket: {str(e)}")
    
    async def broadcast_pipeline_stats(self, pipeline_id: str):
        """Envia estatísticas completas do pipeline via WebSocket."""
        try:
            organization_id = await self._get_pipeline_organization_id(pipeline_id)
            if not organization_id:
                return
            
            pipeline_status = pipeline_manager.get_pipeline_status(pipeline_id)
            if not pipeline_status:
                return
            
            message = {
                "type": "pipeline_stats_update",
                "pipeline_id": pipeline_id,
                "stats": pipeline_status.get('stats', {}),
                "nodes_status": pipeline_status.get('nodes', {}),
                "timestamp": asyncio.get_event_loop().time()
            }
            
            await connection_manager.broadcast_to_organization(message, organization_id)
            
        except Exception as e:
            logger.error(f"Erro ao enviar stats do pipeline via WebSocket: {str(e)}")
    
    async def broadcast_system_stats(self):
        """Envia estatísticas do sistema para todas as organizações."""
        try:
            system_stats = pipeline_manager.get_system_stats()
            
            message = {
                "type": "system_stats_update",
                "stats": system_stats,
                "timestamp": asyncio.get_event_loop().time()
            }
            
            # Broadcast para todas as organizações ativas
            for org_id in connection_manager.active_connections.keys():
                await connection_manager.broadcast_to_organization(message, org_id)
            
        except Exception as e:
            logger.error(f"Erro ao enviar stats do sistema via WebSocket: {str(e)}")


# Instância global do serviço
pipeline_websocket_service = PipelineWebSocketService()
