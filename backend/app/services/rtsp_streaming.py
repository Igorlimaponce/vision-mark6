"""
Sistema de streaming RTSP para captura de vídeo em tempo real
Suporta múltiplos streams simultâneos com processamento otimizado
"""

import cv2
import numpy as np
import threading
import time
import logging
import queue
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass
from enum import Enum
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class StreamStatus(Enum):
    """Status possíveis do stream"""
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    ERROR = "error"
    RECONNECTING = "reconnecting"

@dataclass
class StreamConfig:
    """Configuração de um stream RTSP"""
    stream_id: str
    rtsp_url: str
    fps: int = 30
    width: Optional[int] = None
    height: Optional[int] = None
    buffer_size: int = 10
    reconnect_interval: int = 5
    max_reconnect_attempts: int = 10
    timeout: int = 30

class RTSPStream:
    """
    Classe para gerenciar um stream RTSP individual
    """
    
    def __init__(self, config: StreamConfig):
        """
        Inicializar stream RTSP
        
        Args:
            config: Configuração do stream
        """
        self.config = config
        self.status = StreamStatus.STOPPED
        self.cap: Optional[cv2.VideoCapture] = None
        
        # Threading
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._frame_lock = threading.Lock()
        
        # Frame buffer
        self._frame_buffer: queue.Queue = queue.Queue(maxsize=config.buffer_size)
        self._current_frame: Optional[np.ndarray] = None
        self._frame_timestamp: float = 0.0
        self._frame_count: int = 0
        
        # Callbacks
        self._frame_callbacks: List[Callable[[np.ndarray, Dict[str, Any]], None]] = []
        self._status_callbacks: List[Callable[[StreamStatus, str], None]] = []
        
        # Estatísticas
        self._stats = {
            'frames_captured': 0,
            'frames_dropped': 0,
            'fps_actual': 0.0,
            'last_frame_time': 0.0,
            'reconnect_count': 0,
            'total_uptime': 0.0,
            'start_time': 0.0
        }
        
    def add_frame_callback(self, callback: Callable[[np.ndarray, Dict[str, Any]], None]):
        """Adicionar callback para frames"""
        self._frame_callbacks.append(callback)
        
    def add_status_callback(self, callback: Callable[[StreamStatus, str], None]):
        """Adicionar callback para mudanças de status"""
        self._status_callbacks.append(callback)
        
    def _notify_status_change(self, status: StreamStatus, message: str = ""):
        """Notificar mudança de status"""
        self.status = status
        for callback in self._status_callbacks:
            try:
                callback(status, message)
            except Exception as e:
                logger.error(f"Erro em callback de status: {e}")
                
    def _notify_frame(self, frame: np.ndarray):
        """Notificar novo frame"""
        frame_info = {
            'stream_id': self.config.stream_id,
            'timestamp': time.time(),
            'frame_count': self._frame_count,
            'fps': self._stats['fps_actual']
        }
        
        for callback in self._frame_callbacks:
            try:
                callback(frame.copy(), frame_info)
            except Exception as e:
                logger.error(f"Erro em callback de frame: {e}")
                
    def start(self) -> bool:
        """
        Iniciar stream
        
        Returns:
            bool: True se iniciado com sucesso
        """
        if self.status == StreamStatus.RUNNING:
            logger.warning(f"Stream {self.config.stream_id} já está rodando")
            return True
            
        logger.info(f"Iniciando stream {self.config.stream_id}: {self.config.rtsp_url}")
        
        self._stop_event.clear()
        self._stats['start_time'] = time.time()
        
        # Criar thread de captura
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()
        
        return True
        
    def stop(self):
        """Parar stream"""
        logger.info(f"Parando stream {self.config.stream_id}")
        
        self._stop_event.set()
        
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)
            
        self._cleanup_capture()
        self._notify_status_change(StreamStatus.STOPPED)
        
    def _capture_loop(self):
        """Loop principal de captura"""
        reconnect_attempts = 0
        
        while not self._stop_event.is_set():
            try:
                self._notify_status_change(StreamStatus.STARTING, "Conectando ao stream...")
                
                # Inicializar captura
                if not self._init_capture():
                    if reconnect_attempts < self.config.max_reconnect_attempts:
                        reconnect_attempts += 1
                        self._notify_status_change(
                            StreamStatus.RECONNECTING, 
                            f"Tentativa de reconexão {reconnect_attempts}/{self.config.max_reconnect_attempts}"
                        )
                        time.sleep(self.config.reconnect_interval)
                        continue
                    else:
                        self._notify_status_change(StreamStatus.ERROR, "Máximo de tentativas de reconexão atingido")
                        break
                
                # Reset contador de reconexão
                reconnect_attempts = 0
                self._stats['reconnect_count'] += 1 if self._stats['reconnect_count'] > 0 else 0
                
                self._notify_status_change(StreamStatus.RUNNING, "Stream ativo")
                
                # Loop de captura de frames
                self._frame_capture_loop()
                
            except Exception as e:
                logger.error(f"Erro no stream {self.config.stream_id}: {e}")
                self._notify_status_change(StreamStatus.ERROR, str(e))
                
                if reconnect_attempts < self.config.max_reconnect_attempts:
                    reconnect_attempts += 1
                    time.sleep(self.config.reconnect_interval)
                else:
                    break
                    
            finally:
                self._cleanup_capture()
                
    def _init_capture(self) -> bool:
        """Inicializar captura de vídeo"""
        try:
            self.cap = cv2.VideoCapture(self.config.rtsp_url)
            
            # Configurar timeout
            self.cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, self.config.timeout * 1000)
            self.cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, self.config.timeout * 1000)
            
            # Configurar buffer
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            # Configurar resolução se especificada
            if self.config.width and self.config.height:
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.config.width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.config.height)
                
            # Configurar FPS
            self.cap.set(cv2.CAP_PROP_FPS, self.config.fps)
            
            # Testar captura
            if not self.cap.isOpened():
                logger.error(f"Falha ao abrir stream: {self.config.rtsp_url}")
                return False
                
            # Testar primeiro frame
            ret, frame = self.cap.read()
            if not ret or frame is None:
                logger.error(f"Falha ao ler primeiro frame do stream: {self.config.rtsp_url}")
                return False
                
            logger.info(f"Stream inicializado: {self.config.stream_id} - {frame.shape}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao inicializar captura: {e}")
            return False
            
    def _frame_capture_loop(self):
        """Loop de captura de frames"""
        fps_counter = 0
        fps_start_time = time.time()
        target_frame_time = 1.0 / self.config.fps
        
        while not self._stop_event.is_set() and self.cap and self.cap.isOpened():
            try:
                frame_start_time = time.time()
                
                # Capturar frame
                ret, frame = self.cap.read()
                
                if not ret or frame is None:
                    logger.warning(f"Falha ao ler frame do stream {self.config.stream_id}")
                    break
                    
                # Atualizar estatísticas
                self._frame_count += 1
                self._stats['frames_captured'] += 1
                self._stats['last_frame_time'] = time.time()
                
                # Calcular FPS real
                fps_counter += 1
                if fps_counter >= 30:  # Calcular FPS a cada 30 frames
                    elapsed = time.time() - fps_start_time
                    self._stats['fps_actual'] = fps_counter / elapsed
                    fps_counter = 0
                    fps_start_time = time.time()
                
                # Atualizar frame atual
                with self._frame_lock:
                    self._current_frame = frame.copy()
                    self._frame_timestamp = time.time()
                
                # Adicionar ao buffer (não-bloqueante)
                try:
                    self._frame_buffer.put_nowait(frame.copy())
                except queue.Full:
                    # Buffer cheio - remover frame mais antigo
                    try:
                        self._frame_buffer.get_nowait()
                        self._frame_buffer.put_nowait(frame.copy())
                        self._stats['frames_dropped'] += 1
                    except queue.Empty:
                        pass
                
                # Notificar callbacks
                self._notify_frame(frame)
                
                # Controlar FPS
                processing_time = time.time() - frame_start_time
                sleep_time = target_frame_time - processing_time
                if sleep_time > 0:
                    time.sleep(sleep_time)
                    
            except Exception as e:
                logger.error(f"Erro na captura de frame: {e}")
                break
                
    def _cleanup_capture(self):
        """Limpar recursos de captura"""
        if self.cap:
            self.cap.release()
            self.cap = None
            
    def get_current_frame(self) -> Optional[np.ndarray]:
        """
        Obter frame atual
        
        Returns:
            Frame mais recente ou None
        """
        with self._frame_lock:
            if self._current_frame is not None:
                return self._current_frame.copy()
            return None
            
    def get_frame_from_buffer(self, timeout: float = 1.0) -> Optional[np.ndarray]:
        """
        Obter frame do buffer
        
        Args:
            timeout: Timeout em segundos
            
        Returns:
            Frame do buffer ou None
        """
        try:
            frame = self._frame_buffer.get(timeout=timeout)
            return frame
        except queue.Empty:
            return None
            
    def get_stats(self) -> Dict[str, Any]:
        """
        Obter estatísticas do stream
        
        Returns:
            Dicionário com estatísticas
        """
        current_time = time.time()
        if self._stats['start_time'] > 0:
            self._stats['total_uptime'] = current_time - self._stats['start_time']
            
        return {
            **self._stats,
            'status': self.status.value,
            'config': {
                'stream_id': self.config.stream_id,
                'rtsp_url': self.config.rtsp_url,
                'fps_target': self.config.fps,
                'buffer_size': self.config.buffer_size
            },
            'frame_info': {
                'current_frame_age': current_time - self._frame_timestamp if self._frame_timestamp > 0 else 0,
                'buffer_size': self._frame_buffer.qsize(),
                'frame_count': self._frame_count
            }
        }

class RTSPStreamManager:
    """
    Gerenciador de múltiplos streams RTSP
    """
    
    def __init__(self):
        """Inicializar gerenciador de streams"""
        self.streams: Dict[str, RTSPStream] = {}
        self._lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=10)
        
    def create_stream(self, config: StreamConfig) -> bool:
        """
        Criar novo stream
        
        Args:
            config: Configuração do stream
            
        Returns:
            bool: True se criado com sucesso
        """
        with self._lock:
            if config.stream_id in self.streams:
                logger.warning(f"Stream já existe: {config.stream_id}")
                return False
                
            stream = RTSPStream(config)
            self.streams[config.stream_id] = stream
            
            logger.info(f"Stream criado: {config.stream_id}")
            return True
            
    def start_stream(self, stream_id: str) -> bool:
        """
        Iniciar stream específico
        
        Args:
            stream_id: ID do stream
            
        Returns:
            bool: True se iniciado com sucesso
        """
        with self._lock:
            if stream_id not in self.streams:
                logger.error(f"Stream não encontrado: {stream_id}")
                return False
                
            return self.streams[stream_id].start()
            
    def stop_stream(self, stream_id: str) -> bool:
        """
        Parar stream específico
        
        Args:
            stream_id: ID do stream
            
        Returns:
            bool: True se parado com sucesso
        """
        with self._lock:
            if stream_id not in self.streams:
                logger.error(f"Stream não encontrado: {stream_id}")
                return False
                
            self.streams[stream_id].stop()
            return True
            
    def remove_stream(self, stream_id: str) -> bool:
        """
        Remover stream
        
        Args:
            stream_id: ID do stream
            
        Returns:
            bool: True se removido com sucesso
        """
        with self._lock:
            if stream_id not in self.streams:
                logger.error(f"Stream não encontrado: {stream_id}")
                return False
                
            # Parar stream primeiro
            self.streams[stream_id].stop()
            
            # Remover
            del self.streams[stream_id]
            logger.info(f"Stream removido: {stream_id}")
            return True
            
    def get_stream(self, stream_id: str) -> Optional[RTSPStream]:
        """
        Obter stream por ID
        
        Args:
            stream_id: ID do stream
            
        Returns:
            Instância do stream ou None
        """
        return self.streams.get(stream_id)
        
    def get_current_frame(self, stream_id: str) -> Optional[np.ndarray]:
        """
        Obter frame atual de um stream
        
        Args:
            stream_id: ID do stream
            
        Returns:
            Frame atual ou None
        """
        stream = self.get_stream(stream_id)
        if stream:
            return stream.get_current_frame()
        return None
        
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """
        Obter estatísticas de todos os streams
        
        Returns:
            Dicionário com estatísticas de cada stream
        """
        stats = {}
        for stream_id, stream in self.streams.items():
            stats[stream_id] = stream.get_stats()
        return stats
        
    def stop_all_streams(self):
        """Parar todos os streams"""
        with self._lock:
            for stream in self.streams.values():
                stream.stop()
            logger.info("Todos os streams parados")
            
    def cleanup(self):
        """Limpar todos os recursos"""
        self.stop_all_streams()
        with self._lock:
            self.streams.clear()
        self.executor.shutdown(wait=True)
        logger.info("RTSPStreamManager limpo")

# Instância global do gerenciador
stream_manager = RTSPStreamManager()
