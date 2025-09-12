import React, { useState, useEffect } from 'react';
import { pipelinesApi } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

interface PipelineMonitorProps {
  pipelineId: string;
  onStatusChange?: (status: any) => void;
}

interface ExecutionStats {
  total_frames_processed: number;
  frames_per_second: number;
  average_processing_time: number;
  total_detections: number;
  errors_count: number;
  uptime: number;
}

interface PipelineExecutionStatus {
  pipeline_id: string;
  status: 'stopped' | 'starting' | 'running' | 'paused' | 'stopping' | 'error';
  error_message?: string;
  stats: ExecutionStats;
  nodes: Record<string, any>;
  last_frame_time?: number;
}

export const PipelineMonitor: React.FC<PipelineMonitorProps> = ({
  pipelineId,
  onStatusChange
}) => {
  const [status, setStatus] = useState<PipelineExecutionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket hook para atualizações em tempo real
  const {
    isConnected,
    connect,
    onPipelineStatusUpdate,
    onPipelineError,
    onPipelineAnalytics,
  } = useWebSocket();

  // Conectar ao WebSocket e registrar callbacks
  useEffect(() => {
    if (!pipelineId) return;

    // Conectar ao WebSocket se não estiver conectado
    if (!isConnected) {
      connect();
    }

    // Registrar callback para atualizações de status
    const unsubscribeStatus = onPipelineStatusUpdate((data) => {
      if (data.pipeline_id === pipelineId) {
        // Atualizar com base no status recebido
        if (data.detailed_status) {
          const updatedStatus: PipelineExecutionStatus = {
            pipeline_id: data.pipeline_id,
            status: data.status as PipelineExecutionStatus['status'],
            error_message: data.detailed_status.error_message,
            stats: data.detailed_status.stats || status?.stats || {
              total_frames_processed: 0,
              frames_per_second: 0,
              average_processing_time: 0,
              total_detections: 0,
              errors_count: 0,
              uptime: 0,
            },
            nodes: data.detailed_status.nodes || {},
            last_frame_time: data.detailed_status.last_frame_time,
          };
          setStatus(updatedStatus);
          onStatusChange?.(updatedStatus);
        }
      }
    });

    // Registrar callback para erros
    const unsubscribeError = onPipelineError((data) => {
      if (data.pipeline_id === pipelineId) {
        setError(data.error_message);
        setStatus(prev => prev ? {
          ...prev,
          status: 'error',
          error_message: data.error_message
        } : null);
      }
    });

    // Registrar callback para analytics/métricas
    const unsubscribeAnalytics = onPipelineAnalytics((data) => {
      if (data.pipeline_id === pipelineId) {
        // Atualizar estatísticas com base nos analytics recebidos
        setStatus(prev => prev ? {
          ...prev,
          stats: {
            ...prev.stats,
            // Atualizar contadores baseados nos analytics
            total_detections: data.analytics.people_count 
              ? prev.stats.total_detections + (data.analytics.people_count || 0)
              : prev.stats.total_detections,
          }
        } : null);
      }
    });

    // Buscar status inicial
    const fetchInitialStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const statusData = await pipelinesApi.getExecutionStatus(pipelineId);
        setStatus(statusData);
        onStatusChange?.(statusData);
      } catch (err) {
        console.error('Erro ao buscar status do pipeline:', err);
        setError('Erro ao buscar status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialStatus();

    // Cleanup
    return () => {
      unsubscribeStatus();
      unsubscribeError();
      unsubscribeAnalytics();
    };
  }, [pipelineId, onStatusChange, isConnected, connect, onPipelineStatusUpdate, onPipelineError, onPipelineAnalytics]);

  // WebSocket para atualizações de frames em tempo real
  useEffect(() => {
    if (!pipelineId) return;

    // Adicionar callback para frames para manter FPS atualizado
    const { onPipelineFrameUpdate } = useWebSocket();
    
    const unsubscribeFrame = onPipelineFrameUpdate((data) => {
      if (data.pipeline_id === pipelineId) {
        setStatus(prev => prev ? {
          ...prev,
          stats: {
            ...prev.stats,
            frames_per_second: data.frame_data.fps,
            total_frames_processed: prev.stats.total_frames_processed + 1,
            average_processing_time: data.frame_data.processing_time,
            total_detections: prev.stats.total_detections + data.frame_data.detections_count,
          },
          last_frame_time: data.frame_data.timestamp,
        } : null);
      }
    });

    return () => {
      unsubscribeFrame();
    };
  }, [pipelineId]);

  const handleStart = async () => {
    try {
      setIsLoading(true);
      await pipelinesApi.execute(pipelineId);
      // Status será atualizado pelo polling
    } catch (err) {
      console.error('Erro ao iniciar pipeline:', err);
      setError('Erro ao iniciar pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setIsLoading(true);
      await pipelinesApi.stop(pipelineId);
      // Status será atualizado pelo polling
    } catch (err) {
      console.error('Erro ao parar pipeline:', err);
      setError('Erro ao parar pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setIsLoading(true);
      await pipelinesApi.pause(pipelineId);
    } catch (err) {
      console.error('Erro ao pausar pipeline:', err);
      setError('Erro ao pausar pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setIsLoading(true);
      await pipelinesApi.resume(pipelineId);
    } catch (err) {
      console.error('Erro ao resumir pipeline:', err);
      setError('Erro ao resumir pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'starting':
      case 'stopping':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading && !status) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">
          <h3 className="text-lg font-semibold mb-2">Erro</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-500">
          <h3 className="text-lg font-semibold mb-2">Pipeline Parado</h3>
          <p>O pipeline não está em execução.</p>
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Iniciando...' : 'Iniciar Pipeline'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header com Status */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Status do Pipeline
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.status)}`}>
              {status.status.toUpperCase()}
            </span>
          </div>

          {/* Controles */}
          <div className="flex space-x-2">
            {status.status === 'stopped' && (
              <button
                onClick={handleStart}
                disabled={isLoading}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                Iniciar
              </button>
            )}
            
            {status.status === 'running' && (
              <>
                <button
                  onClick={handlePause}
                  disabled={isLoading}
                  className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 text-sm"
                >
                  Pausar
                </button>
                <button
                  onClick={handleStop}
                  disabled={isLoading}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  Parar
                </button>
              </>
            )}
            
            {status.status === 'paused' && (
              <>
                <button
                  onClick={handleResume}
                  disabled={isLoading}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  Continuar
                </button>
                <button
                  onClick={handleStop}
                  disabled={isLoading}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  Parar
                </button>
              </>
            )}
          </div>
        </div>

        {status.error_message && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{status.error_message}</p>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {status.stats.frames_per_second.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500">FPS</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {status.stats.total_frames_processed.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Frames</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {status.stats.total_detections.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">Detecções</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {formatUptime(status.stats.uptime)}
          </div>
          <div className="text-sm text-gray-500">Tempo Ativo</div>
        </div>
      </div>

      {/* Métricas Detalhadas */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tempo Médio de Processamento:</span>
                <span className="font-medium">{status.stats.average_processing_time.toFixed(2)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Erros:</span>
                <span className="font-medium text-red-600">{status.stats.errors_count}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Nós Ativos</h4>
            <div className="text-sm text-gray-600">
              {Object.keys(status.nodes).length} nó(s) em execução
            </div>
            {Object.keys(status.nodes).length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(status.nodes).slice(0, 3).map(([nodeId, nodeStatus]: [string, any]) => (
                  <div key={nodeId} className="flex justify-between text-xs">
                    <span className="truncate">{nodeId}</span>
                    <span className={`font-medium ${nodeStatus.is_running ? 'text-green-600' : 'text-gray-500'}`}>
                      {nodeStatus.is_running ? 'Ativo' : 'Parado'}
                    </span>
                  </div>
                ))}
                {Object.keys(status.nodes).length > 3 && (
                  <div className="text-xs text-gray-400">
                    +{Object.keys(status.nodes).length - 3} mais...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
