// Tipos para Pipeline conforme manual v2.0
export interface PipelineNode {
  id: string;
  pipeline_id: string;
  node_type: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface PipelineEdge {
  id: string;
  pipeline_id: string;
  source_node_id: string;
  target_node_id: string;
}

export interface Pipeline {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_by_id: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

// Mock API functions para Pipelines
export const pipelineApi = {
  async getPipelines(): Promise<Pipeline[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return [
      {
        id: 'pipeline-1',
        organization_id: 'org-1',
        name: 'Segurança Perimetral',
        description: 'Pipeline para detecção de invasões no perímetro',
        created_by_id: 'user-1',
        nodes: [],
        edges: []
      },
      {
        id: 'pipeline-2',
        organization_id: 'org-1',
        name: 'Análise de Fila',
        description: 'Monitoramento de filas nos caixas',
        created_by_id: 'user-1',
        nodes: [],
        edges: []
      }
    ];
  },

  async createPipeline(pipeline: Omit<Pipeline, 'id'>): Promise<Pipeline> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      ...pipeline,
      id: `pipeline-${Date.now()}`
    };
  },

  async updatePipeline(id: string, updates: Partial<Pipeline>): Promise<Pipeline> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const pipelines = await this.getPipelines();
    const pipeline = pipelines.find(p => p.id === id);
    
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }
    
    return {
      ...pipeline,
      ...updates
    };
  },

  async deletePipeline(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Mock deletion - in real implementation would delete pipeline with given id
    console.log(`Deleting pipeline ${id}`);
  }
};
