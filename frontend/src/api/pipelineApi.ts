import { apiClient } from './client';

export interface Pipeline {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'error';
  config?: any;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  nodes: any[];
  edges: any[];
}

export interface PipelineListResponse {
  pipelines: Pipeline[];
  total: number;
}

export const pipelineApi = {
  async getPipelines(): Promise<PipelineListResponse> {
    const response = await apiClient.get('/api/v1/pipelines/') as any;
    return response.data;
  },

  async getPipeline(id: string): Promise<Pipeline> {
    const response = await apiClient.get(`/api/v1/pipelines/${id}`) as any;
    return response.data;
  },

  async startPipeline(id: string): Promise<Pipeline> {
    const response = await apiClient.post(`/api/v1/pipelines/${id}/execute`, {
      action: 'start'
    }) as any;
    return response.data;
  },

  async stopPipeline(id: string): Promise<Pipeline> {
    const response = await apiClient.post(`/api/v1/pipelines/${id}/execute`, {
      action: 'stop'
    }) as any;
    return response.data;
  },

  getStatusColor(status: Pipeline['status']): string {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  },

  getStatusLabel(status: Pipeline['status']): string {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'inactive':
        return 'Inativo';
      case 'error':
        return 'Erro';
      default:
        return 'Desconhecido';
    }
  }
};