import { useState, useEffect } from 'react';
import { SearchBar } from '../components/fleet/SearchBar';
import { DeviceListItem } from '../components/fleet/DeviceListItem';
import { SummaryCard } from '../components/fleet/SummaryCard';
import { devicesApi, type Device } from '../services/api';
import { useWebSocket, type DeviceUpdate } from '../hooks/useWebSocket';
import { Loading } from '../components/common/Loading';
import toast from 'react-hot-toast';

export const FleetManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket para updates em tempo real
  const { isConnected, onDeviceUpdate } = useWebSocket();

  // Carregar dispositivos da API
  useEffect(() => {
    loadDevices();
  }, []);

  // Configurar listener para updates de dispositivos via WebSocket
  useEffect(() => {
    if (isConnected) {
      const cleanup = onDeviceUpdate((update: DeviceUpdate) => {
        setDevices(prevDevices => 
          prevDevices.map(device => 
            device.id === update.device_id 
              ? { ...device, status: update.status, last_seen: update.last_seen }
              : device
          )
        );
        
        // Mostrar notificação para mudanças de status importantes
        const device = devices.find(d => d.id === update.device_id);
        if (device && device.status !== update.status) {
          const statusText = update.status === 'online' ? 'Online' : 
                           update.status === 'offline' ? 'Offline' : 'Warning';
          toast.success(`${device.name} agora está ${statusText}`);
        }
      });

      return cleanup;
    }
  }, [isConnected, onDeviceUpdate, devices]);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const devicesData = await devicesApi.getAll();
      setDevices(devicesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dispositivos');
      toast.error('Erro ao carregar dispositivos');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar dispositivos baseado no termo de busca
  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeviceClick = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    toast.success(`Navegando para detalhes do dispositivo: ${device?.name || deviceId}`);
    // Aqui seria implementada a navegação para a página de detalhes
  };

  // Calcular estatísticas
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const warningDevices = devices.filter(d => d.status === 'warning').length;
  const totalCameras = devices.filter(d => d.device_type === 'camera').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadDevices}
          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar por nome ou ID do dispositivo..."
      />

      {/* Device List */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Dispositivos ({filteredDevices.length})
        </h2>
        
        {filteredDevices.length > 0 ? (
          <div className="space-y-3">
            {filteredDevices.map((device: Device) => (
              <DeviceListItem
                key={device.id}
                id={device.id}
                name={device.name}
                lastSeen={new Date(device.last_seen)}
                status={device.status === 'online' ? 'ON' : device.status === 'offline' ? 'OFF' : 'WARNING'}
                onClick={handleDeviceClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm 
                ? 'Nenhum dispositivo encontrado para esta busca.'
                : 'Nenhum dispositivo registrado.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          value={onlineDevices}
          label="Online"
        />
        <SummaryCard
          value={offlineDevices}
          label="Offline"
        />
        <SummaryCard
          value={warningDevices}
          label="Warning"
        />
        <SummaryCard
          value={totalCameras}
          label="Total Cameras"
        />
      </div>
    </div>
  );
};
