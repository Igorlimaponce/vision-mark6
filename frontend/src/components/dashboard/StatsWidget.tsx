// Widget de estatísticas em tempo real
// Mostra métricas de detecções, alertas e performance do sistema

import React, { useState, useEffect } from 'react';
import { BaseWidget } from './BaseWidget';
import { TrendingUp, TrendingDown, Users, AlertTriangle, Eye, Zap } from 'lucide-react';

interface StatsData {
  totalDetections: number;
  detectionsChange: number;
  activeAlerts: number;
  alertsChange: number;
  activeCameras: number;
  camerasChange: number;
  systemLoad: number;
  loadChange: number;
}

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  suffix?: string;
  isPercentage?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  suffix = '', 
  isPercentage = false 
}) => {
  const changeColor = change && change > 0 ? 'text-green-600' : change && change < 0 ? 'text-red-600' : 'text-gray-500';
  const changeIcon = change && change > 0 ? TrendingUp : change && change < 0 ? TrendingDown : null;
  const ChangeIcon = changeIcon;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
              {suffix}
            </p>
          </div>
        </div>
        
        {change !== undefined && (
          <div className={`flex items-center space-x-1 ${changeColor}`}>
            {ChangeIcon && <ChangeIcon className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {Math.abs(change)}{isPercentage ? '%' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface StatsWidgetProps {
  id: string;
  refreshInterval?: number;
}

export const StatsWidget: React.FC<StatsWidgetProps> = ({ 
  id, 
  refreshInterval = 30000 // 30 segundos
}) => {
  const [data, setData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      
      // Simular dados até a API estar pronta
      // TODO: Substituir por chamada real da API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: StatsData = {
        totalDetections: Math.floor(Math.random() * 1000) + 5000,
        detectionsChange: Math.floor(Math.random() * 20) - 10,
        activeAlerts: Math.floor(Math.random() * 10) + 2,
        alertsChange: Math.floor(Math.random() * 6) - 3,
        activeCameras: Math.floor(Math.random() * 5) + 8,
        camerasChange: Math.floor(Math.random() * 4) - 2,
        systemLoad: Math.floor(Math.random() * 30) + 45,
        loadChange: Math.floor(Math.random() * 10) - 5
      };
      
      setData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchStats();
  };

  useEffect(() => {
    fetchStats();
    
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return (
    <BaseWidget
      id={id}
      title="Estatísticas em Tempo Real"
      isLoading={isLoading}
      error={error || undefined}
      onRefresh={handleRefresh}
    >
      <div className="p-4">
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              title="Detecções Hoje"
              value={data.totalDetections}
              change={data.detectionsChange}
              icon={Eye}
            />
            
            <StatCard
              title="Alertas Ativos"
              value={data.activeAlerts}
              change={data.alertsChange}
              icon={AlertTriangle}
            />
            
            <StatCard
              title="Câmeras Ativas"
              value={data.activeCameras}
              change={data.camerasChange}
              icon={Users}
            />
            
            <StatCard
              title="Carga do Sistema"
              value={data.systemLoad}
              change={data.loadChange}
              icon={Zap}
              suffix="%"
              isPercentage={true}
            />
          </div>
        )}
        
        <div className="mt-4 text-xs text-gray-500 text-center">
          Última atualização: {new Date().toLocaleTimeString('pt-BR')}
        </div>
      </div>
    </BaseWidget>
  );
};
