"""
Base classes para nós de pipeline de Computer Vision.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union, Tuple
import cv2
import numpy as np
from datetime import datetime
import uuid
from dataclasses import dataclass


@dataclass
class ProcessingResult:
    """Resultado do processamento de um nó."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    timestamp: datetime = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}


@dataclass
class FrameData:
    """Dados de um frame de vídeo com metadados."""
    frame: np.ndarray
    timestamp: datetime
    frame_id: int
    source_id: str
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class Detection:
    """Representação de uma detecção."""
    class_id: int
    class_name: str
    confidence: float
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    mask: Optional[np.ndarray] = None
    keypoints: Optional[List[Tuple[int, int]]] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class BaseNode(ABC):
    """Classe base para todos os nós de pipeline."""
    
    def __init__(self, node_id: str, config: Dict[str, Any]):
        self.node_id = node_id
        self.config = config
        self.is_initialized = False
        self.is_running = False
        self.error_message = None
        self._last_result = None
        
    @abstractmethod
    def initialize(self) -> bool:
        """Inicializa o nó. Deve ser chamado antes do processamento."""
        pass
    
    @abstractmethod
    def process(self, input_data: Any) -> ProcessingResult:
        """Processa os dados de entrada e retorna o resultado."""
        pass
    
    @abstractmethod
    def cleanup(self):
        """Limpa recursos utilizados pelo nó."""
        pass
    
    def get_input_types(self) -> List[str]:
        """Retorna os tipos de entrada aceitos pelo nó."""
        return ['any']
    
    def get_output_types(self) -> List[str]:
        """Retorna os tipos de saída produzidos pelo nó."""
        return ['any']
    
    def validate_config(self) -> Tuple[bool, Optional[str]]:
        """Valida a configuração do nó."""
        return True, None
    
    def get_status(self) -> Dict[str, Any]:
        """Retorna o status atual do nó."""
        return {
            'node_id': self.node_id,
            'is_initialized': self.is_initialized,
            'is_running': self.is_running,
            'error_message': self.error_message,
            'last_processed': self._last_result.timestamp if self._last_result else None
        }


class InputNode(BaseNode):
    """Classe base para nós de entrada."""
    
    def get_input_types(self) -> List[str]:
        return []  # Nós de entrada não recebem dados
    
    @abstractmethod
    def start_stream(self):
        """Inicia o stream de dados."""
        pass
    
    @abstractmethod
    def stop_stream(self):
        """Para o stream de dados."""
        pass
    
    @abstractmethod
    def get_next_frame(self) -> Optional[FrameData]:
        """Obtém o próximo frame do stream."""
        pass


class ProcessingNode(BaseNode):
    """Classe base para nós de processamento."""
    
    def get_input_types(self) -> List[str]:
        return ['video', 'image']
    
    def get_output_types(self) -> List[str]:
        return ['video', 'detections']


class AnalyticsNode(BaseNode):
    """Classe base para nós de análise."""
    
    def get_input_types(self) -> List[str]:
        return ['detections', 'data']
    
    def get_output_types(self) -> List[str]:
        return ['analytics', 'data']


class OutputNode(BaseNode):
    """Classe base para nós de saída."""
    
    def get_output_types(self) -> List[str]:
        return []  # Nós de saída não produzem dados para outros nós
    
    @abstractmethod
    def send_data(self, data: Any) -> bool:
        """Envia dados para o destino configurado."""
        pass
