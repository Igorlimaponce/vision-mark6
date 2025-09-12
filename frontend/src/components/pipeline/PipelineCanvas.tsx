// Canvas principal para visualização e edição de pipelines

import React, { forwardRef, useCallback, useRef, useState } from 'react';
import type { Pipeline, CanvasState, NodePosition } from '../../types/pipeline';
import { PipelineNode } from './PipelineNode';
import { ConnectionLine } from './ConnectionLine';

interface PipelineCanvasProps {
  pipeline: Pipeline;
  canvasState: CanvasState;
  selectedNodeId?: string | null;
  onNodeSelect: (nodeId: string) => void;
  onNodeMove: (nodeId: string, position: NodePosition) => void;
  onNodeDelete: (nodeId: string) => void;
  onConnectionAdd: (sourceNodeId: string, targetNodeId: string, sourceHandle: string, targetHandle: string) => boolean;
  onConnectionDelete: (connectionId: string) => void;
  onCanvasDrop: (event: React.DragEvent, position: NodePosition) => void;
  onClearSelection: () => void;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
}

export const PipelineCanvas = forwardRef<HTMLDivElement, PipelineCanvasProps>(({
  pipeline,
  canvasState,
  selectedNodeId,
  onNodeSelect,
  onNodeMove,
  onNodeDelete,
  onConnectionAdd,
  onConnectionDelete,
  onCanvasDrop,
  onClearSelection,
  onZoomChange,
  onPanChange
}, ref) => {
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startPos?: { x: number; y: number };
    dragType: 'canvas' | 'node' | 'none';
    dragNodeId?: string;
  }>({
    isDragging: false,
    dragType: 'none'
  });

  const [tempConnection, setTempConnection] = useState<{
    sourceNodeId: string;
    sourceHandle: string;
    mousePos: { x: number; y: number };
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Converter coordenadas do mouse para coordenadas do canvas
  const screenToCanvas = useCallback((screenX: number, screenY: number): NodePosition => {
    if (!ref || typeof ref === 'function' || !ref.current) {
      return { x: screenX, y: screenY };
    }

    const rect = ref.current.getBoundingClientRect();
    const x = (screenX - rect.left - canvasState.pan.x) / canvasState.zoom;
    const y = (screenY - rect.top - canvasState.pan.y) / canvasState.zoom;
    
    return { x, y };
  }, [canvasState.zoom, canvasState.pan, ref]);

  // Handler para drop no canvas
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const position = screenToCanvas(e.clientX, e.clientY);
    onCanvasDrop(e, position);
  }, [screenToCanvas, onCanvasDrop]);

  // Handler para drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handler para mouse down no canvas
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Clique no canvas vazio - iniciar pan
      setDragState({
        isDragging: true,
        startPos: { x: e.clientX, y: e.clientY },
        dragType: 'canvas'
      });
      
      onClearSelection();
      e.preventDefault();
    }
  }, [onClearSelection]);

  // Handler para mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragState.isDragging) {
      if (dragState.dragType === 'canvas' && dragState.startPos) {
        // Pan do canvas
        const deltaX = e.clientX - dragState.startPos.x;
        const deltaY = e.clientY - dragState.startPos.y;
        
        onPanChange({
          x: canvasState.pan.x + deltaX,
          y: canvasState.pan.y + deltaY
        });
        
        setDragState(prev => ({
          ...prev,
          startPos: { x: e.clientX, y: e.clientY }
        }));
      }
    }

    // Atualizar posição da conexão temporária
    if (tempConnection) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setTempConnection(prev => prev ? {
        ...prev,
        mousePos: {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        }
      } : null);
    }
  }, [dragState, canvasState.pan, onPanChange, tempConnection]);

  // Handler para mouse up
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      dragType: 'none'
    });
  }, []);

  // Handler para wheel (zoom)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.1, Math.min(3, canvasState.zoom + zoomDelta));
    
    onZoomChange(newZoom);
  }, [canvasState.zoom, onZoomChange]);

  // Handler para início de conexão
  const handleConnectionStart = useCallback((nodeId: string, handleId: string, handleType: 'source' | 'target') => {
    if (handleType === 'source') {
      setTempConnection({
        sourceNodeId: nodeId,
        sourceHandle: handleId,
        mousePos: { x: 0, y: 0 }
      });
    }
  }, []);

  // Handler para fim de conexão
  const handleConnectionEnd = useCallback((nodeId: string, handleId: string, handleType: 'source' | 'target') => {
    if (tempConnection && handleType === 'target') {
      const success = onConnectionAdd(
        tempConnection.sourceNodeId,
        nodeId,
        tempConnection.sourceHandle,
        handleId
      );
      
      if (success) {
        console.log('Connection created successfully');
      }
    }
    
    setTempConnection(null);
  }, [tempConnection, onConnectionAdd]);

  // Handler para cancelar conexão
  const handleConnectionCancel = useCallback(() => {
    setTempConnection(null);
  }, []);

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden bg-gray-100"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: dragState.dragType === 'canvas' ? 'grabbing' : 'default' }}
    >
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: `${20 * canvasState.zoom}px ${20 * canvasState.zoom}px`,
          backgroundPosition: `${canvasState.pan.x}px ${canvasState.pan.y}px`
        }}
      />

      {/* Viewport */}
      <div
        className="absolute"
        style={{
          transform: `translate(${canvasState.pan.x}px, ${canvasState.pan.y}px) scale(${canvasState.zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* Connections SVG */}
        <svg
          ref={svgRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            width: '100vw',
            height: '100vh',
            overflow: 'visible'
          }}
        >
          {/* Existing connections */}
          {pipeline.connections.map(connection => (
            <ConnectionLine
              key={connection.id}
              connection={connection}
              nodes={pipeline.nodes}
              isSelected={canvasState.selectedConnections.includes(connection.id)}
              onDelete={() => onConnectionDelete(connection.id)}
            />
          ))}
          
          {/* Temporary connection */}
          {tempConnection && (
            <line
              x1={0} // Will be calculated based on source node position
              y1={0}
              x2={tempConnection.mousePos.x / canvasState.zoom - canvasState.pan.x / canvasState.zoom}
              y2={tempConnection.mousePos.y / canvasState.zoom - canvasState.pan.y / canvasState.zoom}
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5,5"
              className="pointer-events-none"
            />
          )}
        </svg>

        {/* Nodes */}
        {pipeline.nodes.map(node => (
          <PipelineNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isConnecting={!!tempConnection}
            onSelect={() => onNodeSelect(node.id)}
            onMove={(position) => onNodeMove(node.id, position)}
            onDelete={() => onNodeDelete(node.id)}
            onConnectionStart={handleConnectionStart}
            onConnectionEnd={handleConnectionEnd}
            onConnectionCancel={handleConnectionCancel}
          />
        ))}
      </div>

      {/* Canvas Info */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2 text-xs text-gray-600">
        <div>Zoom: {Math.round(canvasState.zoom * 100)}%</div>
        <div>Nós: {pipeline.nodes.length}</div>
        <div>Conexões: {pipeline.connections.length}</div>
      </div>

      {/* Instructions */}
      {pipeline.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-medium mb-2">Canvas Vazio</h3>
            <p className="text-sm">
              Arraste nós da biblioteca para começar a construir seu pipeline
            </p>
            <p className="text-xs mt-2">
              Use a roda do mouse para zoom • Clique e arraste para navegar
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
