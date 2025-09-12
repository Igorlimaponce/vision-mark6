// Componente principal do Pipeline Builder

import React, { useState } from 'react';
import { usePipelineBuilder } from '../../hooks/usePipelineBuilder';
import { PipelineCanvas } from './PipelineCanvas';
import { NodeLibrary } from './NodeLibrary';
import { NodeEditor } from './NodeEditor';
import { PipelineToolbar } from './PipelineToolbar';
import { PipelineMonitor } from './PipelineMonitor';
import { allNodeTemplates } from '../../data/nodeTemplates';
import type { NodeTemplate, NodePosition } from '../../types/pipeline';

export const PipelineBuilderMain: React.FC = () => {
  const {
    pipeline,
    canvasState,
    isLoading,
    hasUnsavedChanges,
    addNode,
    removeNode,
    updateNodePosition,
    updateNodeConfig,
    addConnection,
    removeConnection,
    savePipeline,
    executePipeline,
    validatePipeline,
    selectNodes,
    clearSelection,
    setZoom,
    setPan
  } = usePipelineBuilder();

  const [showNodeLibrary, setShowNodeLibrary] = useState(true);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);

  const editingNode = editingNodeId ? pipeline.nodes.find(n => n.id === editingNodeId) : null;

  const handleCloseEditor = () => {
    setEditingNodeId(null);
  };

  const handleNodeSelect = (nodeId: string) => {
    selectNodes([nodeId]);
  };

  const handleNodeMove = (nodeId: string, position: NodePosition) => {
    updateNodePosition(nodeId, position);
  };

  const handleUpdateNode = (nodeId: string, updates: any) => {
    if (updates.config) {
      updateNodeConfig(nodeId, updates.config);
    }
    if (updates.position) {
      updateNodePosition(nodeId, updates.position);
    }
  };

  const handlePipelineInfoUpdate = (updates: any) => {
    // Placeholder for pipeline updates
    console.log('Pipeline info update:', updates);
  };

  const handleDragStart = (template: NodeTemplate, event: React.DragEvent) => {
    setIsDragging(true);
    event.dataTransfer.setData('application/json', JSON.stringify(template));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleCanvasDrop = (event: React.DragEvent, position: NodePosition) => {
    event.preventDefault();
    try {
      const templateData = event.dataTransfer.getData('application/json');
      const template = JSON.parse(templateData) as NodeTemplate;
      addNode(template, position);
    } catch (error) {
      console.error('Failed to drop node:', error);
    }
    setIsDragging(false);
  };

  // Simulated validation result
  const validation = {
    isValid: pipeline.nodes.length > 0,
    errors: pipeline.nodes.length === 0 ? ['Pipeline deve ter pelo menos um nó'] : []
  };

  const selectedNodeId = canvasState.selectedNodes[0] || null;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Pipeline Toolbar */}
      <div className="w-full">
        <PipelineToolbar
          pipeline={pipeline}
          hasUnsavedChanges={hasUnsavedChanges}
          isLoading={isLoading}
          onSave={savePipeline}
          onExecute={executePipeline}
          onValidate={validatePipeline}
          onPipelineInfoUpdate={handlePipelineInfoUpdate}
          validation={validation}
        />

        <div className="flex flex-1 h-full">
          {/* Node Library */}
          {showNodeLibrary && (
            <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Biblioteca de Nós
                  </h3>
                  <button
                    onClick={() => setShowNodeLibrary(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <NodeLibrary
                templates={allNodeTemplates}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isDragging={isDragging}
              />
            </div>
          )}

          {/* Pipeline Monitor */}
          {showMonitor && pipeline.id && (
            <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Monitor de Execução
                  </h3>
                  <button
                    onClick={() => setShowMonitor(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-4">
                <PipelineMonitor pipelineId={pipeline.id} />
              </div>
            </div>
          )}

          {/* Main Canvas */}
          <div className="flex-1 relative">
            {!showNodeLibrary && (
              <button
                onClick={() => setShowNodeLibrary(true)}
                className="absolute top-4 left-4 z-10 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Mostrar Biblioteca
              </button>
            )}

            {!showMonitor && pipeline.id && (
              <button
                onClick={() => setShowMonitor(true)}
                className="absolute top-4 left-20 z-10 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Monitor
              </button>
            )}

            <PipelineCanvas
              pipeline={pipeline}
              canvasState={canvasState}
              selectedNodeId={selectedNodeId}
              onNodeSelect={handleNodeSelect}
              onNodeMove={handleNodeMove}
              onNodeDelete={removeNode}
              onConnectionAdd={addConnection}
              onConnectionDelete={removeConnection}
              onCanvasDrop={handleCanvasDrop}
              onClearSelection={clearSelection}
              onZoomChange={setZoom}
              onPanChange={setPan}
            />
          </div>

          {/* Node Editor */}
          {editingNode && (
            <NodeEditor
              node={editingNode}
              allNodes={pipeline.nodes}
              connections={pipeline.connections}
              onClose={handleCloseEditor}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={(nodeId) => {
                removeNode(nodeId);
                handleCloseEditor();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
