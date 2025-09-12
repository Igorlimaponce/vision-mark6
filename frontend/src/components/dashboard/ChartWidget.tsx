// Widget de gráfico de linha para mostrar trends temporais
// Usa Recharts para visualização de dados históricos

import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { BaseWidget } from './BaseWidget';
import { Calendar } from 'lucide-react';

interface ChartDataPoint {
  timestamp: string;
  detections: number;
  alerts: number;
  systemLoad: number;
}

interface ChartWidgetProps {
  id: string;
  title?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  refreshInterval?: number;
}

const TIME_RANGES = {
  '1h': { label: 'Última Hora', minutes: 60 },
  '24h': { label: 'Últimas 24h', minutes: 1440 },
  '7d': { label: 'Últimos 7 dias', minutes: 10080 },
  '30d': { label: 'Últimos 30 dias', minutes: 43200 }
};

export const ChartWidget: React.FC<ChartWidgetProps> = ({ 
  id, 
  title = "Tendência de Detecções",
  timeRange = '24h',
  refreshInterval = 60000 // 1 minuto
}) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState(timeRange);

  const generateMockData = (range: string): ChartDataPoint[] => {
    const points = range === '1h' ? 60 : range === '24h' ? 24 : range === '7d' ? 7 : 30;
    const interval = range === '1h' ? 1 : range === '24h' ? 1 : 1;
    const unit = range === '1h' ? 'minutes' : 'hours';
    
    const data: ChartDataPoint[] = [];
    const now = new Date();
    
    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now);
      if (unit === 'minutes') {
        timestamp.setMinutes(timestamp.getMinutes() - (i * interval));
      } else {
        timestamp.setHours(timestamp.getHours() - (i * interval));
      }
      
      data.push({
        timestamp: range === '1h' 
          ? timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : range === '24h'
          ? timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : timestamp.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        detections: Math.floor(Math.random() * 50) + 10,
        alerts: Math.floor(Math.random() * 5) + 1,
        systemLoad: Math.floor(Math.random() * 30) + 40
      });
    }
    
    return data;
  };

  const fetchData = async () => {
    try {
      setError(null);
      
      // Simular carregamento
      // TODO: Substituir por chamada real da API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockData = generateMockData(selectedRange);
      setData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do gráfico');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchData();
  };

  const handleRangeChange = (range: string) => {
    setSelectedRange(range as '1h' | '24h' | '7d' | '30d');
    setIsLoading(true);
  };

  useEffect(() => {
    fetchData();
  }, [selectedRange]);

  useEffect(() => {
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, selectedRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const headerActions = (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <select
          value={selectedRange}
          onChange={(e) => handleRangeChange(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {Object.entries(TIME_RANGES).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <BaseWidget
      id={id}
      title={title}
      isLoading={isLoading}
      error={error || undefined}
      onRefresh={handleRefresh}
      headerActions={headerActions}
    >
      <div className="p-4">
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#666" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Line 
                type="monotone" 
                dataKey="detections" 
                stroke="#FF6B35" 
                strokeWidth={2}
                name="Detecções"
                dot={{ fill: '#FF6B35', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              
              <Line 
                type="monotone" 
                dataKey="alerts" 
                stroke="#EF4444" 
                strokeWidth={2}
                name="Alertas"
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              
              <Line 
                type="monotone" 
                dataKey="systemLoad" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Carga do Sistema (%)"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>Período: {TIME_RANGES[selectedRange as keyof typeof TIME_RANGES].label}</span>
          </div>
          <span>Atualizado: {new Date().toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>
    </BaseWidget>
  );
};
