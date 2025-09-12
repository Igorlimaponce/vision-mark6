"""
Gerenciador de pipelines de Computer Vision.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Callable
import threading
from datetime import datetime
import uuid

from .executor import PipelineExecutor, PipelineStatus
from app.core.config import settings

logger = logging.getLogger(__name__)


class PipelineManager:
    """Gerenciador central de pipelines de CV."""
    
    def __init__(self):
        self.pipelines: Dict[str, PipelineExecutor] = {}
        self.lock = threading.Lock()
        
        # Callbacks globais
        self.global_status_callback: Optional[Callable] = None
        self.global_frame_callback: Optional[Callable] = None
        self.global_error_callback: Optional[Callable] = None
        self.global_analytics_callback: Optional[Callable] = None
    
    def create_pipeline(self, pipeline_id: str, pipeline_config: Dict[str, Any]) -> bool:
        """Cria um novo pipeline."""
        try:
            with self.lock:
                if pipeline_id in self.pipelines:
                    logger.warning(f"Pipeline {pipeline_id} já existe")
                    return False
                
                executor = PipelineExecutor(pipeline_id, pipeline_config)
                
                # Registrar callbacks
                executor.set_status_callback(self._on_pipeline_status_change)
                executor.set_frame_callback(self._on_pipeline_frame)
                executor.set_error_callback(self._on_pipeline_error)
                executor.set_analytics_callback(self._on_pipeline_analytics)
                
                self.pipelines[pipeline_id] = executor
                
                logger.info(f"Pipeline criado: {pipeline_id}")
                return True
                
        except Exception as e:
            logger.error(f"Erro ao criar pipeline {pipeline_id}: {str(e)}")
            return False
    
    def start_pipeline(self, pipeline_id: str) -> bool:
        """Inicia um pipeline."""
        try:
            with self.lock:
                if pipeline_id not in self.pipelines:
                    logger.error(f"Pipeline não encontrado: {pipeline_id}")
                    return False
                
                pipeline = self.pipelines[pipeline_id]
                return pipeline.start()
                
        except Exception as e:
            logger.error(f"Erro ao iniciar pipeline {pipeline_id}: {str(e)}")
            return False
    
    def stop_pipeline(self, pipeline_id: str) -> bool:
        """Para um pipeline."""
        try:
            with self.lock:
                if pipeline_id not in self.pipelines:
                    logger.error(f"Pipeline não encontrado: {pipeline_id}")
                    return False
                
                pipeline = self.pipelines[pipeline_id]
                pipeline.stop()
                return True
                
        except Exception as e:
            logger.error(f"Erro ao parar pipeline {pipeline_id}: {str(e)}")
            return False
    
    def pause_pipeline(self, pipeline_id: str) -> bool:
        """Pausa um pipeline."""
        try:
            with self.lock:
                if pipeline_id not in self.pipelines:
                    logger.error(f"Pipeline não encontrado: {pipeline_id}")
                    return False
                
                pipeline = self.pipelines[pipeline_id]
                pipeline.pause()
                return True
                
        except Exception as e:
            logger.error(f"Erro ao pausar pipeline {pipeline_id}: {str(e)}")
            return False
    
    def resume_pipeline(self, pipeline_id: str) -> bool:
        """Resume um pipeline."""
        try:
            with self.lock:
                if pipeline_id not in self.pipelines:
                    logger.error(f"Pipeline não encontrado: {pipeline_id}")
                    return False
                
                pipeline = self.pipelines[pipeline_id]
                pipeline.resume()
                return True
                
        except Exception as e:
            logger.error(f"Erro ao resumir pipeline {pipeline_id}: {str(e)}")
            return False
    
    def delete_pipeline(self, pipeline_id: str) -> bool:
        """Remove um pipeline."""
        try:
            with self.lock:
                if pipeline_id not in self.pipelines:
                    logger.error(f"Pipeline não encontrado: {pipeline_id}")
                    return False
                
                pipeline = self.pipelines[pipeline_id]
                pipeline.cleanup()
                del self.pipelines[pipeline_id]
                
                logger.info(f"Pipeline removido: {pipeline_id}")
                return True
                
        except Exception as e:
            logger.error(f"Erro ao remover pipeline {pipeline_id}: {str(e)}")
            return False
    
    def get_pipeline_status(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """Obtém status de um pipeline específico."""
        try:
            with self.lock:
                if pipeline_id not in self.pipelines:
                    return None
                
                pipeline = self.pipelines[pipeline_id]
                return pipeline.get_status()
                
        except Exception as e:
            logger.error(f"Erro ao obter status do pipeline {pipeline_id}: {str(e)}")
            return None
    
    def get_all_pipelines_status(self) -> Dict[str, Dict[str, Any]]:
        """Obtém status de todos os pipelines."""
        try:
            with self.lock:
                statuses = {}
                for pipeline_id, pipeline in self.pipelines.items():
                    statuses[pipeline_id] = pipeline.get_status()
                return statuses
                
        except Exception as e:
            logger.error(f"Erro ao obter status dos pipelines: {str(e)}")
            return {}
    
    def get_pipeline_list(self) -> List[Dict[str, Any]]:
        """Lista todos os pipelines com informações básicas."""
        try:
            with self.lock:
                pipeline_list = []
                for pipeline_id, pipeline in self.pipelines.items():
                    status = pipeline.get_status()
                    pipeline_info = {
                        'id': pipeline_id,
                        'status': status['status'],
                        'nodes_count': len(status.get('nodes', {})),
                        'total_frames_processed': status['stats']['total_frames_processed'],
                        'fps': status['stats']['frames_per_second'],
                        'errors_count': status['stats']['errors_count'],
                        'uptime': status['stats']['uptime']
                    }
                    pipeline_list.append(pipeline_info)
                
                return pipeline_list
                
        except Exception as e:
            logger.error(f"Erro ao listar pipelines: {str(e)}")
            return []
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Obtém estatísticas do sistema."""
        try:
            with self.lock:
                total_pipelines = len(self.pipelines)
                running_pipelines = len([
                    p for p in self.pipelines.values() 
                    if p.status == PipelineStatus.RUNNING
                ])
                
                total_frames = sum(
                    p.stats.total_frames_processed 
                    for p in self.pipelines.values()
                )
                
                total_detections = sum(
                    p.stats.total_detections 
                    for p in self.pipelines.values()
                )
                
                total_errors = sum(
                    p.stats.errors_count 
                    for p in self.pipelines.values()
                )
                
                return {
                    'total_pipelines': total_pipelines,
                    'running_pipelines': running_pipelines,
                    'total_frames_processed': total_frames,
                    'total_detections': total_detections,
                    'total_errors': total_errors,
                    'system_uptime': 0,  # TODO: Implementar
                    'memory_usage': 0,   # TODO: Implementar
                    'cpu_usage': 0       # TODO: Implementar
                }
                
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas do sistema: {str(e)}")
            return {}
    
    def update_pipeline_config(self, pipeline_id: str, new_config: Dict[str, Any]) -> bool:
        """Atualiza configuração de um pipeline (requer restart)."""
        try:
            with self.lock:
                if pipeline_id not in self.pipelines:
                    logger.error(f"Pipeline não encontrado: {pipeline_id}")
                    return False
                
                pipeline = self.pipelines[pipeline_id]
                was_running = pipeline.status == PipelineStatus.RUNNING
                
                # Parar pipeline se estiver rodando
                if was_running:
                    pipeline.stop()
                
                # Limpar e recriar
                pipeline.cleanup()
                new_pipeline = PipelineExecutor(pipeline_id, new_config)
                
                # Registrar callbacks
                new_pipeline.set_status_callback(self._on_pipeline_status_change)
                new_pipeline.set_frame_callback(self._on_pipeline_frame)
                new_pipeline.set_error_callback(self._on_pipeline_error)
                new_pipeline.set_analytics_callback(self._on_pipeline_analytics)
                
                self.pipelines[pipeline_id] = new_pipeline
                
                # Reiniciar se estava rodando
                if was_running:
                    new_pipeline.start()
                
                logger.info(f"Configuração do pipeline {pipeline_id} atualizada")
                return True
                
        except Exception as e:
            logger.error(f"Erro ao atualizar pipeline {pipeline_id}: {str(e)}")
            return False
    
    def cleanup_all(self):
        """Limpa todos os pipelines."""
        try:
            with self.lock:
                for pipeline_id, pipeline in self.pipelines.items():
                    try:
                        pipeline.cleanup()
                        logger.info(f"Pipeline {pipeline_id} limpo")
                    except Exception as e:
                        logger.error(f"Erro ao limpar pipeline {pipeline_id}: {str(e)}")
                
                self.pipelines.clear()
                logger.info("Todos os pipelines foram limpos")
                
        except Exception as e:
            logger.error(f"Erro na limpeza geral: {str(e)}")
    
    # Callbacks internos
    def _on_pipeline_status_change(self, pipeline_id: str, status: str):
        """Callback para mudança de status de pipeline."""
        logger.info(f"Pipeline {pipeline_id} mudou status para: {status}")
        if self.global_status_callback:
            self.global_status_callback(pipeline_id, status)
    
    def _on_pipeline_frame(self, pipeline_id: str, frame_data: Dict[str, Any]):
        """Callback para frame processado."""
        if self.global_frame_callback:
            self.global_frame_callback(pipeline_id, frame_data)
    
    def _on_pipeline_error(self, pipeline_id: str, error_message: str):
        """Callback para erro em pipeline."""
        logger.error(f"Erro no pipeline {pipeline_id}: {error_message}")
        if self.global_error_callback:
            self.global_error_callback(pipeline_id, error_message)
    
    def _on_pipeline_analytics(self, pipeline_id: str, node_id: str, analytics_data: Dict[str, Any]):
        """Callback para dados de análise."""
        if self.global_analytics_callback:
            self.global_analytics_callback(pipeline_id, node_id, analytics_data)
    
    # Métodos para registrar callbacks globais
    def set_global_status_callback(self, callback: Callable):
        self.global_status_callback = callback
    
    def set_global_frame_callback(self, callback: Callable):
        self.global_frame_callback = callback
    
    def set_global_error_callback(self, callback: Callable):
        self.global_error_callback = callback
    
    def set_global_analytics_callback(self, callback: Callable):
        self.global_analytics_callback = callback


# Instância global do gerenciador
pipeline_manager = PipelineManager()
