// Hook para gerenciamento do Pipeline Builder

import { useState, useCallback, useRef } from 'react';
import type { 
  Pipeline, 
  PipelineNodeData, 
  NodeConnection, 
  CanvasState,
  NodePosition,
  NodeTemplate
} from '../types/pipeline';

export const usePipelineBuilder = (initialPipeline?: Pipeline) => {
  const [pipeline, setPipeline] = useState<Pipeline>(
    initialPipeline || {
      id: '',
      name: 'Novo Pipeline',
      description: '',
      nodes: [],
      connections: [],
      config: {
        fps: 30,
        resolution: '1920x1080',
        bufferSize: 10,
        autoStart: false
      },
      status: 'stopped',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      organization_id: ''
    }
  );

  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    selectedNodes: [],
    selectedConnections: [],
    isDragging: false,
    isConnecting: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const nextNodeId = useRef(1);

  // Gerar ID único para nós
  const generateNodeId = useCallback(() => {
    return `node_${nextNodeId.current++}`;
  }, []);

  // Gerar ID único para conexões
  const generateConnectionId = useCallback(() => {
    return `connection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Adicionar nó ao pipeline
  const addNode = useCallback((template: NodeTemplate, position: NodePosition) => {
    const newNode: PipelineNodeData = {
      id: generateNodeId(),
      type: template.type,
      name: template.name,
      description: template.description,
      category: template.category,
      inputs: template.inputs,
      outputs: template.outputs,
      config: { ...template.defaultConfig },
      position,
      isSelected: false,
      isExecuting: false,
      hasError: false
    } as PipelineNodeData;

    setPipeline(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      updated_at: new Date().toISOString()
    }));

    setHasUnsavedChanges(true);
    
    console.log(`Node added: ${newNode.name}`, { nodeId: newNode.id });
  }, [generateNodeId]);

  // Remover nó do pipeline
  const removeNode = useCallback((nodeId: string) => {
    setPipeline(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      connections: prev.connections.filter(
        conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
      ),
      updated_at: new Date().toISOString()
    }));

    setCanvasState(prev => ({
      ...prev,
      selectedNodes: prev.selectedNodes.filter(id => id !== nodeId)
    }));

    setHasUnsavedChanges(true);
    console.log(`Node removed: ${nodeId}`);
  }, []);

  // Atualizar posição do nó
  const updateNodePosition = useCallback((nodeId: string, position: NodePosition) => {
    setPipeline(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, position } : node
      ),
      updated_at: new Date().toISOString()
    }));

    setHasUnsavedChanges(true);
  }, []);

  // Atualizar configuração do nó
  const updateNodeConfig = useCallback((nodeId: string, config: any) => {
    setPipeline(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, config: { ...node.config, ...config } } : node
      ),
      updated_at: new Date().toISOString()
    }));

    setHasUnsavedChanges(true);
    console.log(`Node config updated: ${nodeId}`, { config });
  }, []);

  // Adicionar conexão entre nós
  const addConnection = useCallback((
    sourceNodeId: string,
    targetNodeId: string,
    sourceHandle: string,
    targetHandle: string
  ) => {
    // Verificar se a conexão já existe
    const connectionExists = pipeline.connections.some(conn =>
      conn.sourceNodeId === sourceNodeId &&
      conn.targetNodeId === targetNodeId &&
      conn.sourceHandle === sourceHandle &&
      conn.targetHandle === targetHandle
    );

    if (connectionExists) {
      console.warn('Conexão já existe');
      return false;
    }

    // Verificar se o target handle já está conectado
    const targetConnected = pipeline.connections.some(conn =>
      conn.targetNodeId === targetNodeId && conn.targetHandle === targetHandle
    );

    if (targetConnected) {
      console.warn('Entrada já está conectada');
      return false;
    }

    const newConnection: NodeConnection = {
      id: generateConnectionId(),
      sourceNodeId,
      targetNodeId,
      sourceHandle,
      targetHandle
    };

    setPipeline(prev => ({
      ...prev,
      connections: [...prev.connections, newConnection],
      updated_at: new Date().toISOString()
    }));

    setHasUnsavedChanges(true);
    console.log('Connection added', newConnection);
    return true;
  }, [pipeline.connections, generateConnectionId]);

  // Remover conexão
  const removeConnection = useCallback((connectionId: string) => {
    setPipeline(prev => ({
      ...prev,
      connections: prev.connections.filter(conn => conn.id !== connectionId),
      updated_at: new Date().toISOString()
    }));

    setCanvasState(prev => ({
      ...prev,
      selectedConnections: prev.selectedConnections.filter(id => id !== connectionId)
    }));

    setHasUnsavedChanges(true);
    console.log(`Connection removed: ${connectionId}`);
  }, []);

  // Selecionar nós
  const selectNodes = useCallback((nodeIds: string[], addToSelection = false) => {
    setCanvasState(prev => ({
      ...prev,
      selectedNodes: addToSelection 
        ? [...prev.selectedNodes, ...nodeIds.filter(id => !prev.selectedNodes.includes(id))]
        : nodeIds,
      selectedConnections: addToSelection ? prev.selectedConnections : []
    }));
  }, []);

  // Limpar seleção
  const clearSelection = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      selectedNodes: [],
      selectedConnections: []
    }));
  }, []);

  // Zoom do canvas
  const setZoom = useCallback((zoom: number) => {
    setCanvasState(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(3, zoom))
    }));
  }, []);

  // Pan do canvas
  const setPan = useCallback((pan: { x: number; y: number }) => {
    setCanvasState(prev => ({
      ...prev,
      pan
    }));
  }, []);

  // Salvar pipeline
  const savePipeline = useCallback(async () => {
    try {
      setIsLoading(true);

      // Converter dados para formato da API
      const pipelineData = {
        name: pipeline.name,
        description: pipeline.description,
        nodes: pipeline.nodes.map(node => ({
          node_id: node.id,
          node_type: node.type,
          config: node.config,
          position: node.position
        })),
        edges: pipeline.connections.map(conn => ({
          edge_id: conn.id,
          source_node_id: conn.sourceNodeId,
          target_node_id: conn.targetNodeId,
          source_handle: conn.sourceHandle,
          target_handle: conn.targetHandle
        }))
      };

      // Por enquanto apenas simular - integração real seria:
      // if (pipeline.id) {
      //   await pipelinesApi.update(pipeline.id, pipelineData);
      // } else {
      //   const newPipeline = await pipelinesApi.create(pipelineData);
      //   setPipeline(prev => ({ ...prev, id: newPipeline.id }));
      // }
      
      console.log('Pipeline data to save:', pipelineData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPipeline(prev => ({
        ...prev,
        updated_at: new Date().toISOString()
      }));

      setHasUnsavedChanges(false);
      console.log('Pipeline saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save pipeline', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pipeline]);

  // Carregar pipeline
  const loadPipeline = useCallback(async (pipelineId: string) => {
    try {
      setIsLoading(true);
      // Simular chamada da API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Por enquanto, apenas log
      console.log(`Pipeline load requested: ${pipelineId}`);
    } catch (error) {
      console.error('Failed to load pipeline', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validar pipeline
  const validatePipeline = useCallback(() => {
    const errors: string[] = [];

    // Verificar se há pelo menos um nó
    if (pipeline.nodes.length === 0) {
      errors.push('Pipeline deve ter pelo menos um nó');
    }

    // Verificar se há nós de entrada
    const inputNodes = pipeline.nodes.filter(node => node.category === 'input');
    if (inputNodes.length === 0) {
      errors.push('Pipeline deve ter pelo menos um nó de entrada');
    }

    // Verificar conexões órfãs
    pipeline.connections.forEach(conn => {
      const sourceExists = pipeline.nodes.some(node => node.id === conn.sourceNodeId);
      const targetExists = pipeline.nodes.some(node => node.id === conn.targetNodeId);
      
      if (!sourceExists || !targetExists) {
        errors.push('Conexão com nó inexistente detectada');
      }
    });

    // Verificar nós sem entrada (exceto nós de input)
    pipeline.nodes.forEach(node => {
      if (node.category !== 'input') {
        const hasInput = pipeline.connections.some(conn => conn.targetNodeId === node.id);
        if (!hasInput && node.inputs.some(input => input.required)) {
          errors.push(`Nó "${node.name}" requer conexão de entrada`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [pipeline]);

  // Executar pipeline
  const executePipeline = useCallback(async () => {
    const validationResult = validatePipeline();
    
    if (!validationResult.isValid) {
      console.error(`Pipeline inválido: ${validationResult.errors.join(', ')}`);
      return false;
    }

    if (!pipeline.id) {
      console.error('Pipeline deve ser salvo antes de executar');
      return false;
    }

    try {
      setIsLoading(true);
      
      // Integração real seria:
      // await pipelinesApi.execute(pipeline.id);
      
      console.log('Executing pipeline:', pipeline.id);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setPipeline(prev => ({ ...prev, status: 'running' }));
      console.log('Pipeline execution started', { pipelineId: pipeline.id });
      return true;
    } catch (error) {
      console.error('Failed to execute pipeline', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pipeline, validatePipeline]);

  return {
    // Estado
    pipeline,
    canvasState,
    isLoading,
    hasUnsavedChanges,
    
    // Ações do pipeline
    setPipeline,
    savePipeline,
    loadPipeline,
    validatePipeline,
    executePipeline,
    
    // Ações dos nós
    addNode,
    removeNode,
    updateNodePosition,
    updateNodeConfig,
    
    // Ações das conexões
    addConnection,
    removeConnection,
    
    // Ações de seleção
    selectNodes,
    clearSelection,
    
    // Ações do canvas
    setZoom,
    setPan,
    setCanvasState,
    
    // Refs
    canvasRef
  };
};
