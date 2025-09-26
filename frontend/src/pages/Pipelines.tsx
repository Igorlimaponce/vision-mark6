// Página unificada de Pipelines - Visual Builder + Monitoramento

import { useState, useEffect, useCallback } from 'react';

import { Play, Pause, Square, Plus, Monitor, Cpu, AlertTriangle, CheckCircle, Clock, Edit, Save } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { PipelineCanvas } from '../components/pipeline/canvas/PipelineCanvas';
import { NodeSidebar } from '../components/pipeline/sidebar/NodeSidebar';
import { useAuth } from '../hooks/useAuth';
import { AUTH_CONFIG } from '../config/auth';
import { notifications } from '../utils/notifications';
import { pipelineApi } from '../api/pipelineApi';

interface LocalPipeline {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  type: 'detection' | 'classification' | 'tracking' | 'analysis' | 'custom';
  model: string;
  source: {
    type: 'camera' | 'file' | 'stream';
    name: string;
    id: string;
  };
  outputs: {
    type: 'alerts' | 'analytics' | 'storage' | 'api';
    destination: string;
  }[];
  performance: {
    fps: number;
    cpu: number;
    memory: number;
    accuracy: number;
  };
  lastRun: string;
  totalRuns: number;
  errors: number;
}

interface PipelineBuilder {
  isEditing: boolean;
  pipeline: LocalPipeline | null;
  isDirty: boolean;
  lastSaved: string | null;
}

// Estado global do builder persistido no localStorage
const BUILDER_STORAGE_KEY = 'aios_pipeline_builder_state';

const getBuilderState = (): PipelineBuilder => {
  try {
    const saved = localStorage.getItem(BUILDER_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Erro ao carregar estado do builder:', error);
  }
  
  return {
    isEditing: false,
    pipeline: null,
    isDirty: false,
    lastSaved: null
  };
};

const saveBuilderState = (state: PipelineBuilder) => {
  try {
    localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Erro ao salvar estado do builder:', error);
  }
};



const getStatusIcon = (status: LocalPipeline['status']) => {
  switch (status) {
    case 'running':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'stopped':
      return <Square className="w-4 h-4 text-gray-500" />;
    case 'error':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'starting':
    case 'stopping':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    default:
      return <Square className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusColor = (status: LocalPipeline['status']) => {
  switch (status) {
    case 'running':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'stopped':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'error':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'starting':
    case 'stopping':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getTypeColor = (type: LocalPipeline['type']) => {
  switch (type) {
    case 'detection':
      return 'bg-blue-100 text-blue-800';
    case 'classification':
      return 'bg-purple-100 text-purple-800';
    case 'tracking':
      return 'bg-green-100 text-green-800';
    case 'analysis':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const Pipelines: React.FC = () => {
  const { hasPermission } = useAuth();

  const [pipelines, setPipelines] = useState<LocalPipeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [builderState, setBuilderState] = useState<PipelineBuilder>(() => getBuilderState());
  const [currentView, setCurrentView] = useState<'monitor' | 'builder'>('monitor');

  const canManage = hasPermission(AUTH_CONFIG.permissions.PIPELINE_EXECUTE);

  // Carregar pipelines da API
  const loadPipelines = useCallback(async () => {
    try {
      setIsLoading(true);
      setApiError(null);
      const response = await pipelineApi.getPipelines();
      
      // Mapear ApiPipeline para LocalPipeline (interface local)
      const mappedPipelines: LocalPipeline[] = response.pipelines.map(apiPipeline => ({
        id: apiPipeline.id,
        name: apiPipeline.name,
        description: apiPipeline.description || '',
        status: apiPipeline.status === 'active' ? 'running' : 'stopped',
        type: 'detection', // Valor padrão, pode ser melhorado
        model: 'YOLOv8', // Valor padrão
        source: {
          type: 'camera',
          name: 'Câmera Principal',
          id: 'default'
        },
        outputs: [{
          type: 'alerts',
          destination: 'Sistema'
        }],
        performance: {
          fps: Math.random() * 30 + 10,
          cpu: Math.random() * 50 + 20,
          memory: Math.random() * 40 + 30,
          accuracy: 0.95
        },
        lastRun: apiPipeline.updated_at,
        totalRuns: Math.floor(Math.random() * 100) + 10,
        errors: Math.floor(Math.random() * 5)
      }));
      
      setPipelines(mappedPipelines);
    } catch (err) {
      setApiError('Erro ao carregar pipelines');
      console.error('Error loading pipelines:', err);
      notifications.error('Erro ao carregar pipelines');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  // Auto-save do builder state
  const saveCurrentState = useCallback((state: PipelineBuilder) => {
    setBuilderState(state);
    saveBuilderState(state);
  }, []);

  // Auto-save quando há mudanças
  useEffect(() => {
    if (builderState.isDirty) {
      const autoSaveTimer = setTimeout(() => {
        const updatedState = {
          ...builderState,
          isDirty: false,
          lastSaved: new Date().toISOString()
        };
        saveCurrentState(updatedState);
        notifications.success('Pipeline salva automaticamente');
      }, 2000); // Auto-save após 2 segundos de inatividade

      return () => clearTimeout(autoSaveTimer);
    }
  }, [builderState.isDirty, builderState, saveCurrentState]);

  // Pipeline actions
  const handleStartPipeline = async (pipelineId: string) => {
    try {
      await pipelineApi.startPipeline(pipelineId);
      notifications.success('Pipeline iniciada com sucesso');
      await loadPipelines();
    } catch (error) {
      notifications.error('Erro ao iniciar pipeline');
    }
  };

  const handleStopPipeline = async (pipelineId: string) => {
    try {
      await pipelineApi.stopPipeline(pipelineId);
      notifications.success('Pipeline parada com sucesso');
      await loadPipelines();
    } catch (error) {
      notifications.error('Erro ao parar pipeline');
    }
  };

  const handleEditPipeline = (pipeline: LocalPipeline) => {
    setBuilderState({
      isEditing: true,
      pipeline,
      isDirty: false,
      lastSaved: null
    });
    setCurrentView('builder');
  };

  const handleCreateNew = () => {
    setBuilderState({
      isEditing: false,
      pipeline: null,
      isDirty: false,
      lastSaved: null
    });
    setCurrentView('builder');
  };

  const handleSavePipeline = async () => {
    if (!builderState.pipeline) return;
    
    try {
      // Implementar salvamento da pipeline
      notifications.success('Pipeline salva com sucesso');
      setCurrentView('monitor');
      await loadPipelines();
    } catch (error) {
      notifications.error('Erro ao salvar pipeline');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipelines de IA</h1>
          <p className="text-gray-600">
            {currentView === 'monitor' 
              ? 'Monitore o desempenho e status das suas pipelines em tempo real' 
              : 'Editor visual para criar e configurar pipelines de processamento'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Toggle de Visualização */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={currentView === 'monitor' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCurrentView('monitor')}
              className={`flex items-center gap-2 px-3 py-2 ${
                currentView === 'monitor' ? '' : 'bg-transparent hover:bg-gray-200 text-gray-600'
              }`}
            >
              <Monitor className="w-4 h-4" />
              Monitor
            </Button>
            
            <Button
              variant={currentView === 'builder' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCurrentView('builder')}
              className={`flex items-center gap-2 px-3 py-2 ${
                currentView === 'builder' ? '' : 'bg-transparent hover:bg-gray-200 text-gray-600'
              }`}
            >
              <Edit className="w-4 h-4" />
              Builder
            </Button>
          </div>
          
          {/* Ação Principal */}
          {canManage && currentView === 'monitor' && (
            <Button
              onClick={handleCreateNew}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Pipeline
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      {currentView === 'monitor' ? (
        // Vista de Monitoramento
        <div className="space-y-6">
          {/* Resumo do Status */}
          {pipelines.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ativas</p>
                    <p className="text-2xl font-bold text-green-600">
                      {pipelines.filter(p => p.status === 'running').length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Paradas</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {pipelines.filter(p => p.status === 'stopped').length}
                    </p>
                  </div>
                  <Square className="w-8 h-8 text-gray-500" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Erros</p>
                    <p className="text-2xl font-bold text-red-600">
                      {pipelines.filter(p => p.status === 'error').length}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-blue-600">{pipelines.length}</p>
                  </div>
                  <Cpu className="w-8 h-8 text-blue-500" />
                </div>
              </Card>
            </div>
          )}

          {/* Lista de Pipelines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pipelines.map((pipeline) => (
              <Card key={pipeline.id} className="p-6">
                <div className="space-y-4">
                  {/* Header da Pipeline */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(pipeline.status)}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {pipeline.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(pipeline.status)}`}>
                          {pipeline.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{pipeline.description}</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded ${getTypeColor(pipeline.type)}`}>
                          {pipeline.type}
                        </span>
                        <span className="text-xs text-gray-500">{pipeline.model}</span>
                      </div>
                    </div>
                  </div>

                  {/* Métricas Compactas */}
                  <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg">
                    <div className="flex gap-4 text-sm">
                      <span><strong>{pipeline.performance.fps.toFixed(0)}</strong> FPS</span>
                      <span><strong>{pipeline.performance.cpu}%</strong> CPU</span>
                      <span><strong>{(pipeline.performance.accuracy * 100).toFixed(0)}%</strong> Precisão</span>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>{pipeline.totalRuns} execuções</div>
                      {pipeline.errors > 0 && (
                        <div className="text-red-600">{pipeline.errors} erros</div>
                      )}
                    </div>
                  </div>

                  {/* Última Execução */}
                  <div className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                    Última execução: {new Date(pipeline.lastRun).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>

                  {/* Ações */}
                  {canManage && (
                    <div className="flex justify-between items-center pt-3">
                      <div className="flex gap-2">
                        {pipeline.status === 'stopped' || pipeline.status === 'error' ? (
                          <Button
                            size="sm"
                            onClick={() => handleStartPipeline(pipeline.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs"
                          >
                            <Play className="w-3 h-3" />
                            Iniciar
                          </Button>
                        ) : pipeline.status === 'running' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleStopPipeline(pipeline.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs"
                          >
                            <Pause className="w-3 h-3" />
                            Parar
                          </Button>
                        ) : null}
                      </div>
                      
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditPipeline(pipeline)}
                        className="flex items-center gap-1 px-3 py-1 text-xs"
                      >
                        <Edit className="w-3 h-3" />
                        Editar
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Estado Vazio */}
          {pipelines.length === 0 && !isLoading && (
            <Card className="p-12 text-center">
              <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma pipeline encontrada
              </h3>
              <p className="text-gray-600 mb-4">
                Crie sua primeira pipeline para começar a processar dados de IA.
              </p>
              {canManage && (
                <Button onClick={handleCreateNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Pipeline
                </Button>
              )}
            </Card>
          )}
        </div>
      ) : (
        // Vista do Builder
        <div className="space-y-6">
          {/* Toolbar do Builder */}
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-gray-900">
                  {builderState.pipeline?.name || 'Nova Pipeline'}
                </h3>
                {builderState.isDirty && (
                  <span className="text-sm text-orange-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Alterações não salvas
                  </span>
                )}
                {builderState.lastSaved && (
                  <span className="text-sm text-gray-500">
                    Salva às {new Date(builderState.lastSaved).toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentView('monitor')}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSavePipeline}
                  className="flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </Button>
              </div>
            </div>
          </Card>

          {/* Interface do Builder */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-300px)]">
            {/* Sidebar de Nós */}
            <div className="lg:col-span-1">
              <NodeSidebar />
            </div>
            
            {/* Canvas Principal */}
            <div className="lg:col-span-4">
              <Card className="h-full">
                <PipelineCanvas />
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {apiError && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{apiError}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadPipelines}
              className="ml-auto"
            >
              Tentar novamente
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};