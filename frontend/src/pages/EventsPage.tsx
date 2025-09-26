import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Eye, 
  Settings, 
  Wrench, 
  Shield, 
  Activity,
  Check,
  X,
  Filter,
  RefreshCw,
  Clock,
  MapPin
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { eventsApi } from '../api/eventsApi';
import type { Event, EventsSummary } from '../api/eventsApi';
import { useAuth } from '../hooks/useAuth';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

export const EventsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [summary, setSummary] = useState<EventsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    severity: '',
    acknowledged: undefined as boolean | undefined,
  });

  // Carregar dados de eventos
  useEffect(() => {
    loadEventsData();
  }, [filters]);

  const loadEventsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Carregar eventos com filtros
      const [eventsData, summaryData] = await Promise.all([
        eventsApi.getEvents({
          event_type: filters.type || undefined,
          severity: filters.severity || undefined,
          acknowledged: filters.acknowledged,
          limit: 100
        }),
        eventsApi.getEventsSummary(24)
      ]);
      
      setEvents(eventsData.events);
      setSummary(summaryData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar eventos';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    toast.success('Atualizando eventos...');
    loadEventsData();
  };

  const handleAcknowledge = async (eventId: string) => {
    try {
      await eventsApi.acknowledgeEvent(eventId);
      toast.success('Evento marcado como reconhecido');
      loadEventsData(); // Recarregar para mostrar mudança
    } catch (error) {
      toast.error('Erro ao reconhecer evento');
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!hasPermission('admin:delete')) {
      toast.error('Você não tem permissão para deletar eventos');
      return;
    }

    try {
      await eventsApi.deleteEvent(eventId);
      toast.success('Evento deletado');
      loadEventsData();
    } catch (error) {
      toast.error('Erro ao deletar evento');
    }
  };

  // Função para obter ícone do tipo
  const getTypeIcon = (type: string) => {
    const icons = {
      detection: Eye,
      alert: AlertTriangle,
      system: Settings,
      maintenance: Wrench,
      security: Shield,
      performance: Activity
    };
    return icons[type as keyof typeof icons] || AlertTriangle;
  };

  // Função para obter cor da severidade
  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      high: 'text-red-600 bg-red-100',
      critical: 'text-red-800 bg-red-200'
    };
    return colors[severity as keyof typeof colors] || 'text-gray-600 bg-gray-100';
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
          <Button onClick={loadEventsData}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Eventos e Alertas</h1>
          <p className="text-gray-600">Monitoramento de eventos do sistema AIOS</p>
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
        </div>
      </div>

      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Eventos</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_events}</p>
              </div>
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-red-600">{summary.pending}</p>
              </div>
              <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reconhecidos</p>
                <p className="text-2xl font-bold text-green-600">{summary.acknowledged}</p>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Críticos</p>
                <p className="text-2xl font-bold text-red-800">{summary.by_severity.critical || 0}</p>
              </div>
              <div className="h-10 w-10 bg-red-200 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-800" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros:</span>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Todos os tipos</option>
            <option value="detection">Detecção</option>
            <option value="alert">Alerta</option>
            <option value="system">Sistema</option>
            <option value="maintenance">Manutenção</option>
            <option value="security">Segurança</option>
            <option value="performance">Performance</option>
          </select>

          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Todas as severidades</option>
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>

          <select
            value={filters.acknowledged === undefined ? '' : filters.acknowledged.toString()}
            onChange={(e) => setFilters({ 
              ...filters, 
              acknowledged: e.target.value === '' ? undefined : e.target.value === 'true' 
            })}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Todos os status</option>
            <option value="false">Pendentes</option>
            <option value="true">Reconhecidos</option>
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFilters({ type: '', severity: '', acknowledged: undefined })}
          >
            Limpar
          </Button>
        </div>
      </Card>

      {/* Lista de Eventos */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Eventos ({events.length})
        </h2>
        
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => {
              const TypeIcon = getTypeIcon(event.type);
              const severityClass = getSeverityColor(event.severity);
              
              return (
                <Card key={event.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <TypeIcon className="w-5 h-5 text-gray-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityClass}`}>
                            {event.severity.toUpperCase()}
                          </span>
                          {event.acknowledged && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full text-green-700 bg-green-100">
                              RECONHECIDO
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {event.device_name && (
                            <div className="flex items-center gap-1">
                              <Settings className="w-3 h-3" />
                              {event.device_name}
                            </div>
                          )}
                          
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(event.created_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </div>
                        </div>
                        
                        {event.acknowledged && event.acknowledged_by && (
                          <p className="text-xs text-green-600 mt-1">
                            Reconhecido por {event.acknowledged_by} • {
                              formatDistanceToNow(new Date(event.acknowledged_at!), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!event.acknowledged && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAcknowledge(event.id)}
                          className="flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Reconhecer
                        </Button>
                      )}
                      
                      {hasPermission('admin:delete') && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(event.id)}
                          className="flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Deletar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">
              Nenhum evento encontrado com os filtros selecionados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};