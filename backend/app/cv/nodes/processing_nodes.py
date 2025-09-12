"""
Nós de processamento para Computer Vision.
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Optional
import torch
from ultralytics import YOLO
import logging
import time

from .base import ProcessingNode, FrameData, Detection, ProcessingResult

logger = logging.getLogger(__name__)


class YOLODetectionNode(ProcessingNode):
    """Nó para detecção de objetos usando YOLO."""
    
    def __init__(self, node_id: str, config: Dict[str, Any]):
        super().__init__(node_id, config)
        self.model = None
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
    def initialize(self) -> bool:
        """Inicializa o modelo YOLO."""
        try:
            model_name = self.config.get('model', 'yolov8n.pt')
            self.model = YOLO(model_name)
            
            # Warm up do modelo
            dummy_input = np.zeros((640, 640, 3), dtype=np.uint8)
            self.model(dummy_input, verbose=False)
            
            self.is_initialized = True
            logger.info(f"Modelo YOLO inicializado: {model_name} no dispositivo {self.device}")
            return True
            
        except Exception as e:
            self.error_message = f"Erro ao inicializar YOLO: {str(e)}"
            logger.error(self.error_message)
            return False
    
    def process(self, input_data: FrameData) -> ProcessingResult:
        """Processa detecção de objetos no frame."""
        if not self.is_initialized or not isinstance(input_data, FrameData):
            return ProcessingResult(success=False, error="Nó não inicializado ou dados inválidos")
        
        try:
            frame = input_data.frame
            confidence_threshold = self.config.get('confidence_threshold', 0.5)
            iou_threshold = self.config.get('iou_threshold', 0.45)
            
            # Executar inferência
            results = self.model(
                frame,
                conf=confidence_threshold,
                iou=iou_threshold,
                verbose=False
            )
            
            detections = []
            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes
                
                for i in range(len(boxes)):
                    box = boxes[i]
                    
                    # Coordenadas da bbox
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                    confidence = box.conf[0].cpu().numpy().item()
                    class_id = int(box.cls[0].cpu().numpy().item())
                    class_name = self.model.names[class_id]
                    
                    detection = Detection(
                        class_id=class_id,
                        class_name=class_name,
                        confidence=confidence,
                        bbox=(x1, y1, x2, y2),
                        metadata={
                            'model': 'YOLO',
                            'frame_id': input_data.frame_id,
                            'timestamp': input_data.timestamp
                        }
                    )
                    detections.append(detection)
            
            # Criar frame de saída com detecções desenhadas se configurado
            output_frame = frame.copy()
            if self.config.get('draw_detections', True):
                output_frame = self._draw_detections(output_frame, detections)
            
            result_data = {
                'frame': output_frame,
                'detections': detections,
                'original_frame': input_data,
                'processing_time': time.time() - input_data.timestamp
            }
            
            return ProcessingResult(
                success=True,
                data=result_data,
                metadata={
                    'detections_count': len(detections),
                    'classes_detected': list(set(d.class_name for d in detections))
                }
            )
            
        except Exception as e:
            error_msg = f"Erro no processamento YOLO: {str(e)}"
            logger.error(error_msg)
            return ProcessingResult(success=False, error=error_msg)
    
    def _draw_detections(self, frame: np.ndarray, detections: List[Detection]) -> np.ndarray:
        """Desenha as detecções no frame."""
        for det in detections:
            x1, y1, x2, y2 = det.bbox
            
            # Desenhar bbox
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Desenhar label
            label = f"{det.class_name}: {det.confidence:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            cv2.rectangle(frame, (x1, y1 - label_size[1] - 10), 
                         (x1 + label_size[0], y1), (0, 255, 0), -1)
            cv2.putText(frame, label, (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
        
        return frame
    
    def cleanup(self):
        """Limpa recursos do modelo."""
        if self.model:
            del self.model
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        logger.info(f"Recursos YOLO limpos para nó {self.node_id}")
    
    def get_input_types(self) -> List[str]:
        return ['video']
    
    def get_output_types(self) -> List[str]:
        return ['video', 'detections']


class FaceDetectionNode(ProcessingNode):
    """Nó para detecção de faces usando OpenCV."""
    
    def __init__(self, node_id: str, config: Dict[str, Any]):
        super().__init__(node_id, config)
        self.face_cascade = None
        self.eye_cascade = None
        
    def initialize(self) -> bool:
        """Inicializa os classificadores de face."""
        try:
            # Carregar classificadores Haar Cascade
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            if self.config.get('detect_eyes', False):
                self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
            
            self.is_initialized = True
            logger.info(f"Detector de faces inicializado para nó {self.node_id}")
            return True
            
        except Exception as e:
            self.error_message = f"Erro ao inicializar detector de faces: {str(e)}"
            logger.error(self.error_message)
            return False
    
    def process(self, input_data: FrameData) -> ProcessingResult:
        """Processa detecção de faces no frame."""
        if not self.is_initialized or not isinstance(input_data, FrameData):
            return ProcessingResult(success=False, error="Nó não inicializado ou dados inválidos")
        
        try:
            frame = input_data.frame
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Parâmetros de detecção
            scale_factor = self.config.get('scale_factor', 1.1)
            min_neighbors = self.config.get('min_neighbors', 5)
            min_size = self.config.get('min_size', (30, 30))
            
            # Detectar faces
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=scale_factor,
                minNeighbors=min_neighbors,
                minSize=min_size
            )
            
            detections = []
            for (x, y, w, h) in faces:
                detection = Detection(
                    class_id=0,  # Face class
                    class_name='face',
                    confidence=1.0,  # Haar cascades não fornecem confidence
                    bbox=(x, y, x + w, y + h),
                    metadata={
                        'model': 'OpenCV_HaarCascade',
                        'frame_id': input_data.frame_id,
                        'timestamp': input_data.timestamp
                    }
                )
                
                # Detectar olhos se configurado
                if self.eye_cascade:
                    roi_gray = gray[y:y+h, x:x+w]
                    eyes = self.eye_cascade.detectMultiScale(roi_gray)
                    detection.metadata['eyes_count'] = len(eyes)
                    detection.keypoints = [(x + ex + ew//2, y + ey + eh//2) for (ex, ey, ew, eh) in eyes]
                
                detections.append(detection)
            
            # Criar frame de saída com detecções
            output_frame = frame.copy()
            if self.config.get('draw_detections', True):
                output_frame = self._draw_face_detections(output_frame, detections)
            
            result_data = {
                'frame': output_frame,
                'detections': detections,
                'original_frame': input_data,
                'processing_time': time.time() - input_data.timestamp
            }
            
            return ProcessingResult(
                success=True,
                data=result_data,
                metadata={
                    'faces_count': len(detections)
                }
            )
            
        except Exception as e:
            error_msg = f"Erro na detecção de faces: {str(e)}"
            logger.error(error_msg)
            return ProcessingResult(success=False, error=error_msg)
    
    def _draw_face_detections(self, frame: np.ndarray, detections: List[Detection]) -> np.ndarray:
        """Desenha as detecções de face no frame."""
        for det in detections:
            x1, y1, x2, y2 = det.bbox
            
            # Desenhar retângulo da face
            cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)
            
            # Desenhar olhos se disponíveis
            if det.keypoints:
                for (ex, ey) in det.keypoints:
                    cv2.circle(frame, (ex, ey), 3, (0, 255, 0), -1)
            
            # Label
            label = f"Face: {det.confidence:.2f}"
            cv2.putText(frame, label, (x1, y1 - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
        
        return frame
    
    def cleanup(self):
        """Limpa recursos do detector."""
        self.face_cascade = None
        self.eye_cascade = None
        logger.info(f"Recursos do detector de faces limpos para nó {self.node_id}")
    
    def get_input_types(self) -> List[str]:
        return ['video']
    
    def get_output_types(self) -> List[str]:
        return ['video', 'detections']


class MotionDetectionNode(ProcessingNode):
    """Nó para detecção de movimento."""
    
    def __init__(self, node_id: str, config: Dict[str, Any]):
        super().__init__(node_id, config)
        self.background_subtractor = None
        self.previous_frame = None
        
    def initialize(self) -> bool:
        """Inicializa o detector de movimento."""
        try:
            method = self.config.get('method', 'MOG2')
            
            if method == 'MOG2':
                history = self.config.get('history', 500)
                var_threshold = self.config.get('var_threshold', 16)
                detect_shadows = self.config.get('detect_shadows', True)
                self.background_subtractor = cv2.createBackgroundSubtractorMOG2(
                    history=history,
                    varThreshold=var_threshold,
                    detectShadows=detect_shadows
                )
            elif method == 'KNN':
                history = self.config.get('history', 500)
                dist2_threshold = self.config.get('dist2_threshold', 400)
                detect_shadows = self.config.get('detect_shadows', True)
                self.background_subtractor = cv2.createBackgroundSubtractorKNN(
                    history=history,
                    dist2Threshold=dist2_threshold,
                    detectShadows=detect_shadows
                )
            else:
                self.error_message = f"Método não suportado: {method}"
                return False
            
            self.is_initialized = True
            logger.info(f"Detector de movimento inicializado: {method}")
            return True
            
        except Exception as e:
            self.error_message = f"Erro ao inicializar detector de movimento: {str(e)}"
            logger.error(self.error_message)
            return False
    
    def process(self, input_data: FrameData) -> ProcessingResult:
        """Processa detecção de movimento no frame."""
        if not self.is_initialized or not isinstance(input_data, FrameData):
            return ProcessingResult(success=False, error="Nó não inicializado ou dados inválidos")
        
        try:
            frame = input_data.frame
            
            # Aplicar background subtraction
            fg_mask = self.background_subtractor.apply(frame)
            
            # Filtros morfológicos para reduzir ruído
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
            
            # Encontrar contornos
            contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filtrar contornos por área mínima
            min_area = self.config.get('min_area', 500)
            motion_detections = []
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > min_area:
                    x, y, w, h = cv2.boundingRect(contour)
                    
                    detection = Detection(
                        class_id=0,
                        class_name='motion',
                        confidence=min(area / 10000, 1.0),  # Confidence baseada na área
                        bbox=(x, y, x + w, y + h),
                        metadata={
                            'area': area,
                            'contour_points': len(contour),
                            'frame_id': input_data.frame_id,
                            'timestamp': input_data.timestamp
                        }
                    )
                    motion_detections.append(detection)
            
            # Frame de saída
            output_frame = frame.copy()
            if self.config.get('draw_detections', True):
                output_frame = self._draw_motion_detections(output_frame, motion_detections, fg_mask)
            
            result_data = {
                'frame': output_frame,
                'detections': motion_detections,
                'motion_mask': fg_mask,
                'original_frame': input_data,
                'processing_time': time.time() - input_data.timestamp
            }
            
            return ProcessingResult(
                success=True,
                data=result_data,
                metadata={
                    'motion_areas': len(motion_detections),
                    'total_motion_area': sum(d.metadata['area'] for d in motion_detections)
                }
            )
            
        except Exception as e:
            error_msg = f"Erro na detecção de movimento: {str(e)}"
            logger.error(error_msg)
            return ProcessingResult(success=False, error=error_msg)
    
    def _draw_motion_detections(self, frame: np.ndarray, detections: List[Detection], mask: np.ndarray) -> np.ndarray:
        """Desenha as detecções de movimento no frame."""
        # Overlay da máscara de movimento
        if self.config.get('show_mask', False):
            mask_colored = cv2.applyColorMap(mask, cv2.COLORMAP_JET)
            frame = cv2.addWeighted(frame, 0.7, mask_colored, 0.3, 0)
        
        # Desenhar bounding boxes
        for det in detections:
            x1, y1, x2, y2 = det.bbox
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 255), 2)
            
            label = f"Motion: {det.metadata['area']:.0f}px²"
            cv2.putText(frame, label, (x1, y1 - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
        
        return frame
    
    def cleanup(self):
        """Limpa recursos do detector."""
        self.background_subtractor = None
        self.previous_frame = None
        logger.info(f"Recursos do detector de movimento limpos para nó {self.node_id}")
    
    def get_input_types(self) -> List[str]:
        return ['video']
    
    def get_output_types(self) -> List[str]:
        return ['video', 'detections']
