import { Card } from '../../common';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon = Activity,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600'
  };

  const changeColorClasses = {
    increase: 'text-green-600',
    decrease: 'text-red-600'
  };

  return (
    <Card className="h-32">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          
          {change && (
            <div className={`flex items-center mt-1 text-sm ${changeColorClasses[change.type]}`}>
              <span>{change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%</span>
              <span className="text-gray-500 ml-1">vs ontem</span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </Card>
  );
};

// Componentes específicos para diferentes métricas
export const DeviceStatusMetrics: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Dispositivos Online"
        value="127"
        change={{ value: 5.2, type: 'increase' }}
        icon={CheckCircle}
        color="green"
      />
      
      <MetricCard
        title="Dispositivos Offline"
        value="8"
        change={{ value: 2.1, type: 'decrease' }}
        icon={XCircle}
        color="red"
      />
      
      <MetricCard
        title="Alertas Ativos"
        value="23"
        change={{ value: 12.5, type: 'increase' }}
        icon={AlertTriangle}
        color="yellow"
      />
      
      <MetricCard
        title="Detecções/Hora"
        value="1,247"
        change={{ value: 8.3, type: 'increase' }}
        icon={Activity}
        color="blue"
      />
    </div>
  );
};
