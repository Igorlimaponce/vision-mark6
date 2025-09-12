import { Camera, ChevronRight, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusIndicator } from './StatusIndicator';
import type { DeviceListItemProps } from '../../types';

export const DeviceListItem: React.FC<DeviceListItemProps> = ({
  id,
  name,
  lastSeen,
  status,
  onClick
}) => {
  const handleClick = () => {
    onClick(id);
  };

  const handleConfigureROI = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar trigger do click principal
    // TODO: Implementar navegação para editor de ROI
    console.log(`Configurar ROI para dispositivo ${id}`);
  };

  const formatLastSeen = (date: Date) => {
    return `Last seen: ${formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: ptBR 
    })}`;
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm p-4 mb-3 hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <Camera size={24} className="text-gray-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {name}
            </h3>
            <p className="text-sm text-gray-500 mb-1">ID: {id}</p>
            <p className="text-xs text-gray-400">
              {formatLastSeen(lastSeen)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <StatusIndicator status={status} />
          
          {/* Botão ROI - apenas para dispositivos ativos */}
          {status === 'ON' && (
            <button
              onClick={handleConfigureROI}
              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
              title="Configurar ROI"
            >
              <Settings size={16} />
            </button>
          )}
          
          <ChevronRight size={20} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
};
