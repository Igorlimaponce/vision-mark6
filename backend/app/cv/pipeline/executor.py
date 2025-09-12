"""
Sistema de execução de pipelines de Computer Vision.
"""

import asyncio
import logging
import time
import uuid
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import threading
from queue import Queue, Empty
from collections import defaultdict

from app.cv.nodes import create_node, BaseNode
from app.cv.nodes.base import FrameData, ProcessingResult, InputNode

logger = logging.getLogger(__name__)


class PipelineStatus(Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPING = "stopping"
    ERROR = "error"


@dataclass
class PipelineStats:
    """Estatísticas de execução do pipeline."""
    total_frames_processed: int = 0
    frames_per_second: float = 0.0
    average_processing_time: float = 0.0
    total_detections: int = 0
    errors_count: int = 0
    start_time: Optional[float] = None
    last_frame_time: Optional[float] = None


class PipelineExecutor:
    """Executor de pipeline de Computer Vision."""
    
    def __init__(self, pipeline_id: str, pipeline_config: Dict[str, Any]):
        self.pipeline_id = pipeline_id
        self.config = pipeline_config
        self.status = PipelineStatus.STOPPED
        self.nodes: Dict[str, BaseNode] = {}
        self.connections: List[Dict[str, Any]] = []
        self.stats = PipelineStats()
        
        # Threading e controle
        self.execution_thread: Optional[threading.Thread] = None
        self.stop_event = threading.Event()
        self.pause_event = threading.Event()
        
        # Filas de dados entre nós
        self.node_queues: Dict[str, Queue] = defaultdict(lambda: Queue(maxsize=10))
        
        # Callbacks para eventos
        self.status_callback: Optional[Callable] = None
        self.frame_callback: Optional[Callable] = None
        self.error_callback: Optional[Callable] = None
        self.analytics_callback: Optional[Callable] = None
        
        self.error_message: Optional[str] = None
        self.last_frame_data: Optional[Dict[str, Any]] = None
        
    def initialize(self) -> bool:
        """Inicializa todos os nós do pipeline."""
        try:
            self.status = PipelineStatus.STARTING
            self._notify_status_change()
            
            # Criar nós
            nodes_config = self.config.get('nodes', [])
            for node_config in nodes_config:
                node_id = node_config['node_id']
                node_type = node_config['node_type']
                config = node_config.get('config', {})
                
                node = create_node(node_type, node_id, config)
                if not node:
                    self.error_message = f"Falha ao criar nó {node_type} (ID: {node_id})"
                    self.status = PipelineStatus.ERROR
                    return False
                
                # Inicializar nó
                if not node.initialize():
                    self.error_message = f"Falha ao inicializar nó {node_id}: {node.error_message}"
                    self.status = PipelineStatus.ERROR
                    return False
                
                self.nodes[node_id] = node
                logger.info(f"Nó inicializado: {node_id} ({node_type})")
            
            # Configurar conexões
            self.connections = self.config.get('edges', [])
            
            # Validar pipeline
            if not self._validate_pipeline():
                self.status = PipelineStatus.ERROR
                return False
            
            logger.info(f"Pipeline {self.pipeline_id} inicializado com {len(self.nodes)} nós")
            return True
            
        except Exception as e:
            self.error_message = f"Erro na inicialização: {str(e)}"
            self.status = PipelineStatus.ERROR
            logger.error(self.error_message)
            return False
    
    def start(self) -> bool:
        """Inicia a execução do pipeline."""
        if self.status == PipelineStatus.RUNNING:
            return True
        
        if self.status != PipelineStatus.STOPPED and self.status != PipelineStatus.PAUSED:
            if not self.initialize():
                return False
        
        try:
            self.stop_event.clear()
            self.pause_event.clear()
            
            # Iniciar nós de entrada
            for node in self.nodes.values():
                if isinstance(node, InputNode):
                    node.start_stream()
            
            # Iniciar thread de execução
            self.execution_thread = threading.Thread(target=self._execution_loop)
            self.execution_thread.daemon = True
            self.execution_thread.start()
            
            self.status = PipelineStatus.RUNNING
            self.stats.start_time = time.time()
            self._notify_status_change()
            
            logger.info(f"Pipeline {self.pipeline_id} iniciado")
            return True
            
        except Exception as e:
            self.error_message = f"Erro ao iniciar pipeline: {str(e)}"
            self.status = PipelineStatus.ERROR
            logger.error(self.error_message)
            return False
    
    def stop(self):
        """Para a execução do pipeline."""
        if self.status == PipelineStatus.STOPPED:
            return
        
        self.status = PipelineStatus.STOPPING
        self._notify_status_change()
        
        # Sinalizar parada
        self.stop_event.set()
        
        # Parar nós de entrada
        for node in self.nodes.values():
            if isinstance(node, InputNode):
                node.stop_stream()
        
        # Aguardar thread terminar
        if self.execution_thread and self.execution_thread.is_alive():
            self.execution_thread.join(timeout=5.0)
        
        self.status = PipelineStatus.STOPPED
        self._notify_status_change()
        
        logger.info(f"Pipeline {self.pipeline_id} parado")
    
    def pause(self):
        """Pausa a execução do pipeline."""
        if self.status == PipelineStatus.RUNNING:
            self.pause_event.set()
            self.status = PipelineStatus.PAUSED
            self._notify_status_change()
            logger.info(f"Pipeline {self.pipeline_id} pausado")
    
    def resume(self):
        """Resume a execução do pipeline."""
        if self.status == PipelineStatus.PAUSED:
            self.pause_event.clear()
            self.status = PipelineStatus.RUNNING
            self._notify_status_change()
            logger.info(f"Pipeline {self.pipeline_id} resumido")
    
    def cleanup(self):
        """Limpa recursos do pipeline."""
        self.stop()
        
        for node in self.nodes.values():
            try:
                node.cleanup()
            except Exception as e:
                logger.warning(f"Erro ao limpar nó {node.node_id}: {str(e)}")
        
        self.nodes.clear()
        self.node_queues.clear()
        
        logger.info(f"Pipeline {self.pipeline_id} limpo")
    
    def _execution_loop(self):
        """Loop principal de execução do pipeline."""
        frame_times = []
        max_frame_times = 100  # Para calcular FPS
        
        try:
            while not self.stop_event.is_set():
                # Verificar se está pausado
                if self.pause_event.is_set():
                    time.sleep(0.1)
                    continue
                
                frame_start_time = time.time()
                
                # Processar frame atual
                self._process_frame()
                
                # Calcular estatísticas
                frame_time = time.time() - frame_start_time
                frame_times.append(frame_time)
                if len(frame_times) > max_frame_times:
                    frame_times.pop(0)
                
                self.stats.total_frames_processed += 1
                self.stats.average_processing_time = sum(frame_times) / len(frame_times)
                self.stats.frames_per_second = 1.0 / self.stats.average_processing_time if self.stats.average_processing_time > 0 else 0
                self.stats.last_frame_time = time.time()
                
                # Controle de FPS
                target_fps = self.config.get('fps', 30)
                target_frame_time = 1.0 / target_fps
                sleep_time = target_frame_time - frame_time
                if sleep_time > 0:
                    time.sleep(sleep_time)
                
        except Exception as e:
            self.error_message = f"Erro no loop de execução: {str(e)}"
            self.status = PipelineStatus.ERROR
            self.stats.errors_count += 1
            logger.error(self.error_message)
            if self.error_callback:
                self.error_callback(self.pipeline_id, self.error_message)
    
    def _process_frame(self):
        """Processa um frame através do pipeline."""
        try:
            # Obter dados dos nós de entrada
            input_data = {}
            for node_id, node in self.nodes.items():
                if isinstance(node, InputNode):
                    frame_data = node.get_next_frame()
                    if frame_data:
                        input_data[node_id] = frame_data
            
            if not input_data:
                return  # Nenhum dado de entrada disponível
            
            # Processar através da cadeia de nós
            processed_data = self._process_node_chain(input_data)
            
            # Callback para frame processado
            if processed_data and self.frame_callback:
                self.frame_callback(self.pipeline_id, processed_data)
            
            self.last_frame_data = processed_data
            
        except Exception as e:
            logger.error(f"Erro ao processar frame: {str(e)}")
            self.stats.errors_count += 1
    
    def _process_node_chain(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Processa dados através da cadeia de nós."""
        node_outputs = input_data.copy()
        
        # Processar nós em ordem topológica
        processing_order = self._get_processing_order()
        
        for node_id in processing_order:
            if node_id not in self.nodes:
                continue
            
            node = self.nodes[node_id]
            
            # Pular nós de entrada (já processados)
            if isinstance(node, InputNode):
                continue
            
            # Obter dados de entrada para este nó
            node_input = self._get_node_input_data(node_id, node_outputs)
            
            if node_input:
                # Processar nó
                result = node.process(node_input)
                
                if result.success:
                    node_outputs[node_id] = result.data
                    
                    # Contar detecções se aplicável
                    if result.data and isinstance(result.data, dict):
                        detections = result.data.get('detections', [])
                        if isinstance(detections, list):
                            self.stats.total_detections += len(detections)
                    
                    # Callback para analytics
                    if result.metadata and self.analytics_callback:
                        self.analytics_callback(self.pipeline_id, node_id, result.metadata)
                        
                else:
                    logger.warning(f"Falha no processamento do nó {node_id}: {result.error}")
                    self.stats.errors_count += 1
        
        return node_outputs
    
    def _get_node_input_data(self, node_id: str, available_data: Dict[str, Any]) -> Any:
        """Obtém dados de entrada para um nó específico."""
        # Encontrar conexões que chegam neste nó
        input_connections = [
            conn for conn in self.connections
            if conn.get('target_node_id') == node_id
        ]
        
        if not input_connections:
            return None
        
        # Para simplicidade, usar dados do primeiro nó conectado
        # Em implementação completa, seria mais sofisticado
        for conn in input_connections:
            source_node_id = conn.get('source_node_id')
            if source_node_id in available_data:
                return available_data[source_node_id]
        
        return None
    
    def _get_processing_order(self) -> List[str]:
        """Determina ordem de processamento dos nós (ordenação topológica simplificada)."""
        # Implementação simplificada - em produção usaria algoritmo completo
        input_nodes = []
        processing_nodes = []
        analytics_nodes = []
        
        for node_id, node in self.nodes.items():
            if isinstance(node, InputNode):
                input_nodes.append(node_id)
            elif hasattr(node, '__class__') and 'Processing' in node.__class__.__name__:
                processing_nodes.append(node_id)
            else:
                analytics_nodes.append(node_id)
        
        return input_nodes + processing_nodes + analytics_nodes
    
    def _validate_pipeline(self) -> bool:
        """Valida a configuração do pipeline."""
        try:
            # Verificar se há pelo menos um nó de entrada
            input_nodes = [n for n in self.nodes.values() if isinstance(n, InputNode)]
            if not input_nodes:
                self.error_message = "Pipeline deve ter pelo menos um nó de entrada"
                return False
            
            # Verificar conexões válidas
            for conn in self.connections:
                source_id = conn.get('source_node_id')
                target_id = conn.get('target_node_id')
                
                if source_id not in self.nodes:
                    self.error_message = f"Nó fonte não encontrado: {source_id}"
                    return False
                
                if target_id not in self.nodes:
                    self.error_message = f"Nó destino não encontrado: {target_id}"
                    return False
            
            return True
            
        except Exception as e:
            self.error_message = f"Erro na validação: {str(e)}"
            return False
    
    def _notify_status_change(self):
        """Notifica mudança de status."""
        if self.status_callback:
            self.status_callback(self.pipeline_id, self.status.value)
    
    def get_status(self) -> Dict[str, Any]:
        """Retorna status detalhado do pipeline."""
        node_statuses = {
            node_id: node.get_status()
            for node_id, node in self.nodes.items()
        }
        
        return {
            'pipeline_id': self.pipeline_id,
            'status': self.status.value,
            'error_message': self.error_message,
            'stats': {
                'total_frames_processed': self.stats.total_frames_processed,
                'frames_per_second': round(self.stats.frames_per_second, 2),
                'average_processing_time': round(self.stats.average_processing_time * 1000, 2),  # ms
                'total_detections': self.stats.total_detections,
                'errors_count': self.stats.errors_count,
                'uptime': time.time() - self.stats.start_time if self.stats.start_time else 0
            },
            'nodes': node_statuses,
            'last_frame_time': self.stats.last_frame_time
        }
    
    # Métodos para registrar callbacks
    def set_status_callback(self, callback: Callable):
        self.status_callback = callback
    
    def set_frame_callback(self, callback: Callable):
        self.frame_callback = callback
    
    def set_error_callback(self, callback: Callable):
        self.error_callback = callback
    
    def set_analytics_callback(self, callback: Callable):
        self.analytics_callback = callback
