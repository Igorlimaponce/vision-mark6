// Widget de alertas ativos
// Mostra lista de alertas em tempo real com ações

import React, { useState, useEffect } from 'react';
import { BaseWidget } from './BaseWidget';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Clock, 
  MapPin, 
  Eye,
  X,
  Check,
  ExternalLink
} from 'lucide-react';

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  deviceId: string;
  deviceName: string;
  location?: string;
  isRead: boolean;
  isResolved: boolean;
}

interface AlertsWidgetProps {
  id: string;
  maxItems?: number;
  refreshInterval?: number;
  onAlertClick?: (alert: Alert) => void;
  onMarkAsRead?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
}

const AlertIcon: React.FC<{ type: Alert['type'] }> = ({ type }) => {
  switch (type) {
    case 'critical':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
  }
};

const AlertItem: React.FC<{
  alert: Alert;
  onView?: () => void;
  onMarkAsRead?: () => void;
  onResolve?: () => void;
}> = ({ alert, onView, onMarkAsRead, onResolve }) => {
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}min atrás`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  const bgColor = alert.isRead ? 'bg-gray-50' : 'bg-white';
  const borderColor = alert.type === 'critical' ? 'border-l-red-500' : 
                     alert.type === 'warning' ? 'border-l-yellow-500' : 'border-l-blue-500';

  return (
    <div className={`${bgColor} border-l-4 ${borderColor} p-3 hover:bg-gray-50 transition-colors`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            <AlertIcon type={alert.type} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className={`text-sm font-medium ${alert.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                {alert.title}
              </h4>
              {!alert.isRead && (
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
              )}
            </div>
            
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {alert.message}
            </p>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{getTimeAgo(alert.timestamp)}</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{alert.deviceName}</span>
              </div>
              
              {alert.location && (
                <span>• {alert.location}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          {onView && (
            <button
              onClick={onView}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Ver detalhes"
            >
              <Eye className="w-3 h-3" />
            </button>
          )}
          
          {!alert.isRead && onMarkAsRead && (
            <button
              onClick={onMarkAsRead}
              className="p-1 text-gray-400 hover:text-blue-600 rounded"
              title="Marcar como lido"
            >
              <Check className="w-3 h-3" />
            </button>
          )}
          
          {!alert.isResolved && onResolve && (
            <button
              onClick={onResolve}
              className="p-1 text-gray-400 hover:text-green-600 rounded"
              title="Resolver"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const AlertsWidget: React.FC<AlertsWidgetProps> = ({
  id,
  maxItems = 5,
  refreshInterval = 30000, // 30 segundos
  onAlertClick,
  onMarkAsRead,
  onResolve
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateMockAlerts = (): Alert[] => {
    const mockAlerts: Alert[] = [
      {
        id: 'alert-1',
        type: 'critical' as const,
        title: 'Intruso Detectado',
        message: 'Pessoa não autorizada detectada na área restrita do almoxarifado',
        timestamp: new Date(Date.now() - 5 * 60000), // 5 min atrás
        deviceId: 'cam-001',
        deviceName: 'Câmera Almoxarifado',
        location: 'Área Restrita',
        isRead: false,
        isResolved: false
      },
      {
        id: 'alert-2',
        type: 'warning' as const,
        title: 'Objeto Abandonado',
        message: 'Mochila deixada na recepção por mais de 15 minutos',
        timestamp: new Date(Date.now() - 12 * 60000), // 12 min atrás
        deviceId: 'cam-002',
        deviceName: 'Câmera Recepção',
        location: 'Hall Principal',
        isRead: false,
        isResolved: false
      },
      {
        id: 'alert-3',
        type: 'info' as const,
        title: 'Fluxo Alto de Pessoas',
        message: 'Contagem de pessoas acima do normal na entrada principal',
        timestamp: new Date(Date.now() - 25 * 60000), // 25 min atrás
        deviceId: 'cam-003',
        deviceName: 'Câmera Entrada',
        location: 'Portaria',
        isRead: true,
        isResolved: false
      },
      {
        id: 'alert-4',
        type: 'warning' as const,
        title: 'Veículo em Local Proibido',
        message: 'Carro estacionado em vaga de deficiente sem autorização',
        timestamp: new Date(Date.now() - 45 * 60000), // 45 min atrás
        deviceId: 'cam-004',
        deviceName: 'Câmera Estacionamento',
        location: 'Vaga 15',
        isRead: true,
        isResolved: true
      }
    ].slice(0, maxItems);

    return mockAlerts;
  };

  const fetchAlerts = async () => {
    try {
      setError(null);
      
      // Simular carregamento
      // TODO: Substituir por chamada real da API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockAlerts = generateMockAlerts();
      setAlerts(mockAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar alertas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchAlerts();
  };

  const handleAlertView = (alert: Alert) => {
    onAlertClick?.(alert);
  };

  const handleMarkAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
    onMarkAsRead?.(alertId);
  };

  const handleResolve = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isResolved: true, isRead: true } : alert
    ));
    onResolve?.(alertId);
  };

  useEffect(() => {
    fetchAlerts();
    
    const interval = setInterval(fetchAlerts, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const unreadCount = alerts.filter(alert => !alert.isRead).length;
  const unresolvedCount = alerts.filter(alert => !alert.isResolved).length;

  const headerActions = (
    <div className="flex items-center space-x-2 text-xs">
      {unreadCount > 0 && (
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">
          {unreadCount} não lidos
        </span>
      )}
      {unresolvedCount > 0 && (
        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
          {unresolvedCount} pendentes
        </span>
      )}
    </div>
  );

  return (
    <BaseWidget
      id={id}
      title="Alertas Ativos"
      isLoading={isLoading}
      error={error || undefined}
      onRefresh={handleRefresh}
      headerActions={headerActions}
    >
      <div className="max-h-96 overflow-y-auto">
        {alerts.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {alerts.map(alert => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onView={() => handleAlertView(alert)}
                onMarkAsRead={() => handleMarkAsRead(alert.id)}
                onResolve={() => handleResolve(alert.id)}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Nenhum alerta ativo</p>
          </div>
        )}
      </div>
      
      {alerts.length > 0 && (
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <button
            className="w-full text-center text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center justify-center space-x-1"
            onClick={() => console.log('Ver todos os alertas')}
          >
            <span>Ver todos os alertas</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </BaseWidget>
  );
};
