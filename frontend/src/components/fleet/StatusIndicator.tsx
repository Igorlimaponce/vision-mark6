import type { StatusIndicatorProps } from '../../types';

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'ON':
        return 'bg-green-500';
      case 'WARNING':
        return 'bg-yellow-500';
      case 'OFF':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'ON':
        return 'Online';
      case 'WARNING':
        return 'Warning';
      case 'OFF':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
      <span className="text-sm font-medium">{getStatusText()}</span>
    </div>
  );
};
