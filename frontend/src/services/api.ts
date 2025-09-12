// Serviço centralizado para chamadas de API

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

export interface Device {
  id: string;
  name: string;
  device_type: string;
  status: 'online' | 'offline' | 'warning';
  rtsp_url?: string;
  location: string;
  last_seen: string;
  metadata?: Record<string, any>;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'operator' | 'viewer';
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  config: Record<string, any>;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  device_id: string;
  pipeline_id?: string;
  event_type: string;
  confidence: number;
  metadata?: Record<string, any>;
  timestamp: string;
  organization_id: string;
}

const API_BASE_URL = 'http://localhost:8000';

// Função para obter o token de autenticação
const getAuthToken = (): string | null => {
  return localStorage.getItem('aios_token');
};

// Função para fazer requisições HTTP
const makeRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// API de Autenticação
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: email,
        password: password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Erro de autenticação');
    }

    return response.json();
  },

  getCurrentUser: async (): Promise<User> => {
    return makeRequest<User>('/auth/me');
  },

  logout: async (): Promise<void> => {
    return makeRequest<void>('/auth/logout', {
      method: 'POST',
    });
  },
};

// API de Dispositivos
export const devicesApi = {
  getAll: async (): Promise<Device[]> => {
    return makeRequest<Device[]>('/fleet/devices');
  },

  getById: async (id: string): Promise<Device> => {
    return makeRequest<Device>(`/fleet/devices/${id}`);
  },

  create: async (device: Partial<Device>): Promise<Device> => {
    return makeRequest<Device>('/fleet/devices', {
      method: 'POST',
      body: JSON.stringify(device),
    });
  },

  update: async (id: string, device: Partial<Device>): Promise<Device> => {
    return makeRequest<Device>(`/fleet/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(device),
    });
  },

  delete: async (id: string): Promise<void> => {
    return makeRequest<void>(`/fleet/devices/${id}`, {
      method: 'DELETE',
    });
  },

  getStats: async () => {
    return makeRequest('/fleet/stats');
  },
};

// API de Pipelines
export const pipelinesApi = {
  getAll: async (): Promise<Pipeline[]> => {
    return makeRequest<Pipeline[]>('/pipelines');
  },

  getById: async (id: string): Promise<Pipeline> => {
    return makeRequest<Pipeline>(`/pipelines/${id}`);
  },

  create: async (pipeline: Partial<Pipeline>): Promise<Pipeline> => {
    return makeRequest<Pipeline>('/pipelines', {
      method: 'POST',
      body: JSON.stringify(pipeline),
    });
  },

  update: async (id: string, pipeline: Partial<Pipeline>): Promise<Pipeline> => {
    return makeRequest<Pipeline>(`/pipelines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pipeline),
    });
  },

  delete: async (id: string): Promise<void> => {
    return makeRequest<void>(`/pipelines/${id}`, {
      method: 'DELETE',
    });
  },

  // Execução de pipelines
  execute: async (id: string): Promise<void> => {
    return makeRequest<void>(`/pipelines/${id}/execute`, {
      method: 'POST',
    });
  },

  stop: async (id: string): Promise<void> => {
    return makeRequest<void>(`/pipelines/${id}/stop`, {
      method: 'POST',
    });
  },

  pause: async (id: string): Promise<void> => {
    return makeRequest<void>(`/pipelines/${id}/pause`, {
      method: 'POST',
    });
  },

  resume: async (id: string): Promise<void> => {
    return makeRequest<void>(`/pipelines/${id}/resume`, {
      method: 'POST',
    });
  },

  getExecutionStatus: async (id: string): Promise<any> => {
    return makeRequest(`/pipelines/${id}/execution-status`);
  },

  getExecutingPipelines: async (): Promise<any> => {
    return makeRequest('/pipelines/execution/list');
  },

  // Informações sobre nós
  getAvailableNodes: async (): Promise<any> => {
    return makeRequest('/pipelines/nodes/available');
  },

  getNodeConfigSchema: async (nodeType: string): Promise<any> => {
    return makeRequest(`/pipelines/nodes/${nodeType}/config-schema`);
  },

  getSystemStats: async (): Promise<any> => {
    return makeRequest('/pipelines/system/stats');
  },
};

// API de Eventos
export const eventsApi = {
  getAll: async (params?: {
    device_id?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<Event[]> => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = queryParams.toString() 
      ? `/dashboard/events?${queryParams.toString()}`
      : '/dashboard/events';

    return makeRequest<Event[]>(endpoint);
  },

  getById: async (id: string): Promise<Event> => {
    return makeRequest<Event>(`/dashboard/events/${id}`);
  },

  getStats: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = queryParams.toString()
      ? `/dashboard/analytics?${queryParams.toString()}`
      : '/dashboard/analytics';

    return makeRequest(endpoint);
  },
};

// API de Dashboard
export const dashboardApi = {
  getOverview: async () => {
    return makeRequest('/dashboard/overview');
  },

  getSystemHealth: async () => {
    return makeRequest('/dashboard/health');
  },
};

// API de Usuários
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    return makeRequest<User[]>('/auth/users');
  },

  getById: async (id: string): Promise<User> => {
    return makeRequest<User>(`/auth/users/${id}`);
  },

  create: async (user: Partial<User>): Promise<User> => {
    return makeRequest<User>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  update: async (id: string, user: Partial<User>): Promise<User> => {
    return makeRequest<User>(`/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },

  delete: async (id: string): Promise<void> => {
    return makeRequest<void>(`/auth/users/${id}`, {
      method: 'DELETE',
    });
  },
};

export default {
  auth: authApi,
  devices: devicesApi,
  pipelines: pipelinesApi,
  events: eventsApi,
  dashboard: dashboardApi,
  users: usersApi,
};
