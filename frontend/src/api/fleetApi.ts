import type { Device } from '../types';

// Mock API functions para Fleet Management
export const fleetApi = {
  async getDevices(): Promise<Device[]> {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return [
      {
        id: 'QC96490-ODK19',
        name: 'Câmera Doca 5',
        lastSeen: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        status: 'ON',
        type: 'camera'
      },
      {
        id: 'XF78234-LKM43',
        name: 'Sensor Entrada Principal',
        lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        status: 'WARNING',
        type: 'sensor'
      },
      {
        id: 'BC45123-POI87',
        name: 'Câmera Estacionamento',
        lastSeen: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        status: 'OFF',
        type: 'camera'
      },
      {
        id: 'YU89012-QWE56',
        name: 'Monitor Perimetral Norte',
        lastSeen: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
        status: 'ON',
        type: 'camera'
      },
      {
        id: 'RT56789-ASD34',
        name: 'Detector de Movimento Sul',
        lastSeen: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        status: 'WARNING',
        type: 'sensor'
      }
    ];
  },

  async getDevice(id: string): Promise<Device | null> {
    const devices = await this.getDevices();
    return devices.find(device => device.id === id) || null;
  },

  async updateDeviceStatus(id: string, status: 'ON' | 'OFF' | 'WARNING'): Promise<Device> {
    // Simular update no backend
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const device = await this.getDevice(id);
    if (!device) {
      throw new Error('Device not found');
    }
    
    return {
      ...device,
      status,
      lastSeen: new Date()
    };
  }
};
