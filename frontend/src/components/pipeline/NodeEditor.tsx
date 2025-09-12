// Editor de configuração de nós do Pipeline

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Eye, 
  EyeOff, 
  Check, 
  AlertTriangle,
  Info,
  Link,
  Unlink
} from 'lucide-react';
import type { PipelineNodeData, NodeConnection } from '../../types/pipeline';
import { allNodeTemplates } from '../../data/nodeTemplates';

interface NodeEditorProps {
  node: PipelineNodeData | null;
  allNodes: PipelineNodeData[];
  connections: NodeConnection[];
  onClose: () => void;
  onUpdateNode: (nodeId: string, updates: Partial<PipelineNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({
  node,
  allNodes,
  connections,
  onClose,
  onUpdateNode,
  onDeleteNode
}) => {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const nodeTemplate = node ? allNodeTemplates.find((t: any) => t.type === node.type) : null;

  useEffect(() => {
    if (node) {
      setLocalConfig(node.config || {});
      setHasChanges(false);
      validateNode();
    }
  }, [node]);

  const validateNode = () => {
    if (!node || !nodeTemplate) return;

    const newErrors: string[] = [];

    // Validate required inputs
    const requiredInputs = nodeTemplate.inputs.filter((input: any) => input.required);
    const nodeConnections = connections.filter(conn => conn.targetNodeId === node.id);
    
    for (const input of requiredInputs) {
      const hasConnection = nodeConnections.some(conn => conn.targetHandle === input.id);
      if (!hasConnection) {
        newErrors.push(`Entrada obrigatória '${input.label}' não conectada`);
      }
    }

    // Basic configuration validation would go here if needed
    
    setErrors(newErrors);
  };

  useEffect(() => {
    validateNode();
  }, [localConfig, connections]);

  const handleConfigChange = (key: string, value: any) => {
    setLocalConfig((prev: Record<string, any>) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!node) return;
    
    onUpdateNode(node.id, {
      config: localConfig
    });
    setHasChanges(false);
  };

  const handleDelete = () => {
    if (!node) return;
    
    if (window.confirm('Tem certeza que deseja excluir este nó?')) {
      onDeleteNode(node.id);
      onClose();
    }
  };

  const toggleEnabled = () => {
    if (!node) return;
    
    onUpdateNode(node.id, {
      enabled: !node.enabled
    });
  };

  const getConnectedNodes = (direction: 'input' | 'output') => {
    if (!node) return [];
    
    if (direction === 'input') {
      return connections
        .filter(conn => conn.targetNodeId === node.id)
        .map(conn => {
          const sourceNode = allNodes.find(n => n.id === conn.sourceNodeId);
          return { connection: conn, node: sourceNode };
        })
        .filter(item => item.node);
    } else {
      return connections
        .filter(conn => conn.sourceNodeId === node.id)
        .map(conn => {
          const targetNode = allNodes.find(n => n.id === conn.targetNodeId);
          return { connection: conn, node: targetNode };
        })
        .filter(item => item.node);
    }
  };

  if (!node || !nodeTemplate) {
    return null;
  }

  const inputConnections = getConnectedNodes('input');
  const outputConnections = getConnectedNodes('output');

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500">
              <span className="text-white text-sm">{nodeTemplate.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{node.label}</h3>
              <p className="text-sm text-gray-500">{nodeTemplate.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status indicators */}
        <div className="flex items-center space-x-4 mt-3">
          <button
            onClick={toggleEnabled}
            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              node.enabled
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {node.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>{node.enabled ? 'Ativo' : 'Inativo'}</span>
          </button>

          {errors.length > 0 && (
            <div className="flex items-center space-x-1 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">{errors.length} erro(s)</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Description */}
        {nodeTemplate.description && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">{nodeTemplate.description}</p>
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <h4 className="text-sm font-medium text-red-800 mb-2">Erros de validação:</h4>
            <ul className="space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-red-700 flex items-start space-x-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Configuration */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Configuração</h4>
          <div className="space-y-4">
            {Object.entries(nodeTemplate.defaultConfig || {}).map(([key, defaultValue]) => {
              const value = localConfig[key] !== undefined ? localConfig[key] : defaultValue;
              // Validation rules would be defined elsewhere if needed

              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {key.charAt(0).toUpperCase() + key.slice(1)}

                  </label>
                  
                  {typeof defaultValue === 'boolean' ? (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleConfigChange(key, e.target.checked)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Ativado</span>
                    </label>
                  ) : typeof defaultValue === 'number' ? (
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => handleConfigChange(key, parseFloat(e.target.value))}

                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleConfigChange(key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Connections */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Conexões</h4>
          
          {/* Input connections */}
          <div className="mb-4">
            <h5 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
              <Link className="w-3 h-3 mr-1" />
              Entradas ({inputConnections.length})
            </h5>
            {inputConnections.length > 0 ? (
              <div className="space-y-2">
                {inputConnections.map(({ connection, node: connectedNode }) => (
                  <div key={connection.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">{connectedNode?.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">{connection.targetHandle}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Nenhuma entrada conectada</p>
            )}
          </div>

          {/* Output connections */}
          <div>
            <h5 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
              <Unlink className="w-3 h-3 mr-1" />
              Saídas ({outputConnections.length})
            </h5>
            {outputConnections.length > 0 ? (
              <div className="space-y-2">
                {outputConnections.map(({ connection, node: connectedNode }) => (
                  <div key={connection.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">{connectedNode?.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">{connection.sourceHandle}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Nenhuma saída conectada</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between space-x-3">
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors text-sm font-medium"
          >
            Excluir
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || errors.length > 0}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${hasChanges && errors.length === 0
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Check className="w-4 h-4 mr-2" />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
