import { useState, useEffect } from 'react';
import { BarChart3, Users, Activity, AlertTriangle, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { 
  VehicleCountWidget, 
  DetectionTrendsWidget
} from '../components/dashboard/widgets';
import { RealTimeMetrics } from '../components/dashboard/RealTimeMetrics';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardMetrics, DevicesStatusData, RecentEvent, PipelineStats } from '../api/dashboardApi';
import { useAuth } from '../hooks/useAuth';
import { AUTH_CONFIG } from '../config/auth';
import { notifications } from '../utils/notifications';
import toast from 'react-hot-toast';

// Dados mock para analytics
const detectionData = [
  { name: 'Jan', deteccoes: 1240, alertas: 45 },
  { name: 'Fev', deteccoes: 1890, alertas: 67 },
  { name: 'Mar', deteccoes: 2100, alertas: 89 },
  { name: 'Abr', deteccoes: 1750, alertas: 34 },
  { name: 'Mai', deteccoes: 2300, alertas: 78 },
  { name: 'Jun', deteccoes: 2800, alertas: 123 }
];



const performanceData = [
  { hora: '00:00', cpu: 35, memoria: 45, fps: 28 },
  { hora: '04:00', cpu: 32, memoria: 42, fps: 30 },
  { hora: '08:00', cpu: 55, memoria: 68, fps: 25 },
  { hora: '12:00', cpu: 78, memoria: 82, fps: 22 },
  { hora: '16:00', cpu: 65, memoria: 75, fps: 24 },
  { hora: '20:00', cpu: 48, memoria: 58, fps: 27 }
];

export const Dashboard: React.FC = () => {
  const { hasPermission } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [devicesStatus, setDevicesStatus] = useState<DevicesStatusData | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const canExport = hasPermission(AUTH_CONFIG.permissions.ANALYTICS_EXPORT);

  // Carregar dados do dashboard
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Carregar todos os dados do dashboard
      const [metricsData, devicesStatusData, eventsData, pipelineData] = await Promise.all([
        dashboardApi.getMetrics(),
        dashboardApi.getDevicesStatus(),
        dashboardApi.getRecentEvents(),
        dashboardApi.getPipelineStats()
      ]);
      
      setMetrics(metricsData);
      setDevicesStatus(devicesStatusData);
      setRecentEvents(eventsData);
      setPipelineStats(pipelineData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dashboard';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    toast.success('Atualizando dados...');
    loadDashboardData();
  };

  const handleExport = (format: string) => {
    notifications.success(`Exportando dados em formato ${format}...`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadDashboardData}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard & Analytics</h1>
          <p className="text-gray-600">Visão geral e análise detalhada do sistema AIOS</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
          
          {canExport && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('PDF')}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('Excel')}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Excel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Métricas de Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Dispositivos */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Dispositivos</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.devices.total || 0}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Dispositivos Online */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dispositivos Online</p>
              <p className="text-2xl font-bold text-green-600">{metrics?.devices.online || 0}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Pipelines Ativas */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pipelines Ativas</p>
              <p className="text-2xl font-bold text-orange-600">{metrics?.system.active_pipelines || 0}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        {/* Alertas */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dispositivos com Alertas</p>
              <p className="text-2xl font-bold text-yellow-600">{metrics?.devices.warning || 0}</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Real-time System Metrics */}
      <RealTimeMetrics />
      
      {/* Widgets de Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VehicleCountWidget />
        <DetectionTrendsWidget />
      </div>

      {/* Analytics Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Detecções por Mês */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tendências de Detecção</h3>
            <BarChart3 className="w-5 h-5 text-orange-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={detectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="deteccoes" fill="#FF6B35" />
              <Bar dataKey="alertas" fill="#FFA500" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status dos Dispositivos */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Status dos Dispositivos</h3>
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Online', value: devicesStatus?.data.online || 0, color: '#10B981' },
                  { name: 'Warning', value: devicesStatus?.data.warning || 0, color: '#F59E0B' },
                  { name: 'Offline', value: devicesStatus?.data.offline || 0, color: '#EF4444' }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: 'Online', value: devicesStatus?.data.online || 0, color: '#10B981' },
                  { name: 'Warning', value: devicesStatus?.data.warning || 0, color: '#F59E0B' },
                  { name: 'Offline', value: devicesStatus?.data.offline || 0, color: '#EF4444' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-4">
              {[
                { name: 'Online', value: devicesStatus?.data.online || 0, color: '#10B981' },
                { name: 'Warning', value: devicesStatus?.data.warning || 0, color: '#F59E0B' },
                { name: 'Offline', value: devicesStatus?.data.offline || 0, color: '#EF4444' }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Performance do Sistema */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance do Sistema (24h)</h3>
          <TrendingUp className="w-5 h-5 text-blue-500" />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hora" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="cpu" stackId="1" stroke="#FF6B35" fill="#FF6B35" fillOpacity={0.6} />
            <Area type="monotone" dataKey="memoria" stackId="1" stroke="#FFA500" fill="#FFA500" fillOpacity={0.6} />
            <Area type="monotone" dataKey="fps" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Detecções Hoje</p>
              <p className="text-2xl font-bold text-gray-900">2,847</p>
              <p className="text-xs text-green-600">+12% vs ontem</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alertas Ativos</p>
              <p className="text-2xl font-bold text-gray-900">7</p>
              <p className="text-xs text-red-600">3 críticos</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dispositivos Online</p>
              <p className="text-2xl font-bold text-gray-900">85/100</p>
              <p className="text-xs text-green-600">85% disponibilidade</p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">FPS Médio</p>
              <p className="text-2xl font-bold text-gray-900">26.4</p>
              <p className="text-xs text-yellow-600">-2% vs média</p>
            </div>
            <BarChart3 className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>
    </div>
  );
};
