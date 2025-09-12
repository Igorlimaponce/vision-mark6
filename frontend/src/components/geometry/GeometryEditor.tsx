// Editor visual de geometria para definir ROIs em streams de vídeo
// Permite desenhar polígonos, linhas e áreas de interesse sobre o vídeo

import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface GeometryShape {
  id: string;
  type: 'polygon' | 'line' | 'circle' | 'rectangle';
  points: Point[];
  color: string;
  label?: string;
  isVisible: boolean;
  isSelected: boolean;
  metadata?: Record<string, any>;
}

export interface GeometryEditorProps {
  width: number;
  height: number;
  shapes: GeometryShape[];
  onShapesChange?: (shapes: GeometryShape[]) => void;
  onShapeSelect?: (shape: GeometryShape | null) => void;
  selectedTool?: DrawingTool;
  isEnabled?: boolean;
  showGrid?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  className?: string;
}

export type DrawingTool = 'select' | 'polygon' | 'line' | 'circle' | 'rectangle' | 'move';

interface DrawingState {
  isDrawing: boolean;
  currentPoints: Point[];
  tempShape: GeometryShape | null;
}

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

export const GeometryEditor: React.FC<GeometryEditorProps> = ({
  width,
  height,
  shapes,
  onShapesChange,
  onShapeSelect,
  selectedTool = 'select',
  isEnabled = true,
  showGrid = false,
  snapToGrid = false,
  gridSize = 20,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPoints: [],
    tempShape: null
  });
  const [hoveredShape, setHoveredShape] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    shapeId: string | null;
    pointIndex: number | null;
    startPoint: Point | null;
  }>({
    isDragging: false,
    shapeId: null,
    pointIndex: null,
    startPoint: null
  });

  // Normalizar coordenadas para grid se necessário
  const normalizePoint = useCallback((point: Point): Point => {
    if (!snapToGrid) return point;
    
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }, [snapToGrid, gridSize]);

  // Obter coordenadas do mouse relativas ao canvas
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return normalizePoint({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    });
  }, [normalizePoint]);

  // Verificar se um ponto está dentro de uma forma
  const isPointInShape = useCallback((point: Point, shape: GeometryShape): boolean => {
    switch (shape.type) {
      case 'rectangle':
        if (shape.points.length < 2) return false;
        const [p1, p2] = shape.points;
        return point.x >= Math.min(p1.x, p2.x) && 
               point.x <= Math.max(p1.x, p2.x) &&
               point.y >= Math.min(p1.y, p2.y) && 
               point.y <= Math.max(p1.y, p2.y);
      
      case 'circle':
        if (shape.points.length < 2) return false;
        const center = shape.points[0];
        const edge = shape.points[1];
        const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
        const distance = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2));
        return distance <= radius;
      
      case 'polygon':
        if (shape.points.length < 3) return false;
        // Algoritmo ray casting para polígono
        let inside = false;
        for (let i = 0, j = shape.points.length - 1; i < shape.points.length; j = i++) {
          const xi = shape.points[i].x, yi = shape.points[i].y;
          const xj = shape.points[j].x, yj = shape.points[j].y;
          
          if (((yi > point.y) !== (yj > point.y)) &&
              (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
            inside = !inside;
          }
        }
        return inside;
      
      case 'line':
        // Para linha, verificar proximidade
        if (shape.points.length < 2) return false;
        const lineStart = shape.points[0];
        const lineEnd = shape.points[shape.points.length - 1];
        const lineLength = Math.sqrt(Math.pow(lineEnd.x - lineStart.x, 2) + Math.pow(lineEnd.y - lineStart.y, 2));
        const distance1 = Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));
        const distance2 = Math.sqrt(Math.pow(point.x - lineEnd.x, 2) + Math.pow(point.y - lineEnd.y, 2));
        return Math.abs(distance1 + distance2 - lineLength) < 5; // Tolerância de 5px
      
      default:
        return false;
    }
  }, []);

  // Encontrar forma sob o cursor
  const findShapeAtPoint = useCallback((point: Point): GeometryShape | null => {
    // Verificar em ordem reversa para priorizar formas desenhadas por último
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (shape.isVisible && isPointInShape(point, shape)) {
        return shape;
      }
    }
    return null;
  }, [shapes, isPointInShape]);

  // Gerar ID único para nova forma
  const generateShapeId = useCallback((): string => {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Criar nova forma
  const createShape = useCallback((type: GeometryShape['type'], points: Point[]): GeometryShape => {
    return {
      id: generateShapeId(),
      type,
      points,
      color: COLORS[shapes.length % COLORS.length],
      isVisible: true,
      isSelected: false,
      metadata: {}
    };
  }, [generateShapeId, shapes.length]);

  // Desenhar grid
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!showGrid) return;

    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Linhas verticais
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Linhas horizontais
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }, [showGrid, width, height, gridSize]);

  // Desenhar forma
  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: GeometryShape, isTemp = false) => {
    if (!shape.isVisible && !isTemp) return;

    const isSelected = shape.isSelected || hoveredShape === shape.id;
    const alpha = isTemp ? 0.6 : 1.0;
    
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = isSelected ? '#FF6B35' : shape.color;
    ctx.fillStyle = shape.color + '20'; // 20 = ~12% opacity
    ctx.lineWidth = isSelected ? 3 : 2;

    switch (shape.type) {
      case 'rectangle':
        if (shape.points.length >= 2) {
          const [p1, p2] = shape.points;
          const width = p2.x - p1.x;
          const height = p2.y - p1.y;
          
          ctx.beginPath();
          ctx.rect(p1.x, p1.y, width, height);
          ctx.fill();
          ctx.stroke();
        }
        break;

      case 'circle':
        if (shape.points.length >= 2) {
          const center = shape.points[0];
          const edge = shape.points[1];
          const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
          
          ctx.beginPath();
          ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
        break;

      case 'polygon':
        if (shape.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          
          if (shape.points.length >= 3 && !isTemp) {
            ctx.closePath();
            ctx.fill();
          }
          
          ctx.stroke();
        }
        break;

      case 'line':
        if (shape.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          
          ctx.stroke();
        }
        break;
    }

    // Desenhar pontos de controle se selecionado
    if (isSelected && !isTemp) {
      ctx.fillStyle = '#FF6B35';
      shape.points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    ctx.globalAlpha = 1.0;
  }, [hoveredShape]);

  // Renderizar canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.clearRect(0, 0, width, height);

    // Desenhar grid
    drawGrid(ctx);

    // Desenhar formas existentes
    shapes.forEach(shape => drawShape(ctx, shape));

    // Desenhar forma temporária
    if (drawingState.tempShape) {
      drawShape(ctx, drawingState.tempShape, true);
    }
  }, [width, height, shapes, drawingState.tempShape, drawGrid, drawShape]);

  // Mouse down - iniciar desenho ou seleção
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEnabled) return;

    const point = getMousePos(e);
    
    if (selectedTool === 'select') {
      const shape = findShapeAtPoint(point);
      onShapeSelect?.(shape);
      
      if (shape) {
        // Verificar se clicou em um ponto de controle
        const pointIndex = shape.points.findIndex(p => 
          Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2)) <= 6
        );
        
        if (pointIndex >= 0) {
          setDragState({
            isDragging: true,
            shapeId: shape.id,
            pointIndex,
            startPoint: point
          });
        }
      }
    } else {
      // Iniciar desenho de nova forma
      const newPoints = [point];
      
      if (selectedTool === 'rectangle' || selectedTool === 'circle') {
        // Para retângulo e círculo, precisamos apenas do ponto inicial
        setDrawingState({
          isDrawing: true,
          currentPoints: newPoints,
          tempShape: createShape(selectedTool, newPoints)
        });
      } else if (selectedTool === 'polygon' || selectedTool === 'line') {
        // Para polígono e linha, começar a coletar pontos
        setDrawingState({
          isDrawing: true,
          currentPoints: newPoints,
          tempShape: createShape(selectedTool, newPoints)
        });
      }
    }
  }, [isEnabled, selectedTool, getMousePos, findShapeAtPoint, onShapeSelect, createShape]);

  // Mouse move - atualizar desenho ou arrastar
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEnabled) return;

    const point = getMousePos(e);

    if (dragState.isDragging && dragState.shapeId && dragState.pointIndex !== null) {
      // Arrastar ponto de controle
      const newShapes = shapes.map(shape => {
        if (shape.id === dragState.shapeId) {
          const newPoints = [...shape.points];
          newPoints[dragState.pointIndex!] = point;
          return { ...shape, points: newPoints };
        }
        return shape;
      });
      onShapesChange?.(newShapes);
    } else if (drawingState.isDrawing && drawingState.tempShape) {
      // Atualizar forma temporária
      let newPoints = [...drawingState.currentPoints];
      
      if (selectedTool === 'rectangle' || selectedTool === 'circle') {
        newPoints = [drawingState.currentPoints[0], point];
      } else if (selectedTool === 'polygon' || selectedTool === 'line') {
        newPoints = [...drawingState.currentPoints, point];
      }
      
      setDrawingState(prev => ({
        ...prev,
        tempShape: prev.tempShape ? {
          ...prev.tempShape,
          points: newPoints
        } : null
      }));
    } else {
      // Verificar hover
      const shape = findShapeAtPoint(point);
      setHoveredShape(shape?.id || null);
    }
  }, [isEnabled, getMousePos, dragState, drawingState, shapes, selectedTool, onShapesChange, findShapeAtPoint]);

  // Mouse up - finalizar desenho ou arrastar
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEnabled) return;

    if (dragState.isDragging) {
      setDragState({
        isDragging: false,
        shapeId: null,
        pointIndex: null,
        startPoint: null
      });
    } else if (drawingState.isDrawing && drawingState.tempShape) {
      const point = getMousePos(e);
      
      if (selectedTool === 'rectangle' || selectedTool === 'circle') {
        // Finalizar retângulo ou círculo
        const finalShape = {
          ...drawingState.tempShape,
          points: [drawingState.currentPoints[0], point]
        };
        
        onShapesChange?.([...shapes, finalShape]);
        setDrawingState({
          isDrawing: false,
          currentPoints: [],
          tempShape: null
        });
      }
    }
  }, [isEnabled, dragState, drawingState, selectedTool, getMousePos, shapes, onShapesChange]);

  // Double click - finalizar polígono
  const handleDoubleClick = useCallback(() => {
    if (!isEnabled || !drawingState.isDrawing || !drawingState.tempShape) return;
    
    if (selectedTool === 'polygon' && drawingState.currentPoints.length >= 3) {
      const finalShape = {
        ...drawingState.tempShape,
        points: drawingState.currentPoints
      };
      
      onShapesChange?.([...shapes, finalShape]);
      setDrawingState({
        isDrawing: false,
        currentPoints: [],
        tempShape: null
      });
    }
  }, [isEnabled, drawingState, selectedTool, shapes, onShapesChange]);

  // Click para adicionar ponto em polígono/linha
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEnabled || !drawingState.isDrawing) return;
    
    if (selectedTool === 'polygon' || selectedTool === 'line') {
      const point = getMousePos(e);
      setDrawingState(prev => ({
        ...prev,
        currentPoints: [...prev.currentPoints, point]
      }));
    }
  }, [isEnabled, drawingState.isDrawing, selectedTool, getMousePos]);

  // Effect para renderizar
  useEffect(() => {
    render();
  }, [render]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
        style={{ 
          cursor: selectedTool === 'select' ? 'default' : 'crosshair'
        }}
      />
      
      {/* Instruções de desenho */}
      {drawingState.isDrawing && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
          {selectedTool === 'polygon' && 'Clique para adicionar pontos. Duplo clique para finalizar.'}
          {selectedTool === 'line' && 'Clique para adicionar pontos.'}
          {(selectedTool === 'rectangle' || selectedTool === 'circle') && 'Arraste para definir o tamanho.'}
        </div>
      )}
    </div>
  );
};
