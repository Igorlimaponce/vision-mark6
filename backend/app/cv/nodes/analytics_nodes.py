"""
Nós de análise para Computer Vision.
"""

import numpy as np
from typing import List, Dict, Any, Tuple, Optional
import logging
from collections import defaultdict, deque
import time
import math

from .base import AnalyticsNode, Detection, ProcessingResult

logger = logging.getLogger(__name__)


class PeopleCountingNode(AnalyticsNode):
    """Nó para contagem de pessoas."""
    
    def __init__(self, node_id: str, config: Dict[str, Any]):
        super().__init__(node_id, config)
        self.person_tracker = {}
        self.next_person_id = 1
        self.count_history = deque(maxlen=100)
        
    def initialize(self) -> bool:
        """Inicializa o contador de pessoas."""
        try:
            self.is_initialized = True
            logger.info(f"Contador de pessoas inicializado para nó {self.node_id}")
            return True
        except Exception as e:
            self.error_message = f"Erro ao inicializar contador: {str(e)}"
            return False
    
    def process(self, input_data: Dict[str, Any]) -> ProcessingResult:
        """Processa contagem de pessoas a partir das detecções."""
        if not self.is_initialized:
            return ProcessingResult(success=False, error="Nó não inicializado")
        
        try:
            detections = input_data.get('detections', [])
            if not isinstance(detections, list):
                return ProcessingResult(success=False, error="Detecções inválidas")
            
            # Filtrar apenas pessoas
            person_detections = [
                d for d in detections 
                if isinstance(d, Detection) and d.class_name in ['person', 'people']
            ]
            
            # Atualizar tracking (simplificado)
            current_people = self._update_tracking(person_detections)
            
            # Calcular estatísticas
            current_count = len(current_people)
            self.count_history.append({
                'timestamp': time.time(),
                'count': current_count
            })
            
            # Estatísticas de tendência
            trend = self._calculate_trend()
            avg_count = self._calculate_average_count()
            max_count = max((h['count'] for h in self.count_history), default=0)
            
            result_data = {
                'current_count': current_count,
                'people_positions': [
                    {
                        'id': person_id,
                        'bbox': person_data['bbox'],
                        'confidence': person_data['confidence'],
                        'center': person_data['center']
                    }
                    for person_id, person_data in current_people.items()
                ],
                'statistics': {
                    'trend': trend,
                    'average_count': avg_count,
                    'max_count': max_count,
                    'history_length': len(self.count_history)
                },
                'original_data': input_data
            }
            
            return ProcessingResult(
                success=True,
                data=result_data,
                metadata={
                    'current_count': current_count,
                    'trend': trend
                }
            )
            
        except Exception as e:
            error_msg = f"Erro na contagem de pessoas: {str(e)}"
            logger.error(error_msg)
            return ProcessingResult(success=False, error=error_msg)
    
    def _update_tracking(self, detections: List[Detection]) -> Dict[int, Dict[str, Any]]:
        """Atualiza o tracking de pessoas (algoritmo simplificado)."""
        current_people = {}
        max_distance = self.config.get('max_tracking_distance', 100)
        
        # Para cada detecção, tentar associar com pessoa existente
        for detection in detections:
            x1, y1, x2, y2 = detection.bbox
            center = ((x1 + x2) // 2, (y1 + y2) // 2)
            
            best_match_id = None
            best_distance = float('inf')
            
            # Procurar a pessoa mais próxima
            for person_id, person_data in self.person_tracker.items():
                if person_id in current_people:
                    continue  # Já associada
                
                prev_center = person_data['center']
                distance = math.sqrt(
                    (center[0] - prev_center[0]) ** 2 + 
                    (center[1] - prev_center[1]) ** 2
                )
                
                if distance < max_distance and distance < best_distance:
                    best_distance = distance
                    best_match_id = person_id
            
            # Se encontrou correspondência, atualizar
            if best_match_id:
                current_people[best_match_id] = {
                    'bbox': detection.bbox,
                    'confidence': detection.confidence,
                    'center': center,
                    'last_seen': time.time()
                }
            else:
                # Nova pessoa detectada
                new_id = self.next_person_id
                self.next_person_id += 1
                current_people[new_id] = {
                    'bbox': detection.bbox,
                    'confidence': detection.confidence,
                    'center': center,
                    'first_seen': time.time(),
                    'last_seen': time.time()
                }
        
        # Atualizar tracker principal
        self.person_tracker = current_people.copy()
        
        # Remover pessoas não vistas há muito tempo
        timeout = self.config.get('person_timeout', 5.0)
        current_time = time.time()
        self.person_tracker = {
            pid: pdata for pid, pdata in self.person_tracker.items()
            if current_time - pdata['last_seen'] < timeout
        }
        
        return current_people
    
    def _calculate_trend(self) -> str:
        """Calcula a tendência da contagem."""
        if len(self.count_history) < 5:
            return 'stable'
        
        recent_counts = [h['count'] for h in list(self.count_history)[-5:]]
        old_counts = [h['count'] for h in list(self.count_history)[-10:-5]] if len(self.count_history) >= 10 else recent_counts
        
        recent_avg = sum(recent_counts) / len(recent_counts)
        old_avg = sum(old_counts) / len(old_counts)
        
        diff_threshold = self.config.get('trend_threshold', 1.0)
        
        if recent_avg > old_avg + diff_threshold:
            return 'increasing'
        elif recent_avg < old_avg - diff_threshold:
            return 'decreasing'
        else:
            return 'stable'
    
    def _calculate_average_count(self) -> float:
        """Calcula a contagem média."""
        if not self.count_history:
            return 0.0
        return sum(h['count'] for h in self.count_history) / len(self.count_history)
    
    def cleanup(self):
        """Limpa recursos do contador."""
        self.person_tracker.clear()
        self.count_history.clear()
        logger.info(f"Recursos do contador de pessoas limpos para nó {self.node_id}")
    
    def get_input_types(self) -> List[str]:
        return ['detections']
    
    def get_output_types(self) -> List[str]:
        return ['analytics']


class LineCrossingNode(AnalyticsNode):
    """Nó para detecção de cruzamento de linhas."""
    
    def __init__(self, node_id: str, config: Dict[str, Any]):
        super().__init__(node_id, config)
        self.tracking_data = {}
        self.crossing_events = deque(maxlen=1000)
        self.lines = []
        
    def initialize(self) -> bool:
        """Inicializa o detector de cruzamento de linhas."""
        try:
            # Configurar linhas de detecção
            lines_config = self.config.get('lines', [])
            self.lines = []
            
            for line_config in lines_config:
                line = {
                    'id': line_config.get('id', f'line_{len(self.lines)}'),
                    'start': tuple(line_config['start']),  # (x1, y1)
                    'end': tuple(line_config['end']),      # (x2, y2)
                    'direction': line_config.get('direction', 'both'),  # 'both', 'forward', 'backward'
                    'name': line_config.get('name', f'Linha {len(self.lines) + 1}')
                }
                self.lines.append(line)
            
            if not self.lines:
                self.error_message = "Nenhuma linha configurada"
                return False
            
            self.is_initialized = True
            logger.info(f"Detector de cruzamento inicializado com {len(self.lines)} linhas")
            return True
            
        except Exception as e:
            self.error_message = f"Erro ao inicializar detector de linhas: {str(e)}"
            return False
    
    def process(self, input_data: Dict[str, Any]) -> ProcessingResult:
        """Processa detecção de cruzamento de linhas."""
        if not self.is_initialized:
            return ProcessingResult(success=False, error="Nó não inicializado")
        
        try:
            detections = input_data.get('detections', [])
            if not isinstance(detections, list):
                return ProcessingResult(success=False, error="Detecções inválidas")
            
            current_time = time.time()
            new_crossings = []
            
            # Processar cada detecção
            for detection in detections:
                if not isinstance(detection, Detection):
                    continue
                
                object_id = self._get_object_id(detection)
                center = self._get_center_point(detection.bbox)
                
                # Verificar cruzamentos para cada linha
                for line in self.lines:
                    crossing = self._check_line_crossing(object_id, center, line, current_time)
                    if crossing:
                        new_crossings.append(crossing)
                        self.crossing_events.append(crossing)
            
            # Estatísticas
            total_crossings = len(self.crossing_events)
            crossings_by_line = defaultdict(int)
            crossings_by_direction = defaultdict(int)
            
            for event in self.crossing_events:
                crossings_by_line[event['line_id']] += 1
                crossings_by_direction[event['direction']] += 1
            
            result_data = {
                'new_crossings': new_crossings,
                'total_crossings': total_crossings,
                'crossings_by_line': dict(crossings_by_line),
                'crossings_by_direction': dict(crossings_by_direction),
                'lines_config': self.lines,
                'original_data': input_data
            }
            
            return ProcessingResult(
                success=True,
                data=result_data,
                metadata={
                    'new_crossings_count': len(new_crossings),
                    'total_crossings': total_crossings
                }
            )
            
        except Exception as e:
            error_msg = f"Erro na detecção de cruzamento: {str(e)}"
            logger.error(error_msg)
            return ProcessingResult(success=False, error=error_msg)
    
    def _get_object_id(self, detection: Detection) -> str:
        """Gera ID único para o objeto (simplificado)."""
        # Em implementação real, usaria tracking mais sofisticado
        x1, y1, x2, y2 = detection.bbox
        return f"{detection.class_name}_{x1}_{y1}_{x2}_{y2}"
    
    def _get_center_point(self, bbox: Tuple[int, int, int, int]) -> Tuple[int, int]:
        """Calcula o ponto central da bbox."""
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) // 2, (y1 + y2) // 2)
    
    def _check_line_crossing(self, object_id: str, current_pos: Tuple[int, int], 
                           line: Dict[str, Any], timestamp: float) -> Optional[Dict[str, Any]]:
        """Verifica se houve cruzamento da linha."""
        if object_id not in self.tracking_data:
            # Primeira vez vendo este objeto
            self.tracking_data[object_id] = {
                'previous_pos': current_pos,
                'last_seen': timestamp
            }
            return None
        
        prev_pos = self.tracking_data[object_id]['previous_pos']
        
        # Verificar se houve cruzamento
        crossed, direction = self._line_intersection(prev_pos, current_pos, line['start'], line['end'])
        
        if crossed:
            # Verificar se a direção é permitida
            if line['direction'] == 'both' or line['direction'] == direction:
                crossing_event = {
                    'object_id': object_id,
                    'line_id': line['id'],
                    'line_name': line['name'],
                    'direction': direction,
                    'timestamp': timestamp,
                    'position': current_pos
                }
                
                # Atualizar posição
                self.tracking_data[object_id]['previous_pos'] = current_pos
                self.tracking_data[object_id]['last_seen'] = timestamp
                
                return crossing_event
        
        # Atualizar posição sem cruzamento
        self.tracking_data[object_id]['previous_pos'] = current_pos
        self.tracking_data[object_id]['last_seen'] = timestamp
        
        return None
    
    def _line_intersection(self, p1: Tuple[int, int], p2: Tuple[int, int], 
                          p3: Tuple[int, int], p4: Tuple[int, int]) -> Tuple[bool, str]:
        """Verifica interseção entre duas linhas e determina direção."""
        x1, y1 = p1
        x2, y2 = p2
        x3, y3 = p3
        x4, y4 = p4
        
        # Verificar se as linhas se intersectam
        denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
        if abs(denom) < 1e-10:
            return False, 'none'  # Linhas paralelas
        
        t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
        u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
        
        if 0 <= t <= 1 and 0 <= u <= 1:
            # Determinar direção do cruzamento
            # Produto vetorial para determinar o lado
            cross_product = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3)
            direction = 'forward' if cross_product > 0 else 'backward'
            return True, direction
        
        return False, 'none'
    
    def cleanup(self):
        """Limpa recursos do detector."""
        self.tracking_data.clear()
        self.crossing_events.clear()
        logger.info(f"Recursos do detector de cruzamento limpos para nó {self.node_id}")
    
    def get_input_types(self) -> List[str]:
        return ['detections']
    
    def get_output_types(self) -> List[str]:
        return ['analytics']


class AreaIntrusionNode(AnalyticsNode):
    """Nó para detecção de intrusão em áreas."""
    
    def __init__(self, node_id: str, config: Dict[str, Any]):
        super().__init__(node_id, config)
        self.zones = []
        self.intrusion_events = deque(maxlen=1000)
        self.active_intrusions = {}
        
    def initialize(self) -> bool:
        """Inicializa o detector de intrusão."""
        try:
            zones_config = self.config.get('zones', [])
            self.zones = []
            
            for zone_config in zones_config:
                zone = {
                    'id': zone_config.get('id', f'zone_{len(self.zones)}'),
                    'name': zone_config.get('name', f'Zona {len(self.zones) + 1}'),
                    'polygon': zone_config['polygon'],  # Lista de pontos [(x1,y1), (x2,y2), ...]
                    'allowed_classes': zone_config.get('allowed_classes', []),
                    'alert_threshold': zone_config.get('alert_threshold', 1),  # Mínimo de objetos para alerta
                    'sensitivity': zone_config.get('sensitivity', 'medium')
                }
                self.zones.append(zone)
            
            if not self.zones:
                self.error_message = "Nenhuma zona configurada"
                return False
            
            self.is_initialized = True
            logger.info(f"Detector de intrusão inicializado com {len(self.zones)} zonas")
            return True
            
        except Exception as e:
            self.error_message = f"Erro ao inicializar detector de intrusão: {str(e)}"
            return False
    
    def process(self, input_data: Dict[str, Any]) -> ProcessingResult:
        """Processa detecção de intrusão em áreas."""
        if not self.is_initialized:
            return ProcessingResult(success=False, error="Nó não inicializado")
        
        try:
            detections = input_data.get('detections', [])
            if not isinstance(detections, list):
                return ProcessingResult(success=False, error="Detecções inválidas")
            
            current_time = time.time()
            new_intrusions = []
            zone_status = {}
            
            # Verificar cada zona
            for zone in self.zones:
                objects_in_zone = []
                
                # Verificar cada detecção
                for detection in detections:
                    if not isinstance(detection, Detection):
                        continue
                    
                    center = self._get_center_point(detection.bbox)
                    
                    # Verificar se está dentro da zona
                    if self._point_in_polygon(center, zone['polygon']):
                        # Verificar se classe é permitida
                        if (not zone['allowed_classes'] or 
                            detection.class_name in zone['allowed_classes']):
                            continue  # Classe permitida, não é intrusão
                        
                        objects_in_zone.append({
                            'detection': detection,
                            'center': center
                        })
                
                # Verificar se excede threshold
                intrusion_count = len(objects_in_zone)
                zone_id = zone['id']
                
                zone_status[zone_id] = {
                    'name': zone['name'],
                    'objects_count': intrusion_count,
                    'is_violated': intrusion_count >= zone['alert_threshold'],
                    'objects': objects_in_zone
                }
                
                # Gerar evento de intrusão se necessário
                if intrusion_count >= zone['alert_threshold']:
                    # Verificar se já está ativa
                    if zone_id not in self.active_intrusions:
                        intrusion_event = {
                            'zone_id': zone_id,
                            'zone_name': zone['name'],
                            'objects_count': intrusion_count,
                            'objects': [obj['detection'].class_name for obj in objects_in_zone],
                            'timestamp': current_time,
                            'severity': self._calculate_severity(intrusion_count, zone)
                        }
                        
                        new_intrusions.append(intrusion_event)
                        self.intrusion_events.append(intrusion_event)
                        self.active_intrusions[zone_id] = current_time
                else:
                    # Remover da lista de intrusões ativas
                    if zone_id in self.active_intrusions:
                        del self.active_intrusions[zone_id]
            
            # Estatísticas
            total_intrusions = len(self.intrusion_events)
            active_zones = len([z for z in zone_status.values() if z['is_violated']])
            
            result_data = {
                'new_intrusions': new_intrusions,
                'zone_status': zone_status,
                'active_intrusions_count': active_zones,
                'total_intrusions': total_intrusions,
                'zones_config': self.zones,
                'original_data': input_data
            }
            
            return ProcessingResult(
                success=True,
                data=result_data,
                metadata={
                    'new_intrusions_count': len(new_intrusions),
                    'active_zones': active_zones
                }
            )
            
        except Exception as e:
            error_msg = f"Erro na detecção de intrusão: {str(e)}"
            logger.error(error_msg)
            return ProcessingResult(success=False, error=error_msg)
    
    def _get_center_point(self, bbox: Tuple[int, int, int, int]) -> Tuple[int, int]:
        """Calcula o ponto central da bbox."""
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) // 2, (y1 + y2) // 2)
    
    def _point_in_polygon(self, point: Tuple[int, int], polygon: List[Tuple[int, int]]) -> bool:
        """Verifica se um ponto está dentro de um polígono usando ray casting."""
        x, y = point
        n = len(polygon)
        inside = False
        
        p1x, p1y = polygon[0]
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside
    
    def _calculate_severity(self, objects_count: int, zone: Dict[str, Any]) -> str:
        """Calcula a severidade da intrusão."""
        threshold = zone['alert_threshold']
        sensitivity = zone['sensitivity']
        
        if sensitivity == 'high':
            multiplier = 1.5
        elif sensitivity == 'low':
            multiplier = 3.0
        else:  # medium
            multiplier = 2.0
        
        if objects_count >= threshold * multiplier:
            return 'critical'
        elif objects_count >= threshold * 1.5:
            return 'high'
        else:
            return 'medium'
    
    def cleanup(self):
        """Limpa recursos do detector."""
        self.intrusion_events.clear()
        self.active_intrusions.clear()
        logger.info(f"Recursos do detector de intrusão limpos para nó {self.node_id}")
    
    def get_input_types(self) -> List[str]:
        return ['detections']
    
    def get_output_types(self) -> List[str]:
        return ['analytics']
