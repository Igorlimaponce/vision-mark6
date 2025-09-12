// Base class para todos os nós de pipeline

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface NodeInput {
  id: string;
  label: string;
  type: 'video' | 'image' | 'data' | 'detections' | 'analytics' | 'any';
  required: boolean;
}

export interface NodeOutput {
  id: string;
  label: string;
  type: 'video' | 'image' | 'data' | 'detections' | 'analytics';
}

export interface NodeConfig {
  [key: string]: any;
}

export interface BaseNodeData {
  id: string;
  type: string;
  name: string;
  description: string;
  category: 'input' | 'processing' | 'analytics' | 'output';
  inputs: NodeInput[];
  outputs: NodeOutput[];
  config: NodeConfig;
  position: NodePosition;
  isSelected: boolean;
  isExecuting: boolean;
  hasError: boolean;
  errorMessage?: string;
  enabled: boolean;
  label: string;
}

// Tipos específicos de nós
export interface InputNodeData extends BaseNodeData {
  category: 'input';
  sourceType: 'camera' | 'video' | 'image' | 'webcam';
}

export interface ProcessingNodeData extends BaseNodeData {
  category: 'processing';
  modelType: 'yolo' | 'face_detection' | 'motion' | 'custom';
}

export interface AnalyticsNodeData extends BaseNodeData {
  category: 'analytics';
  analysisType: 'counting' | 'tracking' | 'heatmap' | 'statistics';
}

export interface OutputNodeData extends BaseNodeData {
  category: 'output';
  outputType: 'database' | 'file' | 'alert' | 'webhook' | 'display';
}

export type PipelineNodeData = InputNodeData | ProcessingNodeData | AnalyticsNodeData | OutputNodeData;

// Interface do Pipeline
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  nodes: PipelineNodeData[];
  connections: NodeConnection[];
  config: {
    fps: number;
    resolution: string;
    bufferSize: number;
    autoStart: boolean;
  };
  status: 'stopped' | 'running' | 'paused' | 'error';
  created_at: string;
  updated_at: string;
  organization_id: string;
}

// Estados do Canvas
export interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  selectedNodes: string[];
  selectedConnections: string[];
  isDragging: boolean;
  isConnecting: boolean;
  connectionStart?: {
    nodeId: string;
    handleId: string;
    handleType: 'source' | 'target';
  };
}

// Templates de nós disponíveis
export interface NodeTemplate {
  type: string;
  name: string;
  description: string;
  category: 'input' | 'processing' | 'analytics' | 'output';
  icon: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  defaultConfig: NodeConfig;
}

// Resultados de execução
export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  timestamp: string;
}

export interface PipelineExecutionResult {
  pipelineId: string;
  success: boolean;
  results: NodeExecutionResult[];
  totalExecutionTime: number;
  timestamp: string;
}
