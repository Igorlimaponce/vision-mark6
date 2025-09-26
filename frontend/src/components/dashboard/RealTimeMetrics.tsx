import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Wifi, Eye, Zap } from 'lucide-react';

interface SystemMetrics {
  devices: {
    total: number;
    online: number;
    offline: number;
    warning: number;
  };
  pipelines: {
    total: number;
    active: number;
    inactive: number;
  };
  system: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_usage: number;
  };
  performance: {
    avg_fps: number;
    total_detections: number;
    active_streams: number;
  };
  timestamp: string;
}

interface WebSocketMessage {
  type: string;
  data: any;
}

export const RealTimeMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      console.warn('No access token for WebSocket connection');
      return;
    }

    const connectWebSocket = () => {
      setConnectionStatus('connecting');
      
      const websocket = new WebSocket(`ws://localhost:8000/api/v1/ws/ws?token=${encodeURIComponent(token)}`);

      websocket.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        setWs(websocket);
      };

      websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'system_metrics') {
            setMetrics(message.data);
          } else if (message.type === 'initial_state') {
            // Converter formato inicial para métricas
            const initialMetrics: SystemMetrics = {
              devices: {
                total: 4,
                online: message.data.devices_online || 2,
                offline: 4 - (message.data.devices_online || 2),
                warning: 0
              },
              pipelines: {
                total: 3,
                active: message.data.pipelines_active || 2,
                inactive: 3 - (message.data.pipelines_active || 2)
              },
              system: {
                cpu_usage: 45.2,
                memory_usage: 68.1,
                disk_usage: 35.7,
                network_usage: 12.5
              },
              performance: {
                avg_fps: 25.8,
                total_detections: 1247,
                active_streams: 3
              },
              timestamp: new Date().toISOString()
            };
            setMetrics(initialMetrics);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        setWs(null);
        
        // Tentar reconectar após 5 segundos
        setTimeout(connectWebSocket, 5000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const getStatusColor = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Métricas em Tempo Real</h3>
          <div className={`flex items-center gap-2 ${getConnectionStatusColor()}`}>
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">
              {connectionStatus === 'connected' ? 'Conectado' : 
               connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
            </span>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Métricas em Tempo Real</h3>
        <div className={`flex items-center gap-2 ${getConnectionStatusColor()}`}>
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium">
            {connectionStatus === 'connected' ? 'Conectado' : 
             connectionStatus === 'connecting' ? 'Conectando...' : 'Desconectado'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Dispositivos */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Dispositivos</span>
            <Wifi className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.devices.online}/{metrics.devices.total}</div>
          <div className="text-xs text-gray-500">
            {metrics.devices.warning > 0 && `${metrics.devices.warning} warnings`}
          </div>
        </div>

        {/* Pipelines */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Pipelines</span>
            <Zap className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.pipelines.active}/{metrics.pipelines.total}</div>
          <div className="text-xs text-gray-500">ativas</div>
        </div>

        {/* CPU */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">CPU</span>
            <Cpu className="w-4 h-4 text-gray-400" />
          </div>
          <div className={`text-2xl font-bold ${getStatusColor(metrics.system.cpu_usage, { warning: 70, danger: 90 })}`}>
            {metrics.system.cpu_usage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">uso atual</div>
        </div>

        {/* Memória */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Memória</span>
            <HardDrive className="w-4 h-4 text-gray-400" />
          </div>
          <div className={`text-2xl font-bold ${getStatusColor(metrics.system.memory_usage, { warning: 80, danger: 95 })}`}>
            {metrics.system.memory_usage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">uso atual</div>
        </div>
      </div>

      {/* Performance */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>FPS: <span className="font-medium text-gray-900">{metrics.performance.avg_fps.toFixed(1)}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>Detecções: <span className="font-medium text-gray-900">{metrics.performance.total_detections.toLocaleString()}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            <span>Streams: <span className="font-medium text-gray-900">{metrics.performance.active_streams}</span></span>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Última atualização: {new Date(metrics.timestamp).toLocaleTimeString('pt-BR')}
        </div>
      </div>
    </div>
  );
};