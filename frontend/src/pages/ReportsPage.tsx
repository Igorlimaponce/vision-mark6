// Página de Relatórios conforme manual AIOS v2.0

import { useState } from 'react';
import { FileText, Download, BarChart, PieChart, TrendingUp, Users } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { AUTH_CONFIG } from '../config/auth';
import { notifications } from '../utils/notifications';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'fleet' | 'analytics' | 'alerts' | 'users' | 'custom';
  icon: React.ComponentType<{ className?: string }>;
  formats: string[];
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'fleet-status',
    name: 'Status da Frota',
    description: 'Relatório detalhado do status de todos os dispositivos',
    type: 'fleet',
    icon: BarChart,
    formats: ['PDF', 'Excel', 'CSV']
  },
  {
    id: 'analytics-summary',
    name: 'Resumo de Analytics',
    description: 'Análise de detecções e métricas de performance',
    type: 'analytics',
    icon: TrendingUp,
    formats: ['PDF', 'Excel']
  },
  {
    id: 'alerts-report',
    name: 'Relatório de Alertas',
    description: 'Histórico completo de alertas e incidentes',
    type: 'alerts',
    icon: FileText,
    formats: ['PDF', 'CSV']
  },
  {
    id: 'user-activity',
    name: 'Atividade de Usuários',
    description: 'Relatório de atividades e acessos dos usuários',
    type: 'users',
    icon: Users,
    formats: ['PDF', 'Excel']
  },
  {
    id: 'performance-metrics',
    name: 'Métricas de Performance',
    description: 'Análise detalhada de performance do sistema',
    type: 'analytics',
    icon: PieChart,
    formats: ['PDF', 'Excel', 'CSV']
  }
];

interface ReportConfig {
  templateId: string;
  dateRange: {
    start: string;
    end: string;
    preset: string;
  };
  format: string;
  includeCharts: boolean;
  includeRawData: boolean;
  filters: {
    deviceIds?: string[];
    userIds?: string[];
    alertTypes?: string[];
    organizations?: string[];
  };
}

export const ReportsPage = () => {
  const { hasPermission } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    templateId: '',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      preset: 'last-30-days'
    },
    format: 'PDF',
    includeCharts: true,
    includeRawData: false,
    filters: {}
  });

  const canExport = hasPermission(AUTH_CONFIG.permissions.ANALYTICS_EXPORT);

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setReportConfig(prev => ({
      ...prev,
      templateId: template.id,
      format: template.formats[0]
    }));
  };

  const handleDatePresetChange = (preset: string) => {
    const end = new Date().toISOString().split('T')[0];
    let start = '';

    switch (preset) {
      case 'today':
        start = end;
        break;
      case 'yesterday':
        start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'last-7-days':
        start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'last-30-days':
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'last-90-days':
        start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'custom':
        // Manter as datas atuais para seleção personalizada
        return;
      default:
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    setReportConfig(prev => ({
      ...prev,
      dateRange: { ...prev.dateRange, start, end, preset }
    }));
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) {
      notifications.error('Selecione um template de relatório');
      return;
    }

    setIsGenerating(true);

    try {
      // Simular geração de relatório
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Em uma implementação real, aqui seria feita a chamada para a API
      const reportData = {
        template: selectedTemplate.name,
        config: reportConfig,
        generatedAt: new Date().toISOString(),
        filename: `${selectedTemplate.id}-${reportConfig.dateRange.start}-${reportConfig.dateRange.end}.${reportConfig.format.toLowerCase()}`
      };

      console.log('Relatório gerado:', reportData);

      // Simular download do arquivo
      const blob = new Blob(['Conteúdo do relatório simulado'], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = reportData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notifications.success('Relatório gerado e baixado com sucesso');
    } catch (error) {
      notifications.error('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!canExport) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h2>
          <p className="text-gray-600">
            Você não tem permissão para gerar relatórios.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios e Exportação</h1>
        <p className="text-gray-600">Gere relatórios personalizados do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates de Relatório */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Templates de Relatório</h3>
            
            <div className="space-y-3">
              {reportTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-orange-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                        <div className="flex gap-1 mt-2">
                          {template.formats.map(format => (
                            <span
                              key={format}
                              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {format}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Configuração do Relatório */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configuração do Relatório
              {selectedTemplate && (
                <span className="text-orange-600 ml-2">- {selectedTemplate.name}</span>
              )}
            </h3>

            {!selectedTemplate ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Selecione um template de relatório para começar</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Período */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Período
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <select
                        value={reportConfig.dateRange.preset}
                        onChange={(e) => handleDatePresetChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="today">Hoje</option>
                        <option value="yesterday">Ontem</option>
                        <option value="last-7-days">Últimos 7 dias</option>
                        <option value="last-30-days">Últimos 30 dias</option>
                        <option value="last-90-days">Últimos 90 dias</option>
                        <option value="custom">Personalizado</option>
                      </select>
                    </div>
                    
                    {reportConfig.dateRange.preset === 'custom' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={reportConfig.dateRange.start}
                          onChange={(e) => setReportConfig(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, start: e.target.value }
                          }))}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="date"
                          value={reportConfig.dateRange.end}
                          onChange={(e) => setReportConfig(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, end: e.target.value }
                          }))}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Formato */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato de Exportação
                  </label>
                  <div className="flex gap-2">
                    {selectedTemplate.formats.map(format => (
                      <button
                        key={format}
                        onClick={() => setReportConfig(prev => ({ ...prev, format }))}
                        className={`px-3 py-2 text-sm rounded-md border ${
                          reportConfig.format === format
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opções */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Opções do Relatório
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="includeCharts"
                        checked={reportConfig.includeCharts}
                        onChange={(e) => setReportConfig(prev => ({ 
                          ...prev, 
                          includeCharts: e.target.checked 
                        }))}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label htmlFor="includeCharts" className="ml-2 text-sm text-gray-700">
                        Incluir gráficos e visualizações
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="includeRawData"
                        checked={reportConfig.includeRawData}
                        onChange={(e) => setReportConfig(prev => ({ 
                          ...prev, 
                          includeRawData: e.target.checked 
                        }))}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <label htmlFor="includeRawData" className="ml-2 text-sm text-gray-700">
                        Incluir dados brutos em anexo
                      </label>
                    </div>
                  </div>
                </div>

                {/* Filtros Específicos por Tipo */}
                {selectedTemplate.type === 'fleet' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filtros da Frota
                    </label>
                    <input
                      type="text"
                      placeholder="IDs dos dispositivos (separados por vírgula)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}

                {selectedTemplate.type === 'alerts' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipos de Alerta
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['critical', 'warning', 'info', 'success'].map(type => (
                        <div key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`alert-${type}`}
                            defaultChecked
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`alert-${type}`} className="ml-2 text-sm text-gray-700 capitalize">
                            {type === 'critical' ? 'Crítico' :
                             type === 'warning' ? 'Aviso' :
                             type === 'info' ? 'Info' : 'Sucesso'}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botão de Geração */}
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Gerando Relatório...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Gerar e Baixar Relatório
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Histórico de Relatórios */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Relatórios Recentes</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Relatório
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Formato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gerado em
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Status da Frota
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')} - {new Date().toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    PDF
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-orange-600 hover:text-orange-900">
                      <Download className="w-4 h-4" />
                    </button>
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
