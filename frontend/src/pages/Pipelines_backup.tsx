// Página unificada de Pipelines - Visual Builder + Monitoramento

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const stored = localStorage.getItem(BUILDER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
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

const clearBuilderState = () => {
  try {
    localStorage.removeItem(BUILDER_STORAGE_KEY);
  } catch (error) {
    console.warn('Erro ao limpar estado do builder:', error);
  }
};
  const getStatusIcon = (status: LocalPipeline['status']) => {
  {
    id: 'pipe-002',
    name: 'Classificação de Veículos',
    description: 'Classificação de tipos de veículos em vias urbanas',
    status: 'stopped',
    type: 'classification',
    model: 'ResNet-50 - Vehicle Classification',
    source: {
      type: 'camera',
      name: 'Câmera de Trânsito',
      id: 'cam-002'
    },
    outputs: [
      { type: 'analytics', destination: 'Relatórios de Trânsito' },
      { type: 'storage', destination: 'Base de Dados' }
    ],
    performance: {
      fps: 15.2,
      cpu: 32,
      memory: 1536,
      accuracy: 89.7
    },
    lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    totalRuns: 8765,
    errors: 12
  },
  {
    id: 'pipe-003',
    name: 'Tracking de Objetos',
    description: 'Rastreamento de objetos em movimento',
    status: 'error',
    type: 'tracking',
    model: 'DeepSORT - Object Tracking',
    source: {
      type: 'stream',
      name: 'Stream RTSP',
      id: 'stream-001'
    },
    outputs: [
      { type: 'alerts', destination: 'Sistema de Alertas' },
      { type: 'api', destination: 'API Externa' }
    ],
    performance: {
      fps: 0,
      cpu: 0,
      memory: 0,
      accuracy: 0
    },
    lastRun: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    totalRuns: 2340,
    errors: 45
  }
];

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
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<LocalPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [builderState, setBuilderState] = useState<PipelineBuilder>(() => getBuilderState());
  const [currentView, setCurrentView] = useState<'monitor' | 'builder'>('monitor');

  const canManage = hasPermission(AUTH_CONFIG.permissions.PIPELINE_EXECUTE);

  // Carregar pipelines da API
  const loadPipelines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
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
      setError('Erro ao carregar pipelines');
      console.error('Error loading pipelines:', err);
      notifications.error('Erro ao carregar pipelines');
    } finally {
      setLoading(false);
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

  // Detectar mudança de aba/navegação
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (builderState.isDirty) {
        const updatedState = {
          ...builderState,
          lastSaved: new Date().toISOString()
        };
        saveBuilderState(updatedState);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [builderState]);

  const handleNodeDragStart = (nodeType: string) => {
    console.log('Dragging node type:', nodeType);
    // Marcar como modificado quando usuário arrasta nós
    if (!builderState.isDirty) {
      const updatedState = { ...builderState, isDirty: true };
      setBuilderState(updatedState);
    }
  };

  const handlePipelineAction = async (pipeline: LocalPipeline, action: 'start' | 'stop' | 'restart') => {
    if (!canManage) {
      notifications.error('Sem permissão para gerenciar pipelines');
      return;
    }

    const newStatus = action === 'start' ? 'starting' : action === 'stop' ? 'stopping' : 'starting';
    
    setPipelines(prev => prev.map(p => 
      p.id === pipeline.id ? { ...p, status: newStatus } : p
    ));

    try {
      // Chamar API real
      let result;
      if (action === 'start') {
        result = await pipelineApi.startPipeline(pipeline.id);
      } else if (action === 'stop') {
        result = await pipelineApi.stopPipeline(pipeline.id);
      } else {
        // restart = stop + start
        await pipelineApi.stopPipeline(pipeline.id);
        result = await pipelineApi.startPipeline(pipeline.id);
      }

      const finalStatus = result.status === 'active' ? 'running' : 'stopped';
      
      setPipelines(prev => prev.map(p => 
        p.id === pipeline.id ? { 
          ...p, 
          status: finalStatus,
          lastRun: new Date().toISOString(),
          performance: finalStatus === 'running' ? {
            ...p.performance,
            fps: Math.random() * 30,
            cpu: Math.random() * 80,
            memory: Math.random() * 4096
          } : {
            fps: 0,
            cpu: 0,
            memory: 0,
            accuracy: p.performance.accuracy
          }
        } : p
      ));

      notifications.success(`Pipeline ${action === 'start' ? 'iniciado' : action === 'stop' ? 'parado' : 'reiniciado'} com sucesso`);
    } catch (error) {
      setPipelines(prev => prev.map(p => 
        p.id === pipeline.id ? { ...p, status: 'error' } : p
      ));
      notifications.error(`Erro ao ${action === 'start' ? 'iniciar' : action === 'stop' ? 'parar' : 'reiniciar'} pipeline`);
    }
  };

  const handleCreateNew = () => {
    const newState: PipelineBuilder = {
      isEditing: true,
      pipeline: null,
      isDirty: false,
      lastSaved: null
    };
    saveCurrentState(newState);
    setCurrentView('builder');
  };

  const handleEditPipeline = (pipeline: LocalPipeline) => {
    const newState: PipelineBuilder = {
      isEditing: true,
      pipeline,
      isDirty: false,
      lastSaved: null
    };
    saveCurrentState(newState);
    setCurrentView('builder');
  };

  const handleBackToMonitor = () => {
    if (builderState.isDirty) {
      if (window.confirm('Você tem alterações não salvas. Deseja salvar antes de sair?')) {
        const updatedState = {
          ...builderState,
          isDirty: false,
          lastSaved: new Date().toISOString()
        };
        saveCurrentState(updatedState);
      }
    }
    setCurrentView('monitor');
  };

  const handleFinishPipeline = () => {
    const finalState: PipelineBuilder = {
      isEditing: false,
      pipeline: null,
      isDirty: false,
      lastSaved: new Date().toISOString()
    };
    saveCurrentState(finalState);
    clearBuilderState();
    setCurrentView('monitor');
    notifications.success('Pipeline finalizada com sucesso!');
  };

  const handleManualSave = () => {
    const updatedState = {
      ...builderState,
      isDirty: false,
      lastSaved: new Date().toISOString()
    };
    saveCurrentState(updatedState);
    notifications.success('Pipeline salva manualmente');
  };

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Cpu className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h2>
          <p className="text-gray-600">
            Você não tem permissão para gerenciar pipelines.
          </p>
        </div>
      </div>
    );
  }

  // Renderizar Pipeline Builder
  if (currentView === 'builder') {
    return (
      <div className="fixed inset-0 bg-gray-50 flex flex-col z-40">
        {/* Header do Builder - Fixo */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                onClick={handleBackToMonitor}
                className="flex items-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                Voltar ao Monitor
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {builderState.pipeline ? `Editando: ${builderState.pipeline.name}` : 'Novo Pipeline'}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Arraste nós da sidebar para criar seu pipeline de IA</span>
                  {builderState.isDirty && (
                    <span className="text-orange-600 font-medium">• Não salvo</span>
                  )}
                  {builderState.lastSaved && (
                    <span className="text-green-600">
                      • Salvo em {new Date(builderState.lastSaved).toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="secondary"
                onClick={handleManualSave}
                disabled={!builderState.isDirty}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar
              </Button>
              <Button
                onClick={handleFinishPipeline}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Finalizar
              </Button>
            </div>
          </div>
        </div>

        {/* Builder Interface - Responsivo */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar com nós */}
          <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
            <NodeSidebar onNodeDragStart={handleNodeDragStart} />
          </div>
          
          {/* Canvas principal */}
          <div className="flex-1 overflow-hidden">
            <PipelineCanvas />
          </div>
        </div>
      </div>
    );
  }

  // Renderizar Monitor de Pipelines
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Pipelines</h1>
          <p className="text-gray-600">Monitor e controle de pipelines de IA</p>
          {builderState.isEditing && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-orange-600 font-medium">
                Você tem um pipeline em edição
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrentView('builder')}
                className="text-xs py-1 px-2"
              >
                Continuar Editando
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/pipeline-builder')}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Pipeline Builder Avançado
          </Button>
          <Button
            onClick={handleCreateNew}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar Novo Pipeline
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Pipelines</p>
              <p className="text-2xl font-bold text-gray-900">{pipelines.length}</p>
            </div>
            <Cpu className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Em Execução</p>
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
              <p className="text-sm font-medium text-gray-600">Com Erro</p>
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
              <p className="text-sm font-medium text-gray-600">FPS Médio</p>
              <p className="text-2xl font-bold text-blue-600">
                {(pipelines.reduce((acc, p) => acc + p.performance.fps, 0) / pipelines.length).toFixed(1)}
              </p>
            </div>
            <Monitor className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Pipelines List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipelines Ativos</h3>
        
        <div className="space-y-4">
          {pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">{pipeline.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(pipeline.status)}`}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(pipeline.status)}
                        {pipeline.status.charAt(0).toUpperCase() + pipeline.status.slice(1)}
                      </div>
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(pipeline.type)}`}>
                      {pipeline.type.charAt(0).toUpperCase() + pipeline.type.slice(1)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{pipeline.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Modelo:</span>
                      <p className="text-gray-600">{pipeline.model}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Fonte:</span>
                      <p className="text-gray-600">{pipeline.source.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Performance:</span>
                      <p className="text-gray-600">
                        {pipeline.performance.fps.toFixed(1)} FPS | 
                        {pipeline.performance.cpu}% CPU | 
                        {(pipeline.performance.memory / 1024).toFixed(1)}GB RAM
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Precisão:</span>
                      <p className="text-gray-600">{pipeline.performance.accuracy}%</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>Última execução: {new Date(pipeline.lastRun).toLocaleString('pt-BR')}</span>
                    <span>Total de execuções: {pipeline.totalRuns.toLocaleString()}</span>
                    <span>Erros: {pipeline.errors}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {pipeline.status === 'running' ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePipelineAction(pipeline, 'stop')}
                        className="flex items-center gap-1"
                      >
                        <Pause className="w-3 h-3" />
                        Parar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePipelineAction(pipeline, 'restart')}
                        className="flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Reiniciar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePipelineAction(pipeline, 'start')}
                      disabled={pipeline.status === 'starting' || pipeline.status === 'stopping'}
                      className="flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      Iniciar
                    </Button>
                  )}
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEditPipeline(pipeline)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Editar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
