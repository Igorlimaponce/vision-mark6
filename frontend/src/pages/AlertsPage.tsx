// Página de Alertas conforme manual AIOS v2.0

import { useState, useEffect } from 'react';
import { AlertTriangle, Info, AlertCircle, CheckCircle, Clock, Filter, Search, Eye, Trash2 } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useDebounce } from '../hooks/useDebounce';
import { subscribeToAlerts } from '../services/websocket';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  source: string;
  deviceId?: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// Mock data para demonstração
const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'critical',
    title: 'Dispositivo Offline',
    message: 'Camera CAM-001 não está respondendo há mais de 5 minutos',
    source: 'Fleet Management',
    deviceId: 'CAM-001',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    acknowledged: false
  },
  {
    id: '2',
    type: 'warning',
    title: 'Alta CPU',
    message: 'Dispositivo SERVER-01 com uso de CPU acima de 85%',
    source: 'System Monitor',
    deviceId: 'SERVER-01',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    acknowledged: false
  },
  {
    id: '3',
    type: 'info',
    title: 'Pipeline Iniciado',
    message: 'Pipeline "Detecção de Pessoas" foi iniciado com sucesso',
    source: 'Pipeline Engine',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    acknowledged: true,
    acknowledgedBy: 'admin@aios.com',
    acknowledgedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    type: 'success',
    title: 'Manutenção Concluída',
    message: 'Manutenção programada do sistema finalizada com sucesso',
    source: 'System Admin',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    acknowledged: true,
    acknowledgedBy: 'operator@aios.com',
    acknowledgedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    type: 'critical',
    title: 'Falha na Detecção',
    message: 'Algoritmo de detecção retornando erro em 3 câmeras consecutivas',
    source: 'AI Engine',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    acknowledged: false
  }
];

export const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>(mockAlerts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  // const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAcknowledged, setShowAcknowledged] = useState(true);

  const debouncedSearchTerm = useDebounce(searchTerm, { delay: 300 });

  useEffect(() => {
    // Inscrever-se para receber alertas em tempo real
    const unsubscribe = subscribeToAlerts((newAlert: Alert) => {
      setAlerts(prev => [newAlert, ...prev]);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let filtered = alerts;

    // Filtrar por busca
    if (debouncedSearchTerm) {
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        alert.message.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        alert.source.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (alert.deviceId && alert.deviceId.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      );
    }

    // Filtrar por tipo
    if (selectedType !== 'all') {
      filtered = filtered.filter(alert => alert.type === selectedType);
    }

    // Filtrar por status de reconhecimento
    if (!showAcknowledged) {
      filtered = filtered.filter(alert => !alert.acknowledged);
    }

    setFilteredAlerts(filtered);
  }, [alerts, debouncedSearchTerm, selectedType, showAcknowledged]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertBadge = (type: string) => {
    const badges = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      success: 'bg-green-100 text-green-800 border-green-200'
    };

    const labels = {
      critical: 'Crítico',
      warning: 'Aviso',
      info: 'Info',
      success: 'Sucesso'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${badges[type as keyof typeof badges]}`}>
        {labels[type as keyof typeof labels]}
      </span>
    );
  };

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? {
            ...alert,
            acknowledged: true,
            acknowledgedBy: 'current-user@aios.com', // Em uma implementação real, viria do contexto de autenticação
            acknowledgedAt: new Date().toISOString()
          }
        : alert
    ));
  };

  const handleDelete = (alertId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este alerta?')) {
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    }
  };

  const handleAcknowledgeAll = () => {
    if (window.confirm('Tem certeza que deseja reconhecer todos os alertas não reconhecidos?')) {
      setAlerts(prev => prev.map(alert => 
        !alert.acknowledged 
          ? {
              ...alert,
              acknowledged: true,
              acknowledgedBy: 'current-user@aios.com',
              acknowledgedAt: new Date().toISOString()
            }
          : alert
      ));
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;
  const criticalCount = alerts.filter(alert => alert.type === 'critical' && !alert.acknowledged).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de Alertas</h1>
          <p className="text-gray-600">
            Monitore e gerencie alertas do sistema em tempo real
          </p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 lg:mt-0">
          {unacknowledgedCount > 0 && (
            <Button onClick={handleAcknowledgeAll} variant="secondary">
              Reconhecer Todos ({unacknowledgedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Alertas</p>
              <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            </div>
            <Info className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Não Reconhecidos</p>
              <p className="text-2xl font-bold text-orange-600">{unacknowledgedCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Críticos</p>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Últimas 24h</p>
              <p className="text-2xl font-bold text-gray-900">
                {alerts.filter(alert => {
                  const alertTime = new Date(alert.timestamp);
                  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                  return alertTime >= dayAgo;
                }).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-gray-500" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar alertas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Filtro por Tipo */}
          <div className="relative">
            <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">Todos os tipos</option>
              <option value="critical">Crítico</option>
              <option value="warning">Aviso</option>
              <option value="info">Info</option>
              <option value="success">Sucesso</option>
            </select>
          </div>

          {/* Toggle Reconhecidos */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showAcknowledged"
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mr-2"
            />
            <label htmlFor="showAcknowledged" className="text-sm text-gray-700">
              Mostrar reconhecidos
            </label>
          </div>
        </div>
      </Card>

      {/* Lista de Alertas */}
      <Card className="overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-6 ${alert.acknowledged ? 'bg-gray-50' : 'bg-white'} ${
                alert.type === 'critical' && !alert.acknowledged ? 'border-l-4 border-red-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getAlertIcon(alert.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900">{alert.title}</h3>
                      {getAlertBadge(alert.type)}
                      {alert.acknowledged && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          Reconhecido
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Fonte: {alert.source}</span>
                      {alert.deviceId && <span>Dispositivo: {alert.deviceId}</span>}
                      <span>{formatTimestamp(alert.timestamp)}</span>
                    </div>

                    {alert.acknowledged && alert.acknowledgedBy && (
                      <div className="mt-2 text-xs text-gray-500">
                        Reconhecido por {alert.acknowledgedBy} em {formatTimestamp(alert.acknowledgedAt!)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {!alert.acknowledged && (
                    <Button
                      onClick={() => handleAcknowledge(alert.id)}
                      variant="secondary"
                      className="flex items-center gap-1 text-xs"
                    >
                      <Eye className="w-4 h-4" />
                      Reconhecer
                    </Button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Excluir alerta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum alerta encontrado
            </h3>
            <p className="text-gray-500">
              Tente ajustar os filtros ou aguarde novos alertas.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
