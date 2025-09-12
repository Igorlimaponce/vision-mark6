// Barra de ferramentas para o Editor de Geometria
// Permite selecionar ferramentas de desenho e configurar opções

import React from 'react';
import { 
  MousePointer, 
  Square, 
  Circle, 
  Triangle, 
  Minus, 
  Trash2, 
  Save, 
  Undo, 
  Redo,
  Eye,
  EyeOff,
  Grid3X3,
  Move,
  Palette
} from 'lucide-react';
import type { DrawingTool, GeometryShape } from './GeometryEditor';

interface GeometryToolbarProps {
  selectedTool: DrawingTool;
  onToolSelect: (tool: DrawingTool) => void;
  selectedShape?: GeometryShape | null;
  shapes: GeometryShape[];
  onShapesChange?: (shapes: GeometryShape[]) => void;
  onClearAll?: () => void;
  onSave?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  snapToGrid?: boolean;
  onToggleSnap?: () => void;
  className?: string;
}

const TOOL_CONFIG = {
  select: { icon: MousePointer, label: 'Selecionar', shortcut: 'V' },
  polygon: { icon: Triangle, label: 'Polígono', shortcut: 'P' },
  rectangle: { icon: Square, label: 'Retângulo', shortcut: 'R' },
  circle: { icon: Circle, label: 'Círculo', shortcut: 'C' },
  line: { icon: Minus, label: 'Linha', shortcut: 'L' },
  move: { icon: Move, label: 'Mover', shortcut: 'M' }
};

const COLORS = [
  '#FF6B35', // Laranja AIOS
  '#22C55E', // Verde
  '#3B82F6', // Azul
  '#EF4444', // Vermelho
  '#F59E0B', // Amarelo
  '#8B5CF6', // Roxo
  '#EC4899', // Rosa
  '#06B6D4'  // Ciano
];

export const GeometryToolbar: React.FC<GeometryToolbarProps> = ({
  selectedTool,
  onToolSelect,
  selectedShape,
  shapes,
  onShapesChange,
  onClearAll,
  onSave,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  showGrid = false,
  onToggleGrid,
  snapToGrid = false,
  onToggleSnap,
  className = ''
}) => {

  const handleDeleteSelected = () => {
    if (!selectedShape || !onShapesChange) return;
    
    const newShapes = shapes.filter(shape => shape.id !== selectedShape.id);
    onShapesChange(newShapes);
  };

  const handleToggleVisibility = () => {
    if (!selectedShape || !onShapesChange) return;
    
    const newShapes = shapes.map(shape => 
      shape.id === selectedShape.id 
        ? { ...shape, isVisible: !shape.isVisible }
        : shape
    );
    onShapesChange(newShapes);
  };

  const handleColorChange = (color: string) => {
    if (!selectedShape || !onShapesChange) return;
    
    const newShapes = shapes.map(shape => 
      shape.id === selectedShape.id 
        ? { ...shape, color }
        : shape
    );
    onShapesChange(newShapes);
  };

  const getVisibleShapesCount = () => {
    return shapes.filter(shape => shape.isVisible).length;
  };

  const getTotalShapesCount = () => {
    return shapes.length;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Ferramentas de desenho */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
          {Object.entries(TOOL_CONFIG).map(([tool, config]) => {
            const Icon = config.icon;
            const isActive = selectedTool === tool;
            
            return (
              <button
                key={tool}
                onClick={() => onToolSelect(tool as DrawingTool)}
                className={`
                  flex items-center justify-center w-9 h-9 rounded-md transition-colors
                  ${isActive 
                    ? 'bg-orange-100 text-orange-600 border border-orange-200' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
                title={`${config.label} (${config.shortcut})`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`
              flex items-center justify-center w-9 h-9 rounded-md transition-colors
              ${canUndo 
                ? 'text-gray-600 hover:bg-gray-100' 
                : 'text-gray-400 cursor-not-allowed'
              }
            `}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`
              flex items-center justify-center w-9 h-9 rounded-md transition-colors
              ${canRedo 
                ? 'text-gray-600 hover:bg-gray-100' 
                : 'text-gray-400 cursor-not-allowed'
              }
            `}
            title="Refazer (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* Opções de grid */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
          <button
            onClick={onToggleGrid}
            className={`
              flex items-center justify-center w-9 h-9 rounded-md transition-colors
              ${showGrid 
                ? 'bg-blue-100 text-blue-600 border border-blue-200' 
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
            title="Mostrar/Ocultar Grade"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          
          <button
            onClick={onToggleSnap}
            className={`
              flex items-center justify-center w-9 h-9 rounded-md transition-colors text-xs font-medium
              ${snapToGrid 
                ? 'bg-blue-100 text-blue-600 border border-blue-200' 
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
            title="Ajustar à Grade"
          >
            S
          </button>
        </div>

        {/* Controles da forma selecionada */}
        {selectedShape && (
          <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
            <button
              onClick={handleToggleVisibility}
              className="flex items-center justify-center w-9 h-9 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              title={selectedShape.isVisible ? 'Ocultar' : 'Mostrar'}
            >
              {selectedShape.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            
            <button
              onClick={handleDeleteSelected}
              className="flex items-center justify-center w-9 h-9 rounded-md text-red-600 hover:bg-red-50 transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Paleta de cores para forma selecionada */}
        {selectedShape && (
          <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
            <Palette className="w-4 h-4 text-gray-500 mr-1" />
            <div className="flex gap-1">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`
                    w-6 h-6 rounded border-2 transition-all
                    ${selectedShape.color === color 
                      ? 'border-gray-400 scale-110' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  title={`Cor: ${color}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Ações gerais */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            title="Salvar Geometrias"
          >
            <Save className="w-4 h-4" />
            <span>Salvar</span>
          </button>
          
          <button
            onClick={onClearAll}
            className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            title="Limpar Tudo"
            disabled={shapes.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar</span>
          </button>
        </div>

        {/* Contador de formas */}
        <div className="ml-auto text-sm text-gray-500">
          {getTotalShapesCount() > 0 && (
            <span>
              {getVisibleShapesCount()}/{getTotalShapesCount()} formas
            </span>
          )}
        </div>
      </div>

      {/* Informações da forma selecionada */}
      {selectedShape && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Selecionado:</span>
              <span className="font-medium capitalize">{selectedShape.type}</span>
              {selectedShape.label && (
                <span className="text-gray-500">({selectedShape.label})</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Pontos:</span>
              <span className="font-medium">{selectedShape.points.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
