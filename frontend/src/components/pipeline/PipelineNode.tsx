// Componente individual de nó no pipeline

import React, { useCallback, useState } from 'react';
import { Trash2, Settings, Play, AlertCircle } from 'lucide-react';
import type { PipelineNodeData, NodePosition } from '../../types/pipeline';

interface PipelineNodeProps {
  node: PipelineNodeData;
  isSelected: boolean;
  isConnecting: boolean;
  onSelect: () => void;
  onMove: (position: NodePosition) => void;
  onDelete: () => void;
  onConnectionStart: (nodeId: string, handleId: string, handleType: 'source' | 'target') => void;
  onConnectionEnd: (nodeId: string, handleId: string, handleType: 'source' | 'target') => void;
  onConnectionCancel: () => void;
}

export const PipelineNode: React.FC<PipelineNodeProps> = ({
  node,
  isSelected,
  isConnecting,
  onSelect,
  onMove,
  onDelete,
  onConnectionStart,
  onConnectionEnd,
  onConnectionCancel
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Determinar cor baseada na categoria
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'input': return 'border-blue-500 bg-blue-50';
      case 'processing': return 'border-green-500 bg-green-50';
      case 'analytics': return 'border-purple-500 bg-purple-50';
      case 'output': return 'border-red-500 bg-red-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  // Determinar ícone baseado no tipo
  const getNodeIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      camera_input: '📹',
      webcam_input: '🎥',
      video_file_input: '🎬',
      image_input: '🖼️',
      yolo_detection: '🎯',
      face_detection: '👤',
      motion_detection: '🏃',
      people_counting: '👥',
      statistics: '📊',
      heatmap: '🔥',
      event_aggregator: '📋',
      database_storage: '💾',
      file_export: '📁',
      alert_system: '🚨',
      webhook: '🔗',
      live_display: '📺'
    };
    return iconMap[type] || '⚙️';
  };

  // Handler para mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Botão esquerdo
      setIsDragging(true);
      setDragStart({ x: e.clientX - node.position.x, y: e.clientY - node.position.y });
      onSelect();
      e.stopPropagation();
    }
  }, [node.position, onSelect]);

  // Handler para mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      onMove(newPosition);
    }
  }, [isDragging, dragStart, onMove]);

  // Handler para mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handler para início de conexão (output handle)
  const handleOutputMouseDown = useCallback((e: React.MouseEvent, outputId: string) => {
    e.stopPropagation();
    onConnectionStart(node.id, outputId, 'source');
  }, [node.id, onConnectionStart]);

  // Handler para fim de conexão (input handle)
  const handleInputMouseUp = useCallback((e: React.MouseEvent, inputId: string) => {
    e.stopPropagation();
    if (isConnecting) {
      onConnectionEnd(node.id, inputId, 'target');
    }
  }, [node.id, isConnecting, onConnectionEnd]);

  // Handler para cancelar conexão
  const handleMouseLeave = useCallback(() => {
    if (isConnecting) {
      onConnectionCancel();
    }
  }, [isConnecting, onConnectionCancel]);

  return (
    <div
      className={`
        absolute select-none cursor-move
        ${isDragging ? 'opacity-80' : ''}
      `}
      style={{
        left: node.position.x,
        top: node.position.y,
        zIndex: isSelected ? 1000 : 1
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Node Card */}
      <div
        className={`
          w-64 bg-white rounded-lg shadow-lg border-2 transition-all
          ${isSelected ? 'ring-2 ring-orange-500 ring-offset-2' : ''}
          ${getCategoryColor(node.category)}
          ${node.hasError ? 'border-red-500 bg-red-50' : ''}
          ${node.isExecuting ? 'animate-pulse' : ''}
        `}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{getNodeIcon(node.type)}</span>
              <div>
                <h4 className="font-medium text-gray-900 text-sm">{node.name}</h4>
                <p className="text-xs text-gray-500">{node.category}</p>
              </div>
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center space-x-1">
              {node.isExecuting && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
              {node.hasError && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* Inputs */}
        {node.inputs.length > 0 && (
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-600 mb-1">Entradas</div>
            <div className="space-y-1">
              {node.inputs.map(input => (
                <div key={input.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full border-2 border-blue-400 bg-white cursor-pointer hover:bg-blue-100 transition-colors"
                      onMouseUp={(e) => handleInputMouseUp(e, input.id)}
                      title={`${input.label} (${input.type})`}
                    />
                    <span className="text-xs text-gray-600">{input.label}</span>
                  </div>
                  {input.required && (
                    <span className="text-xs text-red-500">*</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outputs */}
        {node.outputs.length > 0 && (
          <div className="px-3 py-2">
            <div className="text-xs font-medium text-gray-600 mb-1">Saídas</div>
            <div className="space-y-1">
              {node.outputs.map(output => (
                <div key={output.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{output.label}</span>
                  <div
                    className="w-3 h-3 rounded-full border-2 border-green-400 bg-white cursor-pointer hover:bg-green-100 transition-colors"
                    onMouseDown={(e) => handleOutputMouseDown(e, output.id)}
                    title={`${output.label} (${output.type})`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {node.hasError && node.errorMessage && (
          <div className="px-3 py-2 bg-red-50 border-t border-red-200">
            <p className="text-xs text-red-600">{node.errorMessage}</p>
          </div>
        )}

        {/* Actions */}
        {isSelected && (
          <div className="absolute -top-10 right-0 flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Open settings
              }}
              className="p-1 bg-white rounded shadow border border-gray-300 hover:bg-gray-50"
              title="Configurações"
            >
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Execute node
              }}
              className="p-1 bg-white rounded shadow border border-gray-300 hover:bg-gray-50"
              title="Executar"
            >
              <Play className="w-4 h-4 text-green-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 bg-white rounded shadow border border-gray-300 hover:bg-red-50"
              title="Deletar"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
