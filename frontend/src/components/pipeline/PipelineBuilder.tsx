// Componente principal do Pipeline Builder

import React, { useState } from 'react';
import { usePipelineBuilder } from '../../hooks/usePipelineBuilder';
import { PipelineCanvas } from './PipelineCanvas';
import { NodeLibrary } from './NodeLibrary';
import { NodeEditor } from './NodeEditor';
import { PipelineToolbar } from './PipelineToolbar';

export const PipelineBuilder: React.FC = () => {
  const {
    pipeline,
    canvasState,
    selectedNodeId,
    isLoading,
    hasUnsavedChanges,
    validation,
    addNode,
    removeNode,
    updateNode,
    addConnection,
    removeConnection,
    savePipeline,
    executePipeline,
    validatePipeline,
    updatePipelineInfo,
    selectNode,
    updateCanvasState
  } = usePipelineBuilder();

  const [showNodeLibrary, setShowNodeLibrary] = useState(true);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const selectedNode = selectedNodeId ? pipeline.nodes.find(n => n.id === selectedNodeId) : null;
  const editingNode = editingNodeId ? pipeline.nodes.find(n => n.id === editingNodeId) : null;
    loadPipeline,
    validatePipeline,
    executePipeline,
    addNode,
    removeNode,
    updateNodePosition,
    updateNodeConfig,
    addConnection,
    removeConnection,
    selectNodes,
    clearSelection,
    setZoom,
    setPan,
    canvasRef
  } = usePipelineBuilder();

  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [showValidation, setShowValidation] = React.useState(false);
  const [isDragginFromLibrary, setIsDragginFromLibrary] = React.useState(false);
  
  // Ref para armazenar o template sendo arrastado
  const draggingTemplate = useRef<NodeTemplate | null>(null);

  // Carregar pipeline se ID fornecido
  useEffect(() => {
    if (pipelineId) {
      loadPipeline(pipelineId);
    }
  }, [pipelineId, loadPipeline]);

  // Handler para quando um nó é selecionado
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    selectNodes([nodeId]);
  }, [selectNodes]);

  // Handler para quando a seleção é limpa
  const handleClearSelection = useCallback(() => {
    setSelectedNodeId(null);
    clearSelection();
  }, [clearSelection]);

  // Handler para drag start da biblioteca
  const handleDragStart = useCallback((template: NodeTemplate, event: React.DragEvent) => {
    draggingTemplate.current = template;
    setIsDragginFromLibrary(true);
    
    // Configurar dados do drag
    event.dataTransfer.setData('application/json', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Handler para drag end
  const handleDragEnd = useCallback(() => {
    draggingTemplate.current = null;
    setIsDragginFromLibrary(false);
  }, []);

  // Handler para drop no canvas
  const handleCanvasDrop = useCallback((event: React.DragEvent, position: NodePosition) => {
    event.preventDefault();
    
    if (!draggingTemplate.current) return;

    // Adicionar nó na posição do drop
    addNode(draggingTemplate.current, position);
    
    // Reset drag state
    handleDragEnd();
  }, [addNode, handleDragEnd]);

  // Handler para salvar pipeline
  const handleSave = useCallback(async () => {
    const success = await savePipeline();
    if (success && onSave) {
      onSave(pipeline.id);
    }
  }, [savePipeline, onSave, pipeline.id]);

  // Handler para executar pipeline
  const handleExecute = useCallback(async () => {
    const validation = validatePipeline();
    
    if (!validation.isValid) {
      setShowValidation(true);
      return;
    }

    const success = await executePipeline();
    if (success && onExecute) {
      onExecute(pipeline.id);
    }
  }, [executePipeline, validatePipeline, onExecute, pipeline.id]);

  // Handler para atualizar informações do pipeline
  const handlePipelineInfoUpdate = useCallback((updates: Partial<typeof pipeline>) => {
    setPipeline(prev => ({
      ...prev,
      ...updates,
      updated_at: new Date().toISOString()
    }));
  }, [setPipeline]);

  // Obter nó selecionado
  const selectedNode = selectedNodeId 
    ? pipeline.nodes.find(node => node.id === selectedNodeId)
    : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Toolbar */}
      <PipelineToolbar
        pipeline={pipeline}
        hasUnsavedChanges={hasUnsavedChanges}
        isLoading={isLoading}
        onSave={handleSave}
        onExecute={handleExecute}
        onValidate={() => setShowValidation(true)}
        onPipelineInfoUpdate={handlePipelineInfoUpdate}
        validation={validatePipeline()}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Library */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <NodeLibrary
            templates={allNodeTemplates}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            isDragging={isDragginFromLibrary}
          />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <PipelineCanvas
            ref={canvasRef}
            pipeline={pipeline}
            canvasState={canvasState}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleNodeSelect}
            onNodeMove={updateNodePosition}
            onNodeDelete={removeNode}
            onConnectionAdd={addConnection}
            onConnectionDelete={removeConnection}
            onCanvasDrop={handleCanvasDrop}
            onClearSelection={handleClearSelection}
            onZoomChange={setZoom}
            onPanChange={setPan}
          />
        </div>

        {/* Node Editor */}
        {selectedNode && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <NodeEditor
              node={selectedNode}
              onChange={(config) => updateNodeConfig(selectedNode.id, config)}
              onClose={() => setSelectedNodeId(null)}
            />
          </div>
        )}
      </div>

      {/* Validation Panel */}
      {showValidation && (
        <PipelineValidation
          validation={validatePipeline()}
          onClose={() => setShowValidation(false)}
        />
      )}
    </div>
  );
};
