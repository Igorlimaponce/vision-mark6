import { create } from 'zustand';
import type { Pipeline, PipelineNode, PipelineEdge } from '../api/pipelineApi';

interface PipelineStore {
  // Estado
  pipelines: Pipeline[];
  currentPipeline: Pipeline | null;
  selectedNodes: string[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setPipelines: (pipelines: Pipeline[]) => void;
  setCurrentPipeline: (pipeline: Pipeline | null) => void;
  setSelectedNodes: (nodeIds: string[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Pipeline operations
  addNode: (node: Omit<PipelineNode, 'id'>) => void;
  updateNode: (nodeId: string, updates: Partial<PipelineNode>) => void;
  removeNode: (nodeId: string) => void;
  
  addEdge: (edge: Omit<PipelineEdge, 'id'>) => void;
  removeEdge: (edgeId: string) => void;
  
  // Utility functions
  getNodeById: (nodeId: string) => PipelineNode | undefined;
  getEdgesByNodeId: (nodeId: string) => PipelineEdge[];
  clearCurrentPipeline: () => void;
}

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  // Estado inicial
  pipelines: [],
  currentPipeline: null,
  selectedNodes: [],
  isLoading: false,
  error: null,
  
  // Actions básicas
  setPipelines: (pipelines) => set({ pipelines }),
  setCurrentPipeline: (pipeline) => set({ currentPipeline: pipeline }),
  setSelectedNodes: (nodeIds) => set({ selectedNodes: nodeIds }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  // Pipeline operations
  addNode: (nodeData) => {
    const state = get();
    if (!state.currentPipeline) return;
    
    const newNode: PipelineNode = {
      ...nodeData,
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    const updatedPipeline = {
      ...state.currentPipeline,
      nodes: [...state.currentPipeline.nodes, newNode]
    };
    
    set({ currentPipeline: updatedPipeline });
  },
  
  updateNode: (nodeId, updates) => {
    const state = get();
    if (!state.currentPipeline) return;
    
    const updatedNodes = state.currentPipeline.nodes.map(node =>
      node.id === nodeId ? { ...node, ...updates } : node
    );
    
    const updatedPipeline = {
      ...state.currentPipeline,
      nodes: updatedNodes
    };
    
    set({ currentPipeline: updatedPipeline });
  },
  
  removeNode: (nodeId) => {
    const state = get();
    if (!state.currentPipeline) return;
    
    // Remove o nó
    const updatedNodes = state.currentPipeline.nodes.filter(node => node.id !== nodeId);
    
    // Remove todas as arestas conectadas ao nó
    const updatedEdges = state.currentPipeline.edges.filter(
      edge => edge.source_node_id !== nodeId && edge.target_node_id !== nodeId
    );
    
    const updatedPipeline = {
      ...state.currentPipeline,
      nodes: updatedNodes,
      edges: updatedEdges
    };
    
    set({ 
      currentPipeline: updatedPipeline,
      selectedNodes: state.selectedNodes.filter(id => id !== nodeId)
    });
  },
  
  addEdge: (edgeData) => {
    const state = get();
    if (!state.currentPipeline) return;
    
    const newEdge: PipelineEdge = {
      ...edgeData,
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    const updatedPipeline = {
      ...state.currentPipeline,
      edges: [...state.currentPipeline.edges, newEdge]
    };
    
    set({ currentPipeline: updatedPipeline });
  },
  
  removeEdge: (edgeId) => {
    const state = get();
    if (!state.currentPipeline) return;
    
    const updatedEdges = state.currentPipeline.edges.filter(edge => edge.id !== edgeId);
    
    const updatedPipeline = {
      ...state.currentPipeline,
      edges: updatedEdges
    };
    
    set({ currentPipeline: updatedPipeline });
  },
  
  // Utility functions
  getNodeById: (nodeId) => {
    const state = get();
    return state.currentPipeline?.nodes.find(node => node.id === nodeId);
  },
  
  getEdgesByNodeId: (nodeId) => {
    const state = get();
    if (!state.currentPipeline) return [];
    
    return state.currentPipeline.edges.filter(
      edge => edge.source_node_id === nodeId || edge.target_node_id === nodeId
    );
  },
  
  clearCurrentPipeline: () => set({ currentPipeline: null, selectedNodes: [] })
}));
