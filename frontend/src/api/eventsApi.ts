// API client para Eventos e Alertas conectado ao backend real

import { apiClient, handleApiError } from './client';

export interface Event {
  id: string;
  type: 'detection' | 'alert' | 'system' | 'maintenance' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  device_id?: string;
  device_name?: string;
  location?: string;
  created_at: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  metadata?: Record<string, any>;
}

export interface EventsListResponse {
  events: Event[];
  total: number;
  skip: number;
  limit: number;
}

export interface EventsSummary {
  total_events: number;
  acknowledged: number;
  pending: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  period_hours: number;
}

export interface EventCreate {
  type: string;
  severity: string;
  title: string;
  description: string;
  device_id?: string;
  device_name?: string;
  location?: string;
  metadata?: Record<string, any>;
}

export interface EventsSearchParams {
  skip?: number;
  limit?: number;
  event_type?: string;
  severity?: string;
  acknowledged?: boolean;
  device_id?: string;
  start_date?: string;
  end_date?: string;
}

/**
 * API client para Eventos e Alertas - conecta ao backend real
 */
export const eventsApi = {
  /**
   * Listar eventos com filtros opcionais
   */
  async getEvents(params: EventsSearchParams = {}): Promise<EventsListResponse> {
    try {
      const response = await apiClient.get<EventsListResponse>('/events/', params);
      
      // Converter datas de string para Date objects se necessário
      const events = response.events.map(event => ({
        ...event,
        created_at: event.created_at,
        acknowledged_at: event.acknowledged_at
      }));
      
      return {
        ...response,
        events
      };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Obter um evento específico
   */
  async getEvent(id: string): Promise<Event | null> {
    try {
      const events = await this.getEvents({ limit: 1000 });
      const event = events.events.find(e => e.id === id);
      return event || null;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Criar um novo evento
   */
  async createEvent(eventData: EventCreate): Promise<Event> {
    try {
      const event = await apiClient.post<Event>('/events/', eventData);
      return event;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Marcar evento como reconhecido
   */
  async acknowledgeEvent(id: string): Promise<Event> {
    try {
      const event = await apiClient.put<Event>(`/events/${id}/acknowledge`);
      return event;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Deletar um evento (apenas admins)
   */
  async deleteEvent(id: string): Promise<void> {
    try {
      await apiClient.delete(`/events/${id}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Obter resumo de eventos
   */
  async getEventsSummary(hours: number = 24): Promise<EventsSummary> {
    try {
      const summary = await apiClient.get<EventsSummary>(`/events/summary?hours=${hours}`);
      return summary;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Obter eventos recentes para widgets
   */
  async getRecentEvents(limit: number = 10): Promise<Event[]> {
    try {
      const events = await apiClient.get<Event[]>(`/events/recent?limit=${limit}`);
      return events;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Obter tipos de eventos disponíveis
   */
  async getEventTypes(): Promise<string[]> {
    try {
      const types = await apiClient.get<string[]>('/events/types');
      return types;
    } catch (error) {
      console.warn('Erro ao carregar tipos de eventos:', error);
      return ['detection', 'alert', 'system', 'maintenance', 'security', 'performance'];
    }
  },

  /**
   * Obter severidades disponíveis
   */
  async getEventSeverities(): Promise<string[]> {
    try {
      const severities = await apiClient.get<string[]>('/events/severities');
      return severities;
    } catch (error) {
      console.warn('Erro ao carregar severidades:', error);
      return ['low', 'medium', 'high', 'critical'];
    }
  },

  /**
   * Obter eventos por severidade
   */
  async getEventsBySeverity(severity: string): Promise<Event[]> {
    try {
      const response = await this.getEvents({ severity, limit: 100 });
      return response.events;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Obter eventos não reconhecidos
   */
  async getPendingEvents(): Promise<Event[]> {
    try {
      const response = await this.getEvents({ acknowledged: false, limit: 100 });
      return response.events;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Obter eventos de um dispositivo específico
   */
  async getEventsByDevice(deviceId: string): Promise<Event[]> {
    try {
      const response = await this.getEvents({ device_id: deviceId, limit: 100 });
      return response.events;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Função para mapear severidade para cor
   */
  getSeverityColor(severity: string): string {
    const colors = {
      low: '#10B981',      // Verde
      medium: '#F59E0B',   // Amarelo
      high: '#EF4444',     // Vermelho
      critical: '#DC2626'  // Vermelho escuro
    };
    return colors[severity as keyof typeof colors] || '#6B7280';
  },

  /**
   * Função para mapear tipo para ícone
   */
  getTypeIcon(type: string): string {
    const icons = {
      detection: 'eye',
      alert: 'alert-triangle',
      system: 'settings',
      maintenance: 'wrench',
      security: 'shield',
      performance: 'activity'
    };
    return icons[type as keyof typeof icons] || 'info';
  }
};