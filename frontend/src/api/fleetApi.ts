import { apiClient, handleApiError } from './client';
import type { 
  Device, 
  DeviceUI, 
  DeviceCreate, 
  DeviceUpdate, 
  DeviceListResponse, 
  FleetSummary 
} from '../types';

// Função para converter Device da API para DeviceUI (compatibilidade com frontend atual)
const deviceToUI = (device: Device): DeviceUI => ({
  id: device.id,
  name: device.name,
  lastSeen: device.last_seen ? new Date(device.last_seen) : new Date(),
  status: device.status as 'ON' | 'OFF' | 'WARNING',
  type: device.device_type === 'camera' ? 'camera' : 'sensor'
});

// Parâmetros de busca
export interface DeviceSearchParams {
  skip?: number;
  limit?: number;
  search?: string;
  status?: 'ON' | 'OFF' | 'WARNING';
}

// API functions para Fleet Management
export const fleetApi = {
  // Listar dispositivos com filtros
  async getDevices(params: DeviceSearchParams = {}): Promise<DeviceListResponse> {
    try {
      const response = await apiClient.get<DeviceListResponse>('/fleet/', params);
      
      // Converter datas de string para Date objects
      const devices = response.devices.map(device => ({
        ...device,
        last_seen: device.last_seen ? new Date(device.last_seen) : undefined,
        created_at: new Date(device.created_at),
        updated_at: new Date(device.updated_at)
      }));

      const summary = {
        ...response.summary,
        last_updated: new Date(response.summary.last_updated)
      };
      
      return {
        devices,
        total: response.total,
        summary
      };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Listar dispositivos para UI (compatibilidade)
  async getDevicesForUI(params: DeviceSearchParams = {}): Promise<DeviceUI[]> {
    const response = await this.getDevices(params);
    return response.devices.map(deviceToUI);
  },

  // Obter um dispositivo específico
  async getDevice(id: string): Promise<Device | null> {
    try {
      const device = await apiClient.get<Device>(`/fleet/${id}`);
      return {
        ...device,
        last_seen: device.last_seen ? new Date(device.last_seen) : undefined,
        created_at: new Date(device.created_at),
        updated_at: new Date(device.updated_at)
      };
    } catch (error) {
      if ((error as any)?.response?.status === 404) {
        return null;
      }
      throw new Error(handleApiError(error));
    }
  },

  // Criar um novo dispositivo
  async createDevice(deviceData: DeviceCreate): Promise<Device> {
    try {
      const device = await apiClient.post<Device>('/fleet/', deviceData);
      return {
        ...device,
        last_seen: device.last_seen ? new Date(device.last_seen) : undefined,
        created_at: new Date(device.created_at),
        updated_at: new Date(device.updated_at)
      };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Atualizar um dispositivo
  async updateDevice(id: string, updates: DeviceUpdate): Promise<Device> {
    try {
      const device = await apiClient.put<Device>(`/fleet/${id}`, updates);
      return {
        ...device,
        last_seen: device.last_seen ? new Date(device.last_seen) : undefined,
        created_at: new Date(device.created_at),
        updated_at: new Date(device.updated_at)
      };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Deletar um dispositivo
  async deleteDevice(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/fleet/${id}`);
      return true;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Atualizar status de um dispositivo (heartbeat)
  async updateDeviceStatus(id: string, statusData: { status: string; metadata?: any }): Promise<Device> {
    try {
      const device = await apiClient.post<Device>(`/fleet/${id}/status`, statusData);
      return {
        ...device,
        last_seen: device.last_seen ? new Date(device.last_seen) : undefined,
        created_at: new Date(device.created_at),
        updated_at: new Date(device.updated_at)
      };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Obter resumo da frota
  async getFleetSummary(): Promise<FleetSummary> {
    try {
      const summary = await apiClient.get<FleetSummary>('/fleet/summary');
      return {
        ...summary,
        last_updated: new Date(summary.last_updated)
      };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Obter dispositivos por status
  async getDevicesByStatus(status: 'ON' | 'OFF' | 'WARNING'): Promise<Device[]> {
    try {
      const devices = await apiClient.get<Device[]>(`/fleet/status/${status}`);
      return devices.map(device => ({
        ...device,
        last_seen: device.last_seen ? new Date(device.last_seen) : undefined,
        created_at: new Date(device.created_at),
        updated_at: new Date(device.updated_at)
      }));
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Função de compatibilidade com frontend atual (mock fallback se API falhar)
  async getDevicesWithFallback(): Promise<DeviceUI[]> {
    try {
      return await this.getDevicesForUI();
    } catch (error) {
      console.warn('API não disponível, usando dados mock:', error);
      // Fallback para dados mock
      return [
        {
          id: 'QC96490-ODK19',
          name: 'Câmera Doca 5',
          lastSeen: new Date(Date.now() - 2 * 60 * 1000),
          status: 'ON',
          type: 'camera'
        },
        {
          id: 'XF78234-LKM43',
          name: 'Sensor Entrada Principal',
          lastSeen: new Date(Date.now() - 5 * 60 * 1000),
          status: 'WARNING',
          type: 'sensor'
        },
        {
          id: 'BC45123-POI87',
          name: 'Câmera Estacionamento',
          lastSeen: new Date(Date.now() - 30 * 60 * 1000),
          status: 'OFF',
          type: 'camera'
        },
        {
          id: 'YU89012-QWE56',
          name: 'Monitor Perimetral Norte',
          lastSeen: new Date(Date.now() - 1 * 60 * 1000),
          status: 'ON',
          type: 'camera'
        },
        {
          id: 'RT56789-ASD34',
          name: 'Detector de Movimento Sul',
          lastSeen: new Date(Date.now() - 15 * 60 * 1000),
          status: 'WARNING',
          type: 'sensor'
        }
      ];
    }
  }
};
