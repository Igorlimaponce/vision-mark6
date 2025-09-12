// Componente para streaming de vídeo em tempo real
// Integração com WebRTC backend para visualização de câmeras

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Square, AlertCircle, Loader2 } from 'lucide-react';

export const StreamStatus = {
  STOPPED: 'stopped',
  STARTING: 'starting', 
  RUNNING: 'running',
  ERROR: 'error',
  RECONNECTING: 'reconnecting'
} as const;

export type StreamStatus = typeof StreamStatus[keyof typeof StreamStatus];

interface VideoStreamProps {
  streamId: string;
  rtspUrl: string;
  deviceName?: string;
  autoStart?: boolean;
  showControls?: boolean;
  onStatusChange?: (status: StreamStatus) => void;
  onError?: (error: string) => void;
}

interface StreamMessage {
  type: 'video_frame' | 'stream_status' | 'stream_info';
  data: any;
}

export const VideoStream: React.FC<VideoStreamProps> = ({
  streamId,
  rtspUrl,
  deviceName,
  autoStart = false,
  showControls = true,
  onStatusChange,
  onError
}) => {
  const [status, setStatus] = useState<StreamStatus>(StreamStatus.STOPPED);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [frameCount, setFrameCount] = useState<number>(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // ID único para este cliente
  const clientId = useRef<string>(`client_${Date.now()}_${Math.random()}`);

  const updateStatus = useCallback((newStatus: StreamStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    updateStatus(StreamStatus.ERROR);
    onError?.(errorMessage);
  }, [updateStatus, onError]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `ws://localhost:8000/api/v1/streaming/ws/${clientId.current}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket conectado para streaming');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: StreamMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (e) {
          console.error('Erro ao processar mensagem WebSocket:', e);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket desconectado');
        updateStatus(StreamStatus.STOPPED);
      };

      wsRef.current.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        handleError('Erro de conexão WebSocket');
      };

    } catch (e) {
      console.error('Erro ao conectar WebSocket:', e);
      handleError('Falha ao conectar WebSocket');
    }
  }, [updateStatus, handleError]);

  const handleWebSocketMessage = useCallback((message: StreamMessage) => {
    switch (message.type) {
      case 'video_frame':
        if (message.data.stream_id === streamId) {
          drawFrame(message.data.frame);
          setFps(message.data.fps || 0);
          setFrameCount(message.data.frame_count || 0);
        }
        break;
        
      case 'stream_status':
        if (message.data.stream_id === streamId) {
          const statusMap: Record<string, StreamStatus> = {
            'started': StreamStatus.RUNNING,
            'stopped': StreamStatus.STOPPED,
            'error': StreamStatus.ERROR,
            'reconnecting': StreamStatus.RECONNECTING
          };
          
          const newStatus = statusMap[message.data.status] || StreamStatus.ERROR;
          updateStatus(newStatus);
          
          if (message.data.status === 'error') {
            handleError(message.data.message);
          } else {
            setError(null);
          }
        }
        break;
        
      case 'stream_info':
        // Processar informações do stream se necessário
        break;
    }
  }, [streamId, updateStatus, handleError]);

  const drawFrame = useCallback((frameBase64: string) => {
    if (!canvasRef.current || !ctxRef.current) return;

    try {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = ctxRef.current!;
        
        // Ajustar tamanho do canvas se necessário
        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        
        // Desenhar frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      
      img.src = `data:image/jpeg;base64,${frameBase64}`;
    } catch (e) {
      console.error('Erro ao desenhar frame:', e);
    }
  }, []);

  const sendWebSocketMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const startStream = useCallback(() => {
    if (status === StreamStatus.RUNNING) return;

    connectWebSocket();
    updateStatus(StreamStatus.STARTING);

    // Aguardar conexão WebSocket antes de enviar comando
    const checkConnection = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendWebSocketMessage({
          type: 'start_stream',
          data: {
            stream_id: streamId,
            rtsp_url: rtspUrl
          }
        });
      } else {
        setTimeout(checkConnection, 100);
      }
    };
    
    checkConnection();
  }, [status, streamId, rtspUrl, connectWebSocket, updateStatus, sendWebSocketMessage]);

  const stopStream = useCallback(() => {
    if (status === StreamStatus.STOPPED) return;

    sendWebSocketMessage({
      type: 'stop_stream',
      data: {
        stream_id: streamId
      }
    });

    updateStatus(StreamStatus.STOPPED);
    setFps(0);
    setFrameCount(0);
    setError(null);

    // Limpar canvas
    if (canvasRef.current && ctxRef.current) {
      ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [status, streamId, sendWebSocketMessage, updateStatus]);

  // Inicializar canvas
  useEffect(() => {
    if (canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d');
      imageRef.current = new Image();
    }
  }, []);

  // Auto start
  useEffect(() => {
    if (autoStart) {
      startStream();
    }
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [autoStart, startStream]);

  const getStatusIcon = () => {
    switch (status) {
      case StreamStatus.RUNNING:
        return <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />;
      case StreamStatus.STARTING:
      case StreamStatus.RECONNECTING:
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case StreamStatus.ERROR:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case StreamStatus.RUNNING:
        return 'Ativo';
      case StreamStatus.STARTING:
        return 'Iniciando...';
      case StreamStatus.RECONNECTING:
        return 'Reconectando...';
      case StreamStatus.ERROR:
        return 'Erro';
      default:
        return 'Parado';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-sm font-medium text-gray-700">
                {deviceName || streamId}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {getStatusText()}
            </span>
          </div>
          
          {/* Stream info */}
          {status === StreamStatus.RUNNING && (
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>{fps.toFixed(1)} FPS</span>
              <span>Frames: {frameCount}</span>
            </div>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Video area */}
      <div className="relative bg-black" style={{ minHeight: '300px' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{ maxHeight: '500px' }}
        />
        
        {/* Placeholder quando parado */}
        {status === StreamStatus.STOPPED && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Play className="w-12 h-12 mx-auto mb-2" />
              <p>Stream parado</p>
            </div>
          </div>
        )}
        
        {/* Loading quando iniciando */}
        {(status === StreamStatus.STARTING || status === StreamStatus.RECONNECTING) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p>{status === StreamStatus.STARTING ? 'Conectando...' : 'Reconectando...'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="bg-gray-50 px-4 py-3 border-t">
          <div className="flex items-center justify-center space-x-2">
            {status === StreamStatus.STOPPED ? (
              <button
                onClick={startStream}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Iniciar</span>
              </button>
            ) : (
              <button
                onClick={stopStream}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                disabled={status === StreamStatus.STARTING}
              >
                <Square className="w-4 h-4" />
                <span>Parar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
