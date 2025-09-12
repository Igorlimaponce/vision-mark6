// Componente que combina VideoStream com GeometryEditor
// Permite desenhar ROIs sobre streams de vídeo em tempo real

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { VideoStream, StreamStatus } from '../common/VideoStream';
import { GeometryEditor, type GeometryShape, type DrawingTool } from './GeometryEditor';
import { GeometryToolbar } from './GeometryToolbar';
import { Settings, Maximize2, Minimize2 } from 'lucide-react';

interface VideoGeometryEditorProps {
  streamId: string;
  rtspUrl: string;
  deviceName?: string;
  initialShapes?: GeometryShape[];
  onShapesChange?: (shapes: GeometryShape[]) => void;
  onSave?: (shapes: GeometryShape[]) => void;
  autoStart?: boolean;
  className?: string;
}

interface EditorSettings {
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  editorEnabled: boolean;
}

export const VideoGeometryEditor: React.FC<VideoGeometryEditorProps> = ({
  streamId,
  rtspUrl,
  deviceName,
  initialShapes = [],
  onShapesChange,
  onSave,
  autoStart = false,
  className = ''
}) => {
  const [shapes, setShapes] = useState<GeometryShape[]>(initialShapes);
  const [selectedShape, setSelectedShape] = useState<GeometryShape | null>(null);
  const [selectedTool, setSelectedTool] = useState<DrawingTool>('select');
  const [streamStatus, setStreamStatus] = useState<StreamStatus>(StreamStatus.STOPPED);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>({
    showGrid: false,
    snapToGrid: false,
    gridSize: 20,
    editorEnabled: true
  });
  
  // Histórico para undo/redo
  const [history, setHistory] = useState<GeometryShape[][]>([initialShapes]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });

  // Atualizar shapes e notificar mudanças
  const handleShapesChange = useCallback((newShapes: GeometryShape[]) => {
    setShapes(newShapes);
    onShapesChange?.(newShapes);
    
    // Adicionar ao histórico
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newShapes);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [onShapesChange, historyIndex]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const shapesToRestore = history[newIndex];
      setShapes(shapesToRestore);
      setHistoryIndex(newIndex);
      onShapesChange?.(shapesToRestore);
    }
  }, [history, historyIndex, onShapesChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const shapesToRestore = history[newIndex];
      setShapes(shapesToRestore);
      setHistoryIndex(newIndex);
      onShapesChange?.(shapesToRestore);
    }
  }, [history, historyIndex, onShapesChange]);

  // Limpar todas as formas
  const handleClearAll = useCallback(() => {
    if (shapes.length > 0 && confirm('Tem certeza que deseja limpar todas as formas?')) {
      handleShapesChange([]);
      setSelectedShape(null);
    }
  }, [shapes.length, handleShapesChange]);

  // Salvar geometrias
  const handleSave = useCallback(() => {
    onSave?.(shapes);
  }, [onSave, shapes]);

  // Selecionar forma
  const handleShapeSelect = useCallback((shape: GeometryShape | null) => {
    // Atualizar seleção visual
    const updatedShapes = shapes.map(s => ({
      ...s,
      isSelected: s.id === shape?.id
    }));
    
    setShapes(updatedShapes);
    setSelectedShape(shape);
  }, [shapes]);

  // Status do stream
  const handleStreamStatusChange = useCallback((status: StreamStatus) => {
    setStreamStatus(status);
  }, []);

  // Redimensionamento baseado no vídeo
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        
        // Manter aspect ratio 16:9 por padrão
        const aspectRatio = 16 / 9;
        let width = rect.width;
        let height = width / aspectRatio;
        
        if (height > rect.height - 100) { // Espaço para toolbar
          height = rect.height - 100;
          width = height * aspectRatio;
        }
        
        setVideoDimensions({ width: Math.floor(width), height: Math.floor(height) });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isFullscreen]);

  // Controles de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!settings.editorEnabled) return;
      
      // Undo/Redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
      
      // Ferramentas
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setSelectedTool('select');
            break;
          case 'p':
            setSelectedTool('polygon');
            break;
          case 'r':
            setSelectedTool('rectangle');
            break;
          case 'c':
            setSelectedTool('circle');
            break;
          case 'l':
            setSelectedTool('line');
            break;
          case 'delete':
          case 'backspace':
            if (selectedShape) {
              const newShapes = shapes.filter(s => s.id !== selectedShape.id);
              handleShapesChange(newShapes);
              setSelectedShape(null);
            }
            break;
        }
      }
    };
    
    if (settings.editorEnabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [settings.editorEnabled, handleUndo, handleRedo, selectedShape, shapes, handleShapesChange]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div 
      ref={containerRef}
      className={`bg-white rounded-lg shadow-lg overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''} ${className}`}
    >
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-800">
            Editor de ROI - {deviceName || streamId}
          </h3>
          <div className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded-full ${
              streamStatus === StreamStatus.RUNNING ? 'bg-green-500 animate-pulse' :
              streamStatus === StreamStatus.STARTING ? 'bg-yellow-500 animate-pulse' :
              streamStatus === StreamStatus.ERROR ? 'bg-red-500' : 'bg-gray-400'
            }`} />
            <span className="text-sm text-gray-600">
              {streamStatus === StreamStatus.RUNNING ? 'Ativo' :
               streamStatus === StreamStatus.STARTING ? 'Conectando' :
               streamStatus === StreamStatus.ERROR ? 'Erro' : 'Parado'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-md transition-colors ${
              showSettings ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Configurações"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Configurações */}
      {showSettings && (
        <div className="bg-gray-50 px-4 py-3 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.showGrid}
                onChange={(e) => setSettings(prev => ({ ...prev, showGrid: e.target.checked }))}
                className="rounded"
              />
              <span>Mostrar Grade</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.snapToGrid}
                onChange={(e) => setSettings(prev => ({ ...prev, snapToGrid: e.target.checked }))}
                className="rounded"
              />
              <span>Ajustar à Grade</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <span>Tamanho da Grade:</span>
              <input
                type="number"
                value={settings.gridSize}
                onChange={(e) => setSettings(prev => ({ ...prev, gridSize: Number(e.target.value) }))}
                min="10"
                max="50"
                step="5"
                className="w-16 px-2 py-1 border rounded"
              />
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.editorEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, editorEnabled: e.target.checked }))}
                className="rounded"
              />
              <span>Editor Ativo</span>
            </label>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <GeometryToolbar
        selectedTool={selectedTool}
        onToolSelect={setSelectedTool}
        selectedShape={selectedShape}
        shapes={shapes}
        onShapesChange={handleShapesChange}
        onClearAll={handleClearAll}
        onSave={handleSave}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        showGrid={settings.showGrid}
        onToggleGrid={() => setSettings(prev => ({ ...prev, showGrid: !prev.showGrid }))}
        snapToGrid={settings.snapToGrid}
        onToggleSnap={() => setSettings(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }))}
        className="border-b"
      />

      {/* Área principal */}
      <div className="relative bg-black flex items-center justify-center p-4">
        <div className="relative" style={{ width: videoDimensions.width, height: videoDimensions.height }}>
          {/* Video Stream */}
          <div className="absolute inset-0">
            <VideoStream
              streamId={streamId}
              rtspUrl={rtspUrl}
              deviceName={deviceName}
              autoStart={autoStart}
              showControls={false}
              onStatusChange={handleStreamStatusChange}
            />
          </div>
          
          {/* Geometry Editor Overlay */}
          {settings.editorEnabled && (
            <div className="absolute inset-0">
              <GeometryEditor
                width={videoDimensions.width}
                height={videoDimensions.height}
                shapes={shapes}
                onShapesChange={handleShapesChange}
                onShapeSelect={handleShapeSelect}
                selectedTool={selectedTool}
                isEnabled={settings.editorEnabled}
                showGrid={settings.showGrid}
                snapToGrid={settings.snapToGrid}
                gridSize={settings.gridSize}
                className="bg-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-gray-50 px-4 py-2 border-t text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>Resolução: {videoDimensions.width}x{videoDimensions.height}</span>
            <span>Formas: {shapes.length}</span>
            {selectedShape && (
              <span>Selecionado: {selectedShape.type} ({selectedShape.points.length} pontos)</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {settings.editorEnabled ? (
              <span className="text-green-600">Editor Ativo</span>
            ) : (
              <span className="text-gray-500">Editor Desativado</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
