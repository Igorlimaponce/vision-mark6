// Serviço WebSocket para atualizações em tempo real conforme manual AIOS v2.0

import { logger } from '../utils/logger';
import { notifications } from '../utils/notifications';
import { APP_CONFIG } from '../config/app';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private listeners = new Map<string, ((data: any) => void)[]>();
  private isConnected = false;
  private shouldReconnect = true;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        logger.info('Connecting to WebSocket', 'WebSocket', { url: this.config.url });
        
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          logger.info('WebSocket connected successfully', 'WebSocket');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          notifications.connectionRestored();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            logger.error('Failed to parse WebSocket message', 'WebSocket', error);
          }
        };

        this.ws.onclose = (event) => {
          logger.info('WebSocket connection closed', 'WebSocket', { 
            code: event.code, 
            reason: event.reason 
          });
          this.isConnected = false;
          this.stopHeartbeat();
          
          if (this.shouldReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached', 'WebSocket');
            notifications.connectionLost();
          }
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket error occurred', 'WebSocket', error);
          reject(error);
        };

      } catch (error) {
        logger.error('Failed to create WebSocket connection', 'WebSocket', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    logger.info('WebSocket disconnected manually', 'WebSocket');
  }

  send(message: WebSocketMessage): void {
    if (!this.isConnected || !this.ws) {
      logger.warn('Cannot send message: WebSocket not connected', 'WebSocket');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      logger.debug('WebSocket message sent', 'WebSocket', { type: message.type });
    } catch (error) {
      logger.error('Failed to send WebSocket message', 'WebSocket', error);
    }
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType)!.push(callback);
    logger.debug('Subscribed to WebSocket event', 'WebSocket', { eventType });

    // Retorna função para unsubscribe
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
          logger.debug('Unsubscribed from WebSocket event', 'WebSocket', { eventType });
        }
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    logger.debug('WebSocket message received', 'WebSocket', { 
      type: message.type,
      timestamp: message.timestamp 
    });

    const callbacks = this.listeners.get(message.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          logger.error('Error in WebSocket callback', 'WebSocket', error);
        }
      });
    }

    // Handlers específicos para tipos de mensagem do sistema
    this.handleSystemMessage(message);
  }

  private handleSystemMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'device_status_changed':
        this.handleDeviceStatusChange(message.data);
        break;
      case 'pipeline_status_changed':
        this.handlePipelineStatusChange(message.data);
        break;
      case 'alert_created':
        this.handleAlert(message.data);
        break;
      case 'system_notification':
        this.handleSystemNotification(message.data);
        break;
      default:
        logger.debug('Unhandled message type', 'WebSocket', { type: message.type });
    }
  }

  private handleDeviceStatusChange(data: any): void {
    const { deviceId, status, previousStatus } = data;
    
    if (status === 'offline' && previousStatus === 'online') {
      notifications.deviceDisconnected(deviceId);
    } else if (status === 'online' && previousStatus === 'offline') {
      notifications.deviceConnected(deviceId);
    }
  }

  private handlePipelineStatusChange(data: any): void {
    const { pipelineName, status, error } = data;
    
    switch (status) {
      case 'started':
        notifications.pipelineStarted(pipelineName);
        break;
      case 'stopped':
        notifications.pipelineStopped(pipelineName);
        break;
      case 'error':
        notifications.pipelineError(pipelineName, error);
        break;
    }
  }

  private handleAlert(data: any): void {
    const { level, message } = data;
    
    switch (level) {
      case 'critical':
        notifications.error(`Alerta Crítico: ${message}`);
        break;
      case 'warning':
        notifications.warning(`Aviso: ${message}`);
        break;
      case 'info':
        notifications.info(`Info: ${message}`);
        break;
    }
  }

  private handleSystemNotification(data: any): void {
    const { message, type } = data;
    
    switch (type) {
      case 'maintenance':
        notifications.warning(`Manutenção: ${message}`);
        break;
      case 'update':
        notifications.info(`Atualização: ${message}`);
        break;
      default:
        notifications.info(message);
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Máximo de 30 segundos
    );

    logger.info(`Scheduling WebSocket reconnection`, 'WebSocket', {
      attempt: this.reconnectAttempts,
      delay: delay
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Erro será tratado no evento onerror
      });
    }, delay) as any;
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.send({
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
      }
    }, this.config.heartbeatInterval) as any;
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

// Instância singleton do serviço WebSocket
export const webSocketService = new WebSocketService({
  url: APP_CONFIG.websocket.url,
  reconnectInterval: APP_CONFIG.websocket.reconnectInterval,
  maxReconnectAttempts: APP_CONFIG.websocket.maxReconnectAttempts,
  heartbeatInterval: APP_CONFIG.websocket.heartbeatInterval,
});

// Funções de conveniência para eventos específicos do sistema
export const subscribeToDeviceUpdates = (callback: (data: any) => void) => {
  return webSocketService.subscribe('device_status_changed', callback);
};

export const subscribeToPipelineUpdates = (callback: (data: any) => void) => {
  return webSocketService.subscribe('pipeline_status_changed', callback);
};

export const subscribeToAlerts = (callback: (data: any) => void) => {
  return webSocketService.subscribe('alert_created', callback);
};

export const subscribeToFleetUpdates = (callback: (data: any) => void) => {
  return webSocketService.subscribe('fleet_update', callback);
};

export const subscribeToAnalyticsUpdates = (callback: (data: any) => void) => {
  return webSocketService.subscribe('analytics_update', callback);
};
