// Sistema de validação do Pipeline

import type { PipelineNodeData, NodeConnection, Pipeline } from '../types/pipeline';
import { allNodeTemplates } from '../data/nodeTemplates';

export interface ValidationError {
  type: 'error' | 'warning';
  category: 'node' | 'connection' | 'pipeline';
  nodeId?: string;
  connectionId?: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class PipelineValidator {
  private static instance: PipelineValidator;

  static getInstance(): PipelineValidator {
    if (!PipelineValidator.instance) {
      PipelineValidator.instance = new PipelineValidator();
    }
    return PipelineValidator.instance;
  }

  validatePipeline(pipeline: Pipeline): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate basic pipeline structure
    this.validatePipelineStructure(pipeline, errors, warnings);

    // Validate nodes
    for (const node of pipeline.nodes) {
      this.validateNode(node, pipeline.connections, errors, warnings);
    }

    // Validate connections
    for (const connection of pipeline.connections) {
      this.validateConnection(connection, pipeline.nodes, errors, warnings);
    }

    // Validate pipeline flow
    this.validatePipelineFlow(pipeline, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors: errors.filter(e => e.type === 'error'),
      warnings: warnings.filter(e => e.type === 'warning')
    };
  }

  private validatePipelineStructure(
    pipeline: Pipeline, 
    errors: ValidationError[], 
    warnings: ValidationError[]
  ): void {
    // Check if pipeline has nodes
    if (pipeline.nodes.length === 0) {
      errors.push({
        type: 'error',
        category: 'pipeline',
        message: 'Pipeline deve ter pelo menos um nó',
        suggestion: 'Adicione nós da biblioteca para construir seu pipeline'
      });
      return;
    }

    // Check for input nodes
    const inputNodes = pipeline.nodes.filter(node => node.category === 'input');
    if (inputNodes.length === 0) {
      errors.push({
        type: 'error',
        category: 'pipeline',
        message: 'Pipeline deve ter pelo menos um nó de entrada',
        suggestion: 'Adicione uma fonte de dados (câmera, arquivo, etc.)'
      });
    }

    // Check for output nodes
    const outputNodes = pipeline.nodes.filter(node => node.category === 'output');
    if (outputNodes.length === 0) {
      warnings.push({
        type: 'warning',
        category: 'pipeline',
        message: 'Pipeline não possui nós de saída',
        suggestion: 'Considere adicionar nós para salvar ou exibir resultados'
      });
    }

    // Check pipeline name
    if (!pipeline.name || pipeline.name.trim().length === 0) {
      warnings.push({
        type: 'warning',
        category: 'pipeline',
        message: 'Pipeline não possui nome',
        suggestion: 'Defina um nome descritivo para identificar o pipeline'
      });
    }
  }

  private validateNode(
    node: PipelineNodeData,
    connections: NodeConnection[],
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Find node template
    const template = allNodeTemplates.find(t => t.type === node.type);
    if (!template) {
      errors.push({
        type: 'error',
        category: 'node',
        nodeId: node.id,
        message: `Tipo de nó '${node.type}' não é válido`,
        suggestion: 'Selecione um tipo de nó válido da biblioteca'
      });
      return;
    }

    // Validate required inputs
    const nodeConnections = connections.filter(conn => conn.targetNodeId === node.id);
    for (const input of template.inputs) {
      if (input.required) {
        const hasConnection = nodeConnections.some(conn => conn.targetHandle === input.id);
        if (!hasConnection) {
          errors.push({
            type: 'error',
            category: 'node',
            nodeId: node.id,
            message: `Entrada obrigatória '${input.label}' não conectada`,
            suggestion: `Conecte um nó que forneça dados do tipo '${input.type}'`
          });
        }
      }
    }

    // Validate node configuration
    this.validateNodeConfiguration(node, template, errors, warnings);

    // Check if node is isolated
    const hasInputConnections = connections.some(conn => conn.targetNodeId === node.id);
    const hasOutputConnections = connections.some(conn => conn.sourceNodeId === node.id);
    
    if (!hasInputConnections && node.category !== 'input') {
      warnings.push({
        type: 'warning',
        category: 'node',
        nodeId: node.id,
        message: `Nó '${node.label}' não possui entradas conectadas`,
        suggestion: 'Conecte este nó a uma fonte de dados'
      });
    }

    if (!hasOutputConnections && node.category !== 'output') {
      warnings.push({
        type: 'warning',
        category: 'node',
        nodeId: node.id,
        message: `Nó '${node.label}' não possui saídas conectadas`,
        suggestion: 'Conecte este nó a outros nós para processar seus dados'
      });
    }

    // Check if node is disabled
    if (!node.enabled) {
      warnings.push({
        type: 'warning',
        category: 'node',
        nodeId: node.id,
        message: `Nó '${node.label}' está desabilitado`,
        suggestion: 'Habilite o nó para incluí-lo no processamento'
      });
    }
  }

  private validateNodeConfiguration(
    node: PipelineNodeData,
    template: any,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (!template.validation) return;

    for (const [key, rule] of Object.entries(template.validation)) {
      const value = node.config[key];
      const validationRule = rule as any;

      // Check required fields
      if (validationRule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          type: 'error',
          category: 'node',
          nodeId: node.id,
          message: `Campo obrigatório '${key}' não está definido`,
          suggestion: `Configure o valor para '${key}' nas propriedades do nó`
        });
        continue;
      }

      if (value === undefined || value === null) continue;

      // Type validation
      if (validationRule.type && typeof value !== validationRule.type) {
        errors.push({
          type: 'error',
          category: 'node',
          nodeId: node.id,
          message: `Campo '${key}' deve ser do tipo ${validationRule.type}`,
          suggestion: `Ajuste o valor para o tipo correto`
        });
      }

      // Range validation
      if (validationRule.min !== undefined && value < validationRule.min) {
        errors.push({
          type: 'error',
          category: 'node',
          nodeId: node.id,
          message: `Campo '${key}' deve ser maior ou igual a ${validationRule.min}`,
          suggestion: `Ajuste o valor para pelo menos ${validationRule.min}`
        });
      }

      if (validationRule.max !== undefined && value > validationRule.max) {
        errors.push({
          type: 'error',
          category: 'node',
          nodeId: node.id,
          message: `Campo '${key}' deve ser menor ou igual a ${validationRule.max}`,
          suggestion: `Ajuste o valor para no máximo ${validationRule.max}`
        });
      }

      // Custom validation warnings
      if (validationRule.warning) {
        const warningCondition = validationRule.warning(value);
        if (warningCondition) {
          warnings.push({
            type: 'warning',
            category: 'node',
            nodeId: node.id,
            message: warningCondition,
            suggestion: validationRule.warningSuggestion || 'Revise esta configuração'
          });
        }
      }
    }
  }

  private validateConnection(
    connection: NodeConnection,
    nodes: PipelineNodeData[],
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Find source and target nodes
    const sourceNode = nodes.find(n => n.id === connection.sourceNodeId);
    const targetNode = nodes.find(n => n.id === connection.targetNodeId);

    if (!sourceNode) {
      errors.push({
        type: 'error',
        category: 'connection',
        connectionId: connection.id,
        message: 'Nó de origem da conexão não encontrado',
        suggestion: 'Remova conexões inválidas'
      });
      return;
    }

    if (!targetNode) {
      errors.push({
        type: 'error',
        category: 'connection',
        connectionId: connection.id,
        message: 'Nó de destino da conexão não encontrado',
        suggestion: 'Remova conexões inválidas'
      });
      return;
    }

    // Validate connection compatibility
    const sourceTemplate = allNodeTemplates.find(t => t.type === sourceNode.type);
    const targetTemplate = allNodeTemplates.find(t => t.type === targetNode.type);

    if (!sourceTemplate || !targetTemplate) return;

    const sourceOutput = sourceTemplate.outputs.find(o => o.id === connection.sourceHandle);
    const targetInput = targetTemplate.inputs.find(i => i.id === connection.targetHandle);

    if (!sourceOutput) {
      errors.push({
        type: 'error',
        category: 'connection',
        connectionId: connection.id,
        message: `Saída '${connection.sourceHandle}' não existe no nó de origem`,
        suggestion: 'Verifique as conexões do nó'
      });
      return;
    }

    if (!targetInput) {
      errors.push({
        type: 'error',
        category: 'connection',
        connectionId: connection.id,
        message: `Entrada '${connection.targetHandle}' não existe no nó de destino`,
        suggestion: 'Verifique as conexões do nó'
      });
      return;
    }

    // Type compatibility check
    if (targetInput.type !== 'any' && sourceOutput.type !== targetInput.type) {
      warnings.push({
        type: 'warning',
        category: 'connection',
        connectionId: connection.id,
        message: `Tipos incompatíveis: '${sourceOutput.type}' → '${targetInput.type}'`,
        suggestion: 'Verifique se os tipos de dados são compatíveis'
      });
    }

    // Check for cycles
    if (this.hasCycle(connection, nodes, [])) {
      errors.push({
        type: 'error',
        category: 'connection',
        connectionId: connection.id,
        message: 'Conexão cria um ciclo no pipeline',
        suggestion: 'Remova conexões que criam loops infinitos'
      });
    }
  }

  private validatePipelineFlow(
    pipeline: Pipeline,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // Check for disconnected components
    const components = this.findConnectedComponents(pipeline.nodes, pipeline.connections);
    if (components.length > 1) {
      warnings.push({
        type: 'warning',
        category: 'pipeline',
        message: `Pipeline possui ${components.length} componentes desconectados`,
        suggestion: 'Conecte todos os nós para formar um pipeline único'
      });
    }

    // Performance warnings
    const processingNodes = pipeline.nodes.filter(node => node.category === 'processing');
    if (processingNodes.length > 10) {
      warnings.push({
        type: 'warning',
        category: 'pipeline',
        message: 'Pipeline possui muitos nós de processamento',
        suggestion: 'Considere otimizar para melhor performance'
      });
    }

    // Validate execution order
    const executionOrder = this.getExecutionOrder(pipeline.nodes, pipeline.connections);
    if (executionOrder.length !== pipeline.nodes.length) {
      errors.push({
        type: 'error',
        category: 'pipeline',
        message: 'Não é possível determinar ordem de execução',
        suggestion: 'Verifique se não há ciclos ou nós desconectados'
      });
    }
  }

  private hasCycle(
    connection: NodeConnection,
    _nodes: PipelineNodeData[],
    visited: string[]
  ): boolean {
    if (visited.includes(connection.targetNodeId)) {
      return true;
    }

    visited.push(connection.targetNodeId);

    // Find all connections from target node
    // Simplified for this example - would need actual connection traversal
    return false;
  }

  private findConnectedComponents(
    nodes: PipelineNodeData[],
    connections: NodeConnection[]
  ): PipelineNodeData[][] {
    const visited = new Set<string>();
    const components: PipelineNodeData[][] = [];

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const component: PipelineNodeData[] = [];
        this.dfsComponent(node.id, nodes, connections, visited, component);
        components.push(component);
      }
    }

    return components;
  }

  private dfsComponent(
    nodeId: string,
    nodes: PipelineNodeData[],
    connections: NodeConnection[],
    visited: Set<string>,
    component: PipelineNodeData[]
  ): void {
    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      component.push(node);
    }

    // Find connected nodes
    const connectedNodes = connections
      .filter(conn => conn.sourceNodeId === nodeId || conn.targetNodeId === nodeId)
      .map(conn => conn.sourceNodeId === nodeId ? conn.targetNodeId : conn.sourceNodeId);

    for (const connectedNodeId of connectedNodes) {
      this.dfsComponent(connectedNodeId, nodes, connections, visited, component);
    }
  }

  private getExecutionOrder(
    nodes: PipelineNodeData[],
    connections: NodeConnection[]
  ): PipelineNodeData[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    }

    // Build graph
    for (const connection of connections) {
      adjList.get(connection.sourceNodeId)?.push(connection.targetNodeId);
      inDegree.set(connection.targetNodeId, (inDegree.get(connection.targetNodeId) || 0) + 1);
    }

    // Topological sort
    const queue: string[] = [];
    const result: PipelineNodeData[] = [];

    // Add nodes with no dependencies
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        result.push(node);
      }

      // Process neighbors
      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }
}

export const pipelineValidator = PipelineValidator.getInstance();
