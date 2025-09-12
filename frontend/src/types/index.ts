export interface Device {
  id: string;
  name: string;
  lastSeen: Date;
  status: 'ON' | 'OFF' | 'WARNING';
  type: 'camera' | 'sensor';
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
