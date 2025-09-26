// API client para Dashboard conectado ao backend real

import { apiClient } from './client';

export interface DashboardMetrics {
  devices: {
    total: number;
    online: number;
    offline: number;
    warning: number;
  };
  events: {
    last_24h: number;
  };
  system: {
    uptime_hours: number;
    active_pipelines: number;
    cpu_usage: number;
    memory_usage: number;
  };
}

export interface DevicesStatusData {
  data: {
    online: number;
    offline: number;
    warning: number;
  };
  total: number;
}

export interface RecentEvent {
  id: string;
  type: string;
  severity: string;
  message: string;
  device_name: string;
  created_at: string;
  status: string;
}

export interface PipelineStats {
  total_pipelines: number;
  active_pipelines: number;
  paused_pipelines: number;
  failed_pipelines: number;
  executions_today: number;
  avg_execution_time: number;
  success_rate: number;
  last_24h_executions: Array<{
    hour: string;
    count: number;
  }>;
}

/**
 * API client para Dashboard - conecta ao backend real
 */
export const dashboardApi = {
  /**
   * Obter métricas gerais do dashboard
   */
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      const response: any = await apiClient.get('/dashboard/metrics');
      return response.data as DashboardMetrics;
    } catch (error) {
      console.error('Erro ao carregar métricas do dashboard:', error);
      // Fallback para dados mock em caso de erro
      return {
        devices: { total: 0, online: 0, offline: 0, warning: 0 },
        events: { last_24h: 0 },
        system: { uptime_hours: 0, active_pipelines: 0, cpu_usage: 0, memory_usage: 0 }
      };
    }
  },

  /**
   * Obter breakdown de status dos dispositivos
   */
  async getDevicesStatus(): Promise<DevicesStatusData> {
    try {
      const response: any = await apiClient.get('/dashboard/devices-status');
      return response.data as DevicesStatusData;
    } catch (error) {
      console.error('Erro ao carregar status dos dispositivos:', error);
      return {
        data: { online: 0, offline: 0, warning: 0 },
        total: 0
      };
    }
  },

  /**
   * Obter eventos recentes para timeline
   */
  async getRecentEvents(): Promise<RecentEvent[]> {
    try {
      const response: any = await apiClient.get('/dashboard/recent-events');
      return response.data as RecentEvent[];
    } catch (error) {
      console.error('Erro ao carregar eventos recentes:', error);
      return [];
    }
  },

  /**
   * Obter estatísticas de pipelines
   */
  async getPipelineStats(): Promise<PipelineStats> {
    try {
      const response: any = await apiClient.get('/dashboard/pipeline-stats');
      return response.data as PipelineStats;
    } catch (error) {
      console.error('Erro ao carregar estatísticas de pipelines:', error);
      return {
        total_pipelines: 0,
        active_pipelines: 0,
        paused_pipelines: 0,
        failed_pipelines: 0,
        executions_today: 0,
        avg_execution_time: 0,
        success_rate: 0,
        last_24h_executions: []
      };
    }
  }
};