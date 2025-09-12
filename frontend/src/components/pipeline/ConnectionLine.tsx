// Componente para linhas de conexão entre nós

import React from 'react';
import { X } from 'lucide-react';
import type { NodeConnection, PipelineNodeData } from '../../types/pipeline';

interface ConnectionLineProps {
  connection: NodeConnection;
  nodes: PipelineNodeData[];
  isSelected: boolean;
  onDelete: () => void;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  nodes,
  isSelected,
  onDelete
}) => {
  // Encontrar nós de origem e destino
  const sourceNode = nodes.find(node => node.id === connection.sourceNodeId);
  const targetNode = nodes.find(node => node.id === connection.targetNodeId);

  if (!sourceNode || !targetNode) {
    return null;
  }

  // Calcular posições dos handles
  const getHandlePosition = (node: PipelineNodeData, handleId: string, isOutput: boolean) => {
    const nodeWidth = 256; // 64 * 4 (w-64 in Tailwind)
    const nodeHeight = 120; // Estimated height
    
    if (isOutput) {
      // Output handles are on the right side
      const outputIndex = node.outputs.findIndex(output => output.id === handleId);
      const outputCount = node.outputs.length;
      const yOffset = (nodeHeight / (outputCount + 1)) * (outputIndex + 1);
      
      return {
        x: node.position.x + nodeWidth,
        y: node.position.y + yOffset
      };
    } else {
      // Input handles are on the left side
      const inputIndex = node.inputs.findIndex(input => input.id === handleId);
      const inputCount = node.inputs.length;
      const yOffset = (nodeHeight / (inputCount + 1)) * (inputIndex + 1);
      
      return {
        x: node.position.x,
        y: node.position.y + yOffset
      };
    }
  };

  const sourcePos = getHandlePosition(sourceNode, connection.sourceHandle, true);
  const targetPos = getHandlePosition(targetNode, connection.targetHandle, false);

  // Calcular pontos de controle para curva Bézier
  const controlOffset = Math.abs(targetPos.x - sourcePos.x) * 0.5;
  const sourceControl = {
    x: sourcePos.x + controlOffset,
    y: sourcePos.y
  };
  const targetControl = {
    x: targetPos.x - controlOffset,
    y: targetPos.y
  };

  // Criar path SVG
  const path = `
    M ${sourcePos.x} ${sourcePos.y}
    C ${sourceControl.x} ${sourceControl.y}
      ${targetControl.x} ${targetControl.y}
      ${targetPos.x} ${targetPos.y}
  `;

  // Calcular posição do botão de delete (meio da linha)
  const midPoint = {
    x: (sourcePos.x + targetPos.x) / 2,
    y: (sourcePos.y + targetPos.y) / 2
  };

  return (
    <g className="connection-line">
      {/* Shadow/outline */}
      <path
        d={path}
        stroke="rgba(0,0,0,0.1)"
        strokeWidth="6"
        fill="none"
        className="pointer-events-none"
      />
      
      {/* Main line */}
      <path
        d={path}
        stroke={isSelected ? "#f97316" : "#6b7280"}
        strokeWidth="2"
        fill="none"
        className="cursor-pointer hover:stroke-orange-400 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          // Select connection
        }}
      />

      {/* Connection endpoints */}
      <circle
        cx={sourcePos.x}
        cy={sourcePos.y}
        r="4"
        fill="#10b981"
        className="pointer-events-none"
      />
      <circle
        cx={targetPos.x}
        cy={targetPos.y}
        r="4"
        fill="#3b82f6"
        className="pointer-events-none"
      />

      {/* Delete button (shown when selected) */}
      {isSelected && (
        <g transform={`translate(${midPoint.x - 10}, ${midPoint.y - 10})`}>
          <circle
            cx="10"
            cy="10"
            r="10"
            fill="white"
            stroke="#ef4444"
            strokeWidth="2"
            className="cursor-pointer hover:fill-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          />
          <X
            x="6"
            y="6"
            width="8"
            height="8"
            className="pointer-events-none text-red-500"
          />
        </g>
      )}

      {/* Data type indicator */}
      <g transform={`translate(${midPoint.x - 20}, ${midPoint.y - 25})`}>
        <rect
          x="0"
          y="0"
          width="40"
          height="16"
          rx="8"
          fill="rgba(255,255,255,0.9)"
          stroke="#d1d5db"
          strokeWidth="1"
        />
        <text
          x="20"
          y="11"
          textAnchor="middle"
          className="text-xs fill-gray-600 pointer-events-none"
          style={{ fontSize: '10px' }}
        >
          {getConnectionType(sourceNode, connection.sourceHandle)}
        </text>
      </g>
    </g>
  );
};

// Helper function to get connection data type
const getConnectionType = (sourceNode: PipelineNodeData, handleId: string): string => {
  const output = sourceNode.outputs.find(out => out.id === handleId);
  return output?.type || 'data';
};
