export interface Device {
  id: string;
  organization_id: string;
  name: string;
  device_type: string;
  status: 'ON' | 'OFF' | 'WARNING';
  rtsp_url?: string;
  location?: string;
  device_data?: Record<string, any>;
  last_seen?: Date;
  created_at: Date;
  updated_at: Date;
}

// Interface compatível com o frontend atual
export interface DeviceUI {
  id: string;
  name: string;
  lastSeen: Date;
  status: 'ON' | 'OFF' | 'WARNING';
  type: 'camera' | 'sensor';
}

// Schemas para criação e atualização
export interface DeviceCreate {
  name: string;
  device_type?: string;
  rtsp_url?: string;
  location?: string;
  device_data?: Record<string, any>;
}

export interface DeviceUpdate {
  name?: string;
  device_type?: string;
  rtsp_url?: string;
  status?: string;
  location?: string;
  device_data?: Record<string, any>;
  last_seen?: Date;
}

// Resposta da API de fleet
export interface FleetSummary {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  warning_devices: number;
  last_updated: Date;
}

export interface DeviceListResponse {
  devices: Device[];
  total: number;
  summary: FleetSummary;
}

export interface DeviceListItemProps {
  id: string;
  name: string;
  lastSeen: Date;
  status: 'ON' | 'OFF' | 'WARNING';
  onClick: (id: string) => void;
}

export interface StatusIndicatorProps {
  status: 'ON' | 'OFF' | 'WARNING';
}

export interface SummaryCardProps {
  value: number;
  label: string;
}

export interface MenuItemProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
}
