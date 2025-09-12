"""
Nós de entrada para pipelines de Computer Vision.
"""

import cv2
import numpy as np
from typing import Optional, Dict, Any
import threading
import time
from queue import Queue, Empty
import logging

from .base import InputNode, FrameData, ProcessingResult

logger = logging.getLogger(__name__)


class CameraInputNode(InputNode):
    """Nó para entrada de vídeo via câmera RTSP ou local."""
    
    def __init__(self, node_id: str, config: Dict[str, Any]):
        super().__init__(node_id, config)
        self.cap = None
        self.frame_queue = Queue(maxsize=config.get('buffer_size', 10))
        self.capture_thread = None
        self.stop_event = threading.Event()
        self.frame_counter = 0
        
    def initialize(self) -> bool:
        """Inicializa a conexão com a câmera."""
        try:
            source = self.config.get('rtsp_url') or self.config.get('device_index', 0)
            self.cap = cv2.VideoCapture(source)
            
            if not self.cap.isOpened():
                self.error_message = f"Não foi possível abrir a fonte de vídeo: {source}"
                return False
            
            # Configurar resolução se especificada
            if 'resolution' in self.config:
                width, height = map(int, self.config['resolution'].split('x'))
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
            
            # Configurar FPS se especificado
            if 'fps' in self.config:
                self.cap.set(cv2.CAP_PROP_FPS, self.config['fps'])
            
            self.is_initialized = True
            logger.info(f"Câmera inicializada: {source}")
            return True
            
        except Exception as e:
            self.error_message = f"Erro ao inicializar câmera: {str(e)}"
            logger.error(self.error_message)
            return False
    
    def process(self, input_data: Any) -> ProcessingResult:
        """Nós de entrada não processam dados externos."""
        return ProcessingResult(success=False, error="Nós de entrada não processam dados")
    
    def start_stream(self):
        """Inicia a captura de frames em thread separada."""
        if not self.is_initialized:
            return
            
        self.stop_event.clear()
        self.capture_thread = threading.Thread(target=self._capture_frames)
        self.capture_thread.daemon = True
        self.capture_thread.start()
        self.is_running = True
        logger.info(f"Stream iniciado para nó {self.node_id}")
    
    def stop_stream(self):
        """Para a captura de frames."""
        self.stop_event.set()
        if self.capture_thread:
            self.capture_thread.join(timeout=2.0)
        self.is_running = False
        logger.info(f"Stream parado para nó {self.node_id}")
    
    def _capture_frames(self):
        """Loop de captura de frames (executado em thread separada)."""
        target_fps = self.config.get('fps', 30)
        frame_interval = 1.0 / target_fps
        
        while not self.stop_event.is_set():
            start_time = time.time()
            
            ret, frame = self.cap.read()
            if not ret:
                # Tentar reconectar se configurado
                if self.config.get('reconnect_attempts', 0) > 0:
                    self._attempt_reconnect()
                    continue
                else:
                    break
            
            frame_data = FrameData(
                frame=frame,
                timestamp=time.time(),
                frame_id=self.frame_counter,
                source_id=self.node_id
            )
            
            # Adicionar frame à queue (descartar se cheia)
            try:
                self.frame_queue.put_nowait(frame_data)
                self.frame_counter += 1
            except:
                # Queue cheia, descartar frame mais antigo
                try:
                    self.frame_queue.get_nowait()
                    self.frame_queue.put_nowait(frame_data)
                except Empty:
                    pass
            
            # Controle de FPS
            elapsed = time.time() - start_time
            sleep_time = frame_interval - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)
    
    def _attempt_reconnect(self):
        """Tenta reconectar à fonte de vídeo."""
        attempts = self.config.get('reconnect_attempts', 3)
        for i in range(attempts):
            try:
                self.cap.release()
                time.sleep(1)
                source = self.config.get('rtsp_url') or self.config.get('device_index', 0)
                self.cap = cv2.VideoCapture(source)
                if self.cap.isOpened():
                    logger.info(f"Reconectado à câmera após {i+1} tentativas")
                    return True
            except Exception as e:
                logger.warning(f"Tentativa de reconexão {i+1} falhou: {str(e)}")
                time.sleep(2)
        
        logger.error(f"Falha ao reconectar após {attempts} tentativas")
        return False
    
    def get_next_frame(self) -> Optional[FrameData]:
        """Obtém o próximo frame disponível."""
        try:
            return self.frame_queue.get_nowait()
        except Empty:
            return None
    
    def cleanup(self):
        """Limpa recursos da câmera."""
        self.stop_stream()
        if self.cap:
            self.cap.release()
        logger.info(f"Recursos limpos para nó {self.node_id}")
    
    def get_output_types(self) -> list[str]:
        return ['video']


class VideoFileInputNode(InputNode):
    """Nó para entrada de arquivo de vídeo."""
    
    def __init__(self, node_id: str, config: Dict[str, Any]):
        super().__init__(node_id, config)
        self.cap = None
        self.total_frames = 0
        self.current_frame = 0
        self.fps = 30
        self.is_looping = config.get('loop', False)
        
    def initialize(self) -> bool:
        """Inicializa o arquivo de vídeo."""
        try:
            video_path = self.config.get('file_path')
            if not video_path:
                self.error_message = "Caminho do arquivo não especificado"
                return False
            
            self.cap = cv2.VideoCapture(video_path)
            if not self.cap.isOpened():
                self.error_message = f"Não foi possível abrir o arquivo: {video_path}"
                return False
            
            self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
            self.fps = self.cap.get(cv2.CAP_PROP_FPS)
            
            self.is_initialized = True
            logger.info(f"Arquivo de vídeo inicializado: {video_path}")
            return True
            
        except Exception as e:
            self.error_message = f"Erro ao inicializar arquivo: {str(e)}"
            logger.error(self.error_message)
            return False
    
    def process(self, input_data: Any) -> ProcessingResult:
        """Nós de entrada não processam dados externos."""
        return ProcessingResult(success=False, error="Nós de entrada não processam dados")
    
    def start_stream(self):
        """Inicia a reprodução do vídeo."""
        self.is_running = True
        self.current_frame = 0
        logger.info(f"Reprodução iniciada para nó {self.node_id}")
    
    def stop_stream(self):
        """Para a reprodução do vídeo."""
        self.is_running = False
        logger.info(f"Reprodução parada para nó {self.node_id}")
    
    def get_next_frame(self) -> Optional[FrameData]:
        """Obtém o próximo frame do vídeo."""
        if not self.is_running or not self.is_initialized:
            return None
        
        ret, frame = self.cap.read()
        if not ret:
            if self.is_looping:
                # Reiniciar do início
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                self.current_frame = 0
                ret, frame = self.cap.read()
            else:
                # Fim do arquivo
                self.is_running = False
                return None
        
        if ret:
            frame_data = FrameData(
                frame=frame,
                timestamp=time.time(),
                frame_id=self.current_frame,
                source_id=self.node_id,
                metadata={
                    'total_frames': self.total_frames,
                    'progress': self.current_frame / self.total_frames
                }
            )
            self.current_frame += 1
            return frame_data
        
        return None
    
    def cleanup(self):
        """Limpa recursos do arquivo."""
        self.stop_stream()
        if self.cap:
            self.cap.release()
        logger.info(f"Recursos limpos para nó {self.node_id}")
    
    def get_output_types(self) -> list[str]:
        return ['video']
