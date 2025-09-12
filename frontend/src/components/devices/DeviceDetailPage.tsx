// Página detalhada de dispositivo com live stream, configurações e histórico
// Interface completa para gerenciar uma câmera específica

import React, { useState, useEffect } from 'react';
import { VideoGeometryEditor } from '../geometry/VideoGeometryEditor';
import { AlertsWidget } from '../dashboard/AlertsWidget';
import { 
  ArrowLeft, 
  Settings, 
  Activity, 
  Clock,
  Wifi, 
  Camera,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play
} from 'lucide-react';
import type { GeometryShape } from '../geometry/GeometryEditor';

interface DeviceInfo {
  id: string;
  name: string;
  model: string;
  firmware: string;
  ipAddress: string;
  rtspUrl: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: Date;
  uptime: number;
  resolution: string;
  fps: number;
  bitrate: number;
  temperature?: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

interface DeviceStats {
  totalDetections: number;
  alertsToday: number;
  uptimePercentage: number;
  averageFps: number;
  bandwidthUsage: number;
  diskUsage: number;
}

interface DeviceDetailPageProps {
  deviceId: string;
  onBack?: () => void;
}

export const DeviceDetailPage: React.FC<DeviceDetailPageProps> = ({
  deviceId,
  onBack
}) => {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [shapes, setShapes] = useState<GeometryShape[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'config' | 'analytics' | 'history'>('live');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeviceData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Simular carregamento de dados
      // TODO: Substituir por chamada real da API
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockDevice: DeviceInfo = {
        id: deviceId,
        name: `Câmera ${deviceId.slice(-3)}`,
        model: 'HIKVISION DS-2CD2385G1-I',
        firmware: 'V5.7.13 build 220815',
        ipAddress: '192.168.1.100',
        rtspUrl: `rtsp://192.168.1.100:554/stream${deviceId}`,
        location: 'Entrada Principal',
        status: Math.random() > 0.3 ? 'online' : Math.random() > 0.5 ? 'offline' : 'error',
        lastSeen: new Date(Date.now() - Math.random() * 3600000),
        uptime: Math.floor(Math.random() * 8760), // horas
        resolution: '2560x1920',
        fps: 25,
        bitrate: 4096,
        temperature: Math.floor(Math.random() * 20) + 35,
        cpuUsage: Math.floor(Math.random() * 40) + 20,
        memoryUsage: Math.floor(Math.random() * 30) + 50
      };

      const mockStats: DeviceStats = {
        totalDetections: Math.floor(Math.random() * 1000) + 500,
        alertsToday: Math.floor(Math.random() * 20) + 2,
        uptimePercentage: Math.floor(Math.random() * 10) + 90,
        averageFps: Math.floor(Math.random() * 5) + 20,
        bandwidthUsage: Math.floor(Math.random() * 30) + 40,
        diskUsage: Math.floor(Math.random() * 40) + 30
      };

      setDevice(mockDevice);
      setStats(mockStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do dispositivo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceData();
  }, [deviceId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'offline':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Erro';
      default:
        return 'Desconhecido';
    }
  };

  const formatUptime = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${remainingHours}h`;
  };

  const handleShapesChange = (newShapes: GeometryShape[]) => {
    setShapes(newShapes);
  };

  const handleSaveROI = (shapes: GeometryShape[]) => {
    console.log('Salvando ROIs:', shapes);
    // TODO: Implementar salvamento via API
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados do dispositivo...</p>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao Carregar</h2>
          <p className="text-gray-600 mb-4">{error || 'Dispositivo não encontrado'}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-3">
                <Camera className="w-8 h-8 text-gray-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{device.name}</h1>
                  <p className="text-gray-500">{device.location}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {getStatusIcon(device.status)}
              <span className={`text-sm font-medium ${
                device.status === 'online' ? 'text-green-700' :
                device.status === 'offline' ? 'text-gray-700' : 'text-red-700'
              }`}>
                {getStatusText(device.status)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Device Info Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Wifi className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">IP:</span>
              <span className="font-medium">{device.ipAddress}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Resolução:</span>
              <span className="font-medium">{device.resolution}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">FPS:</span>
              <span className="font-medium">{device.fps}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Uptime:</span>
              <span className="font-medium">{formatUptime(device.uptime)}</span>
            </div>
            
            {device.temperature && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Temp:</span>
                <span className="font-medium">{device.temperature}°C</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Modelo:</span>
              <span className="font-medium text-xs">{device.model}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'live', label: 'Live Stream', icon: Play },
              { id: 'config', label: 'Configurações', icon: Settings },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'history', label: 'Histórico', icon: Clock }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Live Stream + ROI Editor */}
            <div className="lg:col-span-2">
              <VideoGeometryEditor
                streamId={device.id}
                rtspUrl={device.rtspUrl}
                deviceName={device.name}
                initialShapes={shapes}
                onShapesChange={handleShapesChange}
                onSave={handleSaveROI}
                autoStart={device.status === 'online'}
              />
            </div>
            
            {/* Sidebar with alerts and controls */}
            <div className="space-y-6">
              <AlertsWidget
                id={`alerts-${device.id}`}
                maxItems={5}
              />
              
              {/* Quick Stats */}
              {stats && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas Hoje</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Detecções:</span>
                      <span className="font-medium">{stats.totalDetections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Alertas:</span>
                      <span className="font-medium">{stats.alertsToday}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uptime:</span>
                      <span className="font-medium">{stats.uptimePercentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">FPS Médio:</span>
                      <span className="font-medium">{stats.averageFps}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="max-w-4xl">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Configurações do Dispositivo</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Configurações Básicas</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Dispositivo</label>
                    <input
                      type="text"
                      value={device.name}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
                    <input
                      type="text"
                      value={device.location}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereço IP</label>
                    <input
                      type="text"
                      value={device.ipAddress}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Video Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Configurações de Vídeo</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resolução</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option value="1920x1080">1920x1080 (Full HD)</option>
                      <option value="2560x1920" selected>2560x1920 (5MP)</option>
                      <option value="3840x2160">3840x2160 (4K)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">FPS</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option value="15">15 FPS</option>
                      <option value="25" selected>25 FPS</option>
                      <option value="30">30 FPS</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bitrate (kbps)</label>
                    <input
                      type="number"
                      value={device.bitrate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
                  Salvar Configurações
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Analytics em Desenvolvimento</h3>
              <p className="text-gray-500">Gráficos detalhados e métricas serão exibidos aqui</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Histórico em Desenvolvimento</h3>
              <p className="text-gray-500">Histórico de eventos e gravações será exibido aqui</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
