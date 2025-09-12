import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { VideoFeedNode } from '../nodes/Input/VideoFeedNode';
import { ObjectDetectionNode } from '../nodes/Detection/ObjectDetectionNode';
import { LoiteringNode } from '../nodes/Logic/LoiteringNode';
import { WhatsAppNode } from '../nodes/Action/WhatsAppNode';

// Tipos de nós disponíveis
const nodeTypes = {
  videoFeed: VideoFeedNode,
  objectDetection: ObjectDetectionNode,
  loitering: LoiteringNode,
  whatsapp: WhatsAppNode,
};

// Nós de exemplo
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'videoFeed',
    position: { x: 100, y: 100 },
    data: {
      url: 'rtsp://camera1.example.com/stream',
      fps: 30,
      rtspFormat: 'h264',
      sceneChangeDetection: true
    }
  },
  {
    id: '2',
    type: 'objectDetection',
    position: { x: 400, y: 100 },
    data: {
      model: 'YOLO v8',
      classes: ['person', 'car'],
      confidenceThreshold: 0.7
    }
  },
  {
    id: '3',
    type: 'loitering',
    position: { x: 700, y: 100 },
    data: {
      timeThreshold: 180,
      area: 'Zona A'
    }
  },
  {
    id: '4',
    type: 'whatsapp',
    position: { x: 1000, y: 100 },
    data: {
      phoneNumber: '+5511999999999',
      message: 'ALERTA: Loitering detectado na Zona A',
      sendImage: true,
      notificationInterval: 60
    }
  }
];

// Arestas de exemplo
const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'smoothstep',
    animated: true
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    type: 'smoothstep',
    animated: true
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    type: 'smoothstep',
    animated: true
  }
];

interface PipelineCanvasProps {
  className?: string;
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({ className = '' }) => {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className={`w-full h-full bg-gray-50 ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'videoFeed': return '#3B82F6';
              case 'objectDetection': return '#10B981';
              case 'loitering': return '#8B5CF6';
              case 'whatsapp': return '#EF4444';
              default: return '#6B7280';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
};
