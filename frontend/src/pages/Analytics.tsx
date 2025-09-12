// Página de Analytics conforme manual AIOS v2.0

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Download, Filter, TrendingUp, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { AUTH_CONFIG } from '../config/auth';

// Mock data para demonstração
const detectionData = [
  { name: 'Jan', pessoas: 1200, veiculos: 800, objetos: 450 },
  { name: 'Fev', pessoas: 1400, veiculos: 900, objetos: 520 },
  { name: 'Mar', pessoas: 1600, veiculos: 1100, objetos: 680 },
  { name: 'Abr', pessoas: 1800, veiculos: 1300, objetos: 720 },
  { name: 'Mai', pessoas: 2000, veiculos: 1500, objetos: 850 },
  { name: 'Jun', pessoas: 2200, veiculos: 1700, objetos: 920 },
];

const alertsData = [
  { name: 'Seg', criticos: 5, avisos: 12, info: 25 },
  { name: 'Ter', criticos: 3, avisos: 8, info: 18 },
  { name: 'Qua', criticos: 7, avisos: 15, info: 32 },
  { name: 'Qui', criticos: 2, avisos: 6, info: 14 },
  { name: 'Sex', criticos: 4, avisos: 10, info: 22 },
  { name: 'Sab', criticos: 1, avisos: 4, info: 8 },
  { name: 'Dom', criticos: 1, avisos: 3, info: 6 },
];

const deviceStatusData = [
  { name: 'Online', value: 85, color: '#4CAF50' },
  { name: 'Offline', value: 10, color: '#F44336' },
  { name: 'Manutenção', value: 5, color: '#FFC107' },
];

export const Analytics = () => {
  const { hasPermission } = useAuth();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedMetrics, setSelectedMetrics] = useState(['detections', 'alerts', 'devices']);

  useEffect(() => {
    // Definir range padrão (últimos 30 dias)
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }, []);

  const handleExport = () => {
    // Implementar exportação de dados
    console.log('Exportando dados...');
  };

  const canExport = hasPermission(AUTH_CONFIG.permissions.ANALYTICS_EXPORT);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Análise detalhada de dados e métricas do sistema</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
          {/* Filtros de Data */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <span className="text-gray-400">até</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          
          {canExport && (
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Métricas Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Detecções</p>
              <p className="text-2xl font-bold text-gray-900">12,480</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                +12% vs mês anterior
              </p>
            </div>
            <Eye className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alertas Críticos</p>
              <p className="text-2xl font-bold text-gray-900">23</p>
              <p className="text-sm text-red-600 flex items-center mt-1">
                <AlertTriangle className="w-4 h-4 mr-1" />
                +2 hoje
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dispositivos Ativos</p>
              <p className="text-2xl font-bold text-gray-900">142</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <CheckCircle className="w-4 h-4 mr-1" />
                98.6% uptime
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Eficiência</p>
              <p className="text-2xl font-bold text-gray-900">94.2%</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="w-4 h-4 mr-1" />
                +1.2% esta semana
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detecções por Categoria */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Detecções por Categoria (Últimos 6 meses)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={detectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="pessoas" fill="#FF6B35" />
              <Bar dataKey="veiculos" fill="#4CAF50" />
              <Bar dataKey="objetos" fill="#2196F3" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status dos Dispositivos */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Status dos Dispositivos
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={deviceStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {deviceStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Alertas por Dia */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Alertas por Dia (Última Semana)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={alertsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="criticos" stroke="#F44336" strokeWidth={2} />
            <Line type="monotone" dataKey="avisos" stroke="#FFC107" strokeWidth={2} />
            <Line type="monotone" dataKey="info" stroke="#2196F3" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabela de Dados Detalhados */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Dados Detalhados
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detecções
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alertas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dispositivos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eficiência
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.floor(Math.random() * 500) + 200}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.floor(Math.random() * 20) + 5}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {142 - Math.floor(Math.random() * 5)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(Math.random() * 10 + 90).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
