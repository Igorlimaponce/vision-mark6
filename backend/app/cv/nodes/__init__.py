"""
Factory para criação de nós de pipeline CV.
"""

from typing import Dict, Any, Type, Optional
import logging
from .base import BaseNode
from .input_nodes import CameraInputNode, VideoFileInputNode
from .processing_nodes import YOLODetectionNode, FaceDetectionNode, MotionDetectionNode
from .analytics_nodes import PeopleCountingNode, LineCrossingNode, AreaIntrusionNode

logger = logging.getLogger(__name__)

# Registro de todos os tipos de nós disponíveis
NODE_REGISTRY: Dict[str, Type[BaseNode]] = {
    # Input Nodes
    'camera_input': CameraInputNode,
    'webcam_input': CameraInputNode,
    'video_file_input': VideoFileInputNode,
    'image_input': VideoFileInputNode,  # Pode usar o mesmo handler
    
    # Processing Nodes
    'yolo_detection': YOLODetectionNode,
    'object_detection': YOLODetectionNode,  # Alias
    'face_detection': FaceDetectionNode,
    'motion_detection': MotionDetectionNode,
    
    # Analytics Nodes
    'people_counting': PeopleCountingNode,
    'line_crossing': LineCrossingNode,
    'area_intrusion': AreaIntrusionNode,
    'zone_monitoring': AreaIntrusionNode,  # Alias
}


def create_node(node_type: str, node_id: str, config: Dict[str, Any]) -> Optional[BaseNode]:
    """
    Cria uma instância de nó baseada no tipo especificado.
    
    Args:
        node_type: Tipo do nó (deve estar no NODE_REGISTRY)
        node_id: ID único para o nó
        config: Configuração específica do nó
        
    Returns:
        Instância do nó ou None se o tipo não for encontrado
    """
    try:
        if node_type not in NODE_REGISTRY:
            logger.error(f"Tipo de nó não encontrado: {node_type}")
            available_types = list(NODE_REGISTRY.keys())
            logger.info(f"Tipos disponíveis: {available_types}")
            return None
        
        node_class = NODE_REGISTRY[node_type]
        node_instance = node_class(node_id, config)
        
        logger.info(f"Nó criado: {node_type} (ID: {node_id})")
        return node_instance
        
    except Exception as e:
        logger.error(f"Erro ao criar nó {node_type}: {str(e)}")
        return None


def get_available_node_types() -> Dict[str, Dict[str, Any]]:
    """
    Retorna informações sobre todos os tipos de nós disponíveis.
    
    Returns:
        Dicionário com informações dos nós
    """
    node_info = {}
    
    for node_type, node_class in NODE_REGISTRY.items():
        try:
            # Criar instância temporária para obter informações
            temp_instance = node_class('temp', {})
            
            node_info[node_type] = {
                'class_name': node_class.__name__,
                'input_types': temp_instance.get_input_types(),
                'output_types': temp_instance.get_output_types(),
                'category': _get_node_category(node_class),
                'description': _get_node_description(node_class)
            }
            
        except Exception as e:
            logger.warning(f"Erro ao obter informações do nó {node_type}: {str(e)}")
            node_info[node_type] = {
                'class_name': node_class.__name__,
                'error': str(e)
            }
    
    return node_info


def _get_node_category(node_class: Type[BaseNode]) -> str:
    """Determina a categoria do nó baseada na classe."""
    from .input_nodes import InputNode
    from .processing_nodes import ProcessingNode
    from .analytics_nodes import AnalyticsNode
    
    if issubclass(node_class, InputNode):
        return 'input'
    elif issubclass(node_class, ProcessingNode):
        return 'processing'
    elif issubclass(node_class, AnalyticsNode):
        return 'analytics'
    else:
        return 'other'


def _get_node_description(node_class: Type[BaseNode]) -> str:
    """Extrai descrição do nó da docstring."""
    docstring = node_class.__doc__
    if docstring:
        # Pegar a primeira linha da docstring
        return docstring.strip().split('\n')[0]
    return f"Nó do tipo {node_class.__name__}"


def validate_node_config(node_type: str, config: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Valida a configuração de um nó antes da criação.
    
    Args:
        node_type: Tipo do nó
        config: Configuração a ser validada
        
    Returns:
        Tupla (is_valid, error_message)
    """
    try:
        if node_type not in NODE_REGISTRY:
            return False, f"Tipo de nó não encontrado: {node_type}"
        
        # Criar instância temporária para validação
        node_class = NODE_REGISTRY[node_type]
        temp_instance = node_class('validation_temp', config)
        
        # Chamar método de validação se existir
        if hasattr(temp_instance, 'validate_config'):
            return temp_instance.validate_config()
        
        return True, None
        
    except Exception as e:
        return False, f"Erro na validação: {str(e)}"


def get_node_config_schema(node_type: str) -> Optional[Dict[str, Any]]:
    """
    Retorna o schema de configuração para um tipo de nó.
    
    Args:
        node_type: Tipo do nó
        
    Returns:
        Schema de configuração ou None se não encontrado
    """
    # Schemas básicos para cada tipo de nó
    schemas = {
        'camera_input': {
            'rtsp_url': {'type': 'string', 'required': False, 'description': 'URL do stream RTSP'},
            'device_index': {'type': 'integer', 'required': False, 'default': 0, 'description': 'Índice da câmera local'},
            'fps': {'type': 'integer', 'default': 30, 'description': 'Frames por segundo'},
            'resolution': {'type': 'string', 'default': '1920x1080', 'description': 'Resolução do vídeo'},
            'buffer_size': {'type': 'integer', 'default': 10, 'description': 'Tamanho do buffer de frames'},
            'reconnect_attempts': {'type': 'integer', 'default': 3, 'description': 'Tentativas de reconexão'}
        },
        
        'yolo_detection': {
            'model': {'type': 'string', 'default': 'yolov8n.pt', 'description': 'Modelo YOLO a usar'},
            'confidence_threshold': {'type': 'float', 'default': 0.5, 'description': 'Threshold de confiança'},
            'iou_threshold': {'type': 'float', 'default': 0.45, 'description': 'Threshold de IoU'},
            'draw_detections': {'type': 'boolean', 'default': True, 'description': 'Desenhar detecções no frame'}
        },
        
        'face_detection': {
            'scale_factor': {'type': 'float', 'default': 1.1, 'description': 'Fator de escala para detecção'},
            'min_neighbors': {'type': 'integer', 'default': 5, 'description': 'Mínimo de vizinhos'},
            'min_size': {'type': 'array', 'default': [30, 30], 'description': 'Tamanho mínimo da face'},
            'detect_eyes': {'type': 'boolean', 'default': False, 'description': 'Detectar olhos também'},
            'draw_detections': {'type': 'boolean', 'default': True, 'description': 'Desenhar detecções no frame'}
        },
        
        'motion_detection': {
            'method': {'type': 'string', 'default': 'MOG2', 'options': ['MOG2', 'KNN'], 'description': 'Método de detecção'},
            'history': {'type': 'integer', 'default': 500, 'description': 'Histórico para background subtraction'},
            'var_threshold': {'type': 'float', 'default': 16, 'description': 'Threshold de variância (MOG2)'},
            'detect_shadows': {'type': 'boolean', 'default': True, 'description': 'Detectar sombras'},
            'min_area': {'type': 'integer', 'default': 500, 'description': 'Área mínima para detecção'},
            'draw_detections': {'type': 'boolean', 'default': True, 'description': 'Desenhar detecções no frame'},
            'show_mask': {'type': 'boolean', 'default': False, 'description': 'Mostrar máscara de movimento'}
        },
        
        'people_counting': {
            'max_tracking_distance': {'type': 'integer', 'default': 100, 'description': 'Distância máxima para tracking'},
            'person_timeout': {'type': 'float', 'default': 5.0, 'description': 'Timeout para pessoa desaparecer'},
            'trend_threshold': {'type': 'float', 'default': 1.0, 'description': 'Threshold para tendência'}
        },
        
        'line_crossing': {
            'lines': {
                'type': 'array',
                'required': True,
                'description': 'Lista de linhas para monitoramento',
                'items': {
                    'id': {'type': 'string', 'description': 'ID da linha'},
                    'name': {'type': 'string', 'description': 'Nome da linha'},
                    'start': {'type': 'array', 'description': 'Ponto inicial [x, y]'},
                    'end': {'type': 'array', 'description': 'Ponto final [x, y]'},
                    'direction': {'type': 'string', 'default': 'both', 'options': ['both', 'forward', 'backward']}
                }
            }
        },
        
        'area_intrusion': {
            'zones': {
                'type': 'array',
                'required': True,
                'description': 'Lista de zonas para monitoramento',
                'items': {
                    'id': {'type': 'string', 'description': 'ID da zona'},
                    'name': {'type': 'string', 'description': 'Nome da zona'},
                    'polygon': {'type': 'array', 'description': 'Pontos do polígono [[x1,y1], [x2,y2], ...]'},
                    'allowed_classes': {'type': 'array', 'description': 'Classes permitidas na zona'},
                    'alert_threshold': {'type': 'integer', 'default': 1, 'description': 'Threshold para alerta'},
                    'sensitivity': {'type': 'string', 'default': 'medium', 'options': ['low', 'medium', 'high']}
                }
            }
        }
    }
    
    return schemas.get(node_type)
