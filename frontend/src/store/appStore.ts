import { create } from 'zustand';
import type { Device } from '../types';

interface AppState {
  currentPage: string;
  devices: Device[];
  searchTerm: string;
  setCurrentPage: (page: string) => void;
  setDevices: (devices: Device[]) => void;
  setSearchTerm: (term: string) => void;
  filteredDevices: () => Device[];
}

// Mock data para desenvolvimento
const mockDevices: Device[] = [
  {
    id: 'QC96490-ODK19',
    name: 'Câmera Principal - Entrada',
    lastSeen: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    status: 'ON',
    type: 'camera'
  },
  {
    id: 'CAM-002',
    name: 'Câmera Estacionamento',
    lastSeen: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    status: 'WARNING',
    type: 'camera'
  },
  {
    id: 'CAM-003',
    name: 'Câmera Saída',
    lastSeen: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    status: 'OFF',
    type: 'camera'
  },
  {
    id: 'SENS-001',
    name: 'Sensor de Movimento A1',
    lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    status: 'ON',
    type: 'sensor'
  }
];

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'fleet',
  devices: mockDevices,
  searchTerm: '',
  
  setCurrentPage: (page) => set({ currentPage: page }),
  
  setDevices: (devices) => set({ devices }),
  
  setSearchTerm: (term) => set({ searchTerm: term }),
  
  filteredDevices: () => {
    const { devices, searchTerm } = get();
    if (!searchTerm) return devices;
    
    return devices.filter(device =>
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
}));
