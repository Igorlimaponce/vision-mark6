// Hook para WebSocket - Comunicação em tempo real com o backend

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { logger } from '../utils/logger';
import { notifications } from '../utils/notifications';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface DeviceUpdate {
  device_id: string;
  status: 'online' | 'offline' | 'warning';
  last_seen: string;
  metadata?: Record<string, any>;
}

export interface EventUpdate {
  event_id: string;
  device_id: string;
  event_type: string;
  confidence: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PipelineUpdate {
  pipeline_id: string;
  device_id: string;
  status: 'running' | 'completed' | 'failed';
  progress?: number;
  result?: any;
}

export interface PipelineStatusUpdate {
  pipeline_id: string;
  status: string;
  detailed_status?: any;
}

export interface PipelineFrameUpdate {
  pipeline_id: string;
  frame_data: {
    frame_id: number;
    timestamp: number;
    detections_count: number;
    processing_time: number;
    fps: number;
    node_results: Record<string, any>;
  };
}

export interface PipelineAnalyticsUpdate {
  pipeline_id: string;
  analytics: {
    node_id: string;
    node_type: string;
    people_count?: number;
    trend?: string;
    new_crossings?: number;
    total_crossings?: number;
    new_intrusions?: number;
    active_zones?: number;
    results: any;
  };
}

export interface PipelineErrorUpdate {
  pipeline_id: string;
  error_message: string;
  severity: string;
}

export const useWebSocket = () => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 segundo

  // Callbacks para diferentes tipos de mensagens
  const deviceUpdateCallbacks = useRef<((update: DeviceUpdate) => void)[]>([]);
  const eventUpdateCallbacks = useRef<((update: EventUpdate) => void)[]>([]);
  const pipelineUpdateCallbacks = useRef<((update: PipelineUpdate) => void)[]>([]);
  const pipelineStatusCallbacks = useRef<((update: PipelineStatusUpdate) => void)[]>([]);
  const pipelineFrameCallbacks = useRef<((update: PipelineFrameUpdate) => void)[]>([]);
  const pipelineAnalyticsCallbacks = useRef<((update: PipelineAnalyticsUpdate) => void)[]>([]);
  const pipelineErrorCallbacks = useRef<((update: PipelineErrorUpdate) => void)[]>([]);

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      logger.warn('WebSocket: Cannot connect - user not authenticated', 'WebSocket');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      logger.warn('WebSocket: Already connected or connecting', 'WebSocket');
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      // Usar o ID do usuário como client_id
      const wsUrl = `ws://localhost:8000/ws/${user.id}`;
      
      logger.info(`WebSocket: Connecting to ${wsUrl}`, 'WebSocket');
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        logger.info('WebSocket: Connected successfully', 'WebSocket');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        
        // Enviar mensagem de autenticação se necessário
        const token = localStorage.getItem('aios_token');
        if (token && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'auth',
            token: token,
            organization_id: user.organization_id
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          logger.info(`WebSocket: Received message of type ${message.type}`, 'WebSocket', message);
          
          // Processar diferentes tipos de mensagens
          switch (message.type) {
            case 'device_update':
              deviceUpdateCallbacks.current.forEach(callback => {
                callback(message.data as DeviceUpdate);
              });
              break;
              
            case 'event_update':
              eventUpdateCallbacks.current.forEach(callback => {
                callback(message.data as EventUpdate);
              });
              break;
              
            case 'pipeline_update':
              pipelineUpdateCallbacks.current.forEach(callback => {
                callback(message.data as PipelineUpdate);
              });
              break;

            case 'pipeline_status_update':
              pipelineStatusCallbacks.current.forEach(callback => {
                callback({
                  pipeline_id: message.data.pipeline_id,
                  status: message.data.status,
                  detailed_status: message.data.metadata?.detailed_status
                });
              });
              break;

            case 'pipeline_frame_update':
              pipelineFrameCallbacks.current.forEach(callback => {
                callback(message.data as PipelineFrameUpdate);
              });
              break;

            case 'pipeline_analytics':
              pipelineAnalyticsCallbacks.current.forEach(callback => {
                callback(message.data as PipelineAnalyticsUpdate);
              });
              break;

            case 'pipeline_error':
              pipelineErrorCallbacks.current.forEach(callback => {
                callback(message.data as PipelineErrorUpdate);
              });
              // Também mostrar notificação de erro
              notifications.error(`Pipeline ${message.data.pipeline_id}: ${message.data.error_message}`);
              break;

            case 'pipeline_stats_update':
              // Processar estatísticas do pipeline
              logger.info(`Pipeline stats updated: ${message.data.pipeline_id}`, 'WebSocket');
              break;

            case 'system_stats_update':
              // Processar estatísticas do sistema
              logger.info('System stats updated', 'WebSocket');
              break;
              
            case 'notification':
              notifications.info(message.data.message || 'Nova notificação');
              break;
              
            case 'error':
              logger.error('WebSocket: Server error', 'WebSocket', message.data);
              notifications.error(message.data.message || 'Erro do servidor');
              break;
              
            default:
              logger.warn(`WebSocket: Unknown message type: ${message.type}`, 'WebSocket', message);
          }
        } catch (error) {
          logger.error('WebSocket: Error parsing message', 'WebSocket', error);
        }
      };

      wsRef.current.onclose = (event) => {
        logger.warn(`WebSocket: Connection closed (code: ${event.code})`, 'WebSocket');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Tentar reconectar se não foi um fechamento intencional
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
          logger.info(`WebSocket: Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`, 'WebSocket');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay) as any;
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          logger.error('WebSocket: Max reconnection attempts reached', 'WebSocket');
          setConnectionStatus('error');
          notifications.error('Conexão perdida. Recarregue a página.');
        }
      };

      wsRef.current.onerror = (error) => {
        logger.error('WebSocket: Connection error', 'WebSocket', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      logger.error('WebSocket: Failed to create connection', 'WebSocket', error);
      setConnectionStatus('error');
    }
  }, [isAuthenticated, user]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttempts.current = 0;
  }, []);

  const sendMessage = useCallback((type: string, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString()
      };
      
      wsRef.current.send(JSON.stringify(message));
      logger.info(`WebSocket: Sent message of type ${type}`, 'WebSocket', message);
      return true;
    } else {
      logger.warn('WebSocket: Cannot send message - not connected', 'WebSocket');
      return false;
    }
  }, []);

  // Métodos para registrar callbacks
  const onDeviceUpdate = useCallback((callback: (update: DeviceUpdate) => void) => {
    deviceUpdateCallbacks.current.push(callback);
    
    // Retornar função de cleanup
    return () => {
      const index = deviceUpdateCallbacks.current.indexOf(callback);
      if (index > -1) {
        deviceUpdateCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  const onEventUpdate = useCallback((callback: (update: EventUpdate) => void) => {
    eventUpdateCallbacks.current.push(callback);
    
    return () => {
      const index = eventUpdateCallbacks.current.indexOf(callback);
      if (index > -1) {
        eventUpdateCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  const onPipelineUpdate = useCallback((callback: (update: PipelineUpdate) => void) => {
    pipelineUpdateCallbacks.current.push(callback);
    
    return () => {
      const index = pipelineUpdateCallbacks.current.indexOf(callback);
      if (index > -1) {
        pipelineUpdateCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  const onPipelineStatusUpdate = useCallback((callback: (update: PipelineStatusUpdate) => void) => {
    pipelineStatusCallbacks.current.push(callback);
    
    return () => {
      const index = pipelineStatusCallbacks.current.indexOf(callback);
      if (index > -1) {
        pipelineStatusCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  const onPipelineFrameUpdate = useCallback((callback: (update: PipelineFrameUpdate) => void) => {
    pipelineFrameCallbacks.current.push(callback);
    
    return () => {
      const index = pipelineFrameCallbacks.current.indexOf(callback);
      if (index > -1) {
        pipelineFrameCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  const onPipelineAnalytics = useCallback((callback: (update: PipelineAnalyticsUpdate) => void) => {
    pipelineAnalyticsCallbacks.current.push(callback);
    
    return () => {
      const index = pipelineAnalyticsCallbacks.current.indexOf(callback);
      if (index > -1) {
        pipelineAnalyticsCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  const onPipelineError = useCallback((callback: (update: PipelineErrorUpdate) => void) => {
    pipelineErrorCallbacks.current.push(callback);
    
    return () => {
      const index = pipelineErrorCallbacks.current.indexOf(callback);
      if (index > -1) {
        pipelineErrorCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  // Conectar automaticamente quando autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user, connect, disconnect]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    onDeviceUpdate,
    onEventUpdate,
    onPipelineUpdate,
    onPipelineStatusUpdate,
    onPipelineFrameUpdate,
    onPipelineAnalytics,
    onPipelineError,
  };
};
