// Página de Pipelines de IA conforme manual AIOS v2.0

import { useState } from 'react';
import { Play, Pause, Square, Plus, Settings, Monitor, Cpu, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { AUTH_CONFIG } from '../config/auth';
import { notifications } from '../utils/notifications';

interface Pipeline {
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

const mockPipelines: Pipeline[] = [
  {
    id: 'pipe-001',
    name: 'Detecção de Pessoas',
    description: 'Pipeline para detecção de pessoas em tempo real',
    status: 'running',
    type: 'detection',
    model: 'YOLO v8 - Person Detection',
    source: {
      type: 'camera',
      name: 'Câmera Principal',
      id: 'cam-001'
    },
    outputs: [
      { type: 'alerts', destination: 'Sistema de Alertas' },
      { type: 'analytics', destination: 'Dashboard Analytics' }
    ],
    performance: {
      fps: 28.5,
      cpu: 45,
      memory: 2048,
      accuracy: 94.2
    },
    lastRun: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    totalRuns: 15420,
    errors: 3
  },
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

const getStatusIcon = (status: Pipeline['status']) => {
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

const getStatusColor = (status: Pipeline['status']) => {
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

const getTypeColor = (type: Pipeline['type']) => {
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

export const PipelinesPage = () => {
  const { hasPermission } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>(mockPipelines);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canManage = hasPermission(AUTH_CONFIG.permissions.PIPELINE_EXECUTE);

  const handlePipelineAction = async (pipeline: Pipeline, action: 'start' | 'stop' | 'restart') => {
    if (!canManage) {
      notifications.error('Sem permissão para gerenciar pipelines');
      return;
    }

    const newStatus = action === 'start' ? 'starting' : action === 'stop' ? 'stopping' : 'starting';
    
    setPipelines(prev => prev.map(p => 
      p.id === pipeline.id ? { ...p, status: newStatus } : p
    ));

    try {
      // Simular chamada de API
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalStatus = action === 'start' || action === 'restart' ? 'running' : 'stopped';
      
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

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Cpu className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h2>
          <p className="text-gray-600">
            Você não tem permissão para gerenciar pipelines de IA.
          </p>
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
          <p className="text-gray-600">Gerencie e monitore pipelines de inteligência artificial</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Pipeline
        </Button>
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
                    onClick={() => setSelectedPipeline(pipeline)}
                    className="flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    Configurar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pipeline Details Modal */}
      {selectedPipeline && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Configurações do Pipeline - {selectedPipeline.name}
                </h3>
                <button
                  onClick={() => setSelectedPipeline(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Configurações Gerais</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Pipeline
                      </label>
                      <input
                        type="text"
                        value={selectedPipeline.name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição
                      </label>
                      <textarea
                        value={selectedPipeline.description}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Modelo de IA
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option>{selectedPipeline.model}</option>
                        <option>YOLO v8 - Object Detection</option>
                        <option>ResNet-50 - Classification</option>
                        <option>DeepSORT - Tracking</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Performance e Limites</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        FPS Máximo
                      </label>
                      <input
                        type="number"
                        defaultValue="30"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Limite de CPU (%)
                      </label>
                      <input
                        type="number"
                        defaultValue="80"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Limite de Memória (GB)
                      </label>
                      <input
                        type="number"
                        defaultValue="4"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Threshold de Confiança
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        defaultValue="0.8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedPipeline(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      notifications.success('Configurações salvas com sucesso');
                      setSelectedPipeline(null);
                    }}
                  >
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Pipeline Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Criar Novo Pipeline
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Pipeline *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Detecção de Intrusos"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Pipeline *
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Selecione o tipo</option>
                    <option value="detection">Detecção de Objetos</option>
                    <option value="classification">Classificação</option>
                    <option value="tracking">Rastreamento</option>
                    <option value="analysis">Análise</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo de IA *
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Selecione o modelo</option>
                    <option value="yolo-v8">YOLO v8 - Object Detection</option>
                    <option value="resnet-50">ResNet-50 - Classification</option>
                    <option value="deepsort">DeepSORT - Tracking</option>
                    <option value="custom">Modelo Personalizado</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fonte de Dados *
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Selecione a fonte</option>
                    <option value="cam-001">Câmera Principal</option>
                    <option value="cam-002">Câmera de Trânsito</option>
                    <option value="stream-001">Stream RTSP</option>
                    <option value="file">Arquivo de Vídeo</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    placeholder="Descreva o objetivo e funcionamento do pipeline"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </form>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      notifications.success('Pipeline criado com sucesso');
                      setShowCreateModal(false);
                    }}
                  >
                    Criar Pipeline
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
