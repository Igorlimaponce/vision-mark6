// Barra de ferramentas do Pipeline Builder

import React, { useState } from 'react';
import { 
  Save, 
  Play, 
  Pause, 
  Square, 
  Settings, 
  CheckCircle, 
  AlertTriangle,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import type { Pipeline } from '../../types/pipeline';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface PipelineToolbarProps {
  pipeline: Pipeline;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  onSave: () => void;
  onExecute: () => void;
  onValidate: () => void;
  onPipelineInfoUpdate: (updates: Partial<Pipeline>) => void;
  validation: ValidationResult;
}

export const PipelineToolbar: React.FC<PipelineToolbarProps> = ({
  pipeline,
  hasUnsavedChanges,
  isLoading,
  onSave,
  onExecute,
  onValidate,
  onPipelineInfoUpdate,
  validation
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Square className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Pipeline info */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {pipeline.name}
              {hasUnsavedChanges && <span className="text-orange-500 ml-1">*</span>}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{pipeline.nodes.length} nós</span>
              <span>•</span>
              <span>{pipeline.connections.length} conexões</span>
              <span>•</span>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(pipeline.status)}`}>
                {getStatusIcon(pipeline.status)}
                <span className="capitalize">{pipeline.status}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            title="Informações do Pipeline"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Center - Actions */}
        <div className="flex items-center space-x-2">
          {/* Validation status */}
          <div className="flex items-center space-x-2">
            {validation.isValid ? (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Válido</span>
              </div>
            ) : (
              <button
                onClick={onValidate}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                title={`${validation.errors.length} erro(s) encontrado(s)`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{validation.errors.length} erro(s)</span>
              </button>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
            <button
              className="p-1 hover:bg-gray-100"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              className="p-1 hover:bg-gray-100"
              title="Resetar zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              className="p-1 hover:bg-gray-100"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right side - Main actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onSave}
            disabled={isLoading || !hasUnsavedChanges}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${hasUnsavedChanges && !isLoading
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>

          <button
            onClick={onExecute}
            disabled={isLoading || !validation.isValid}
            className={`
              px-4 py-2 rounded-md text-sm font-medium transition-colors
              ${validation.isValid && !isLoading
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Play className="w-4 h-4 mr-2" />
            {isLoading ? 'Executando...' : 'Executar'}
          </button>
        </div>
      </div>

      {/* Pipeline Info Panel */}
      {showInfo && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Pipeline
              </label>
              <input
                type="text"
                value={pipeline.name}
                onChange={(e) => onPipelineInfoUpdate({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={pipeline.status}
                onChange={(e) => onPipelineInfoUpdate({ status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="stopped">Parado</option>
                <option value="running">Executando</option>
                <option value="paused">Pausado</option>
                <option value="error">Erro</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                value={pipeline.description || ''}
                onChange={(e) => onPipelineInfoUpdate({ description: e.target.value })}
                placeholder="Descreva o propósito deste pipeline..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Settings Panel */}
      {showSettings && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Configurações do Pipeline</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FPS
              </label>
              <input
                type="number"
                value={pipeline.config.fps}
                onChange={(e) => onPipelineInfoUpdate({ 
                  config: { ...pipeline.config, fps: parseInt(e.target.value) }
                })}
                min="1"
                max="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolução
              </label>
              <select
                value={pipeline.config.resolution}
                onChange={(e) => onPipelineInfoUpdate({ 
                  config: { ...pipeline.config, resolution: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="640x480">640x480</option>
                <option value="1280x720">1280x720</option>
                <option value="1920x1080">1920x1080</option>
                <option value="3840x2160">4K</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buffer Size
              </label>
              <input
                type="number"
                value={pipeline.config.bufferSize}
                onChange={(e) => onPipelineInfoUpdate({ 
                  config: { ...pipeline.config, bufferSize: parseInt(e.target.value) }
                })}
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={pipeline.config.autoStart}
                onChange={(e) => onPipelineInfoUpdate({ 
                  config: { ...pipeline.config, autoStart: e.target.checked }
                })}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="ml-2 text-sm text-gray-700">Iniciar automaticamente</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
