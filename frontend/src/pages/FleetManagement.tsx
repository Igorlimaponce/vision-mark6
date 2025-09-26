import { useState, useEffect } from 'react';
import { SearchBar } from '../components/fleet/SearchBar';
import { DeviceListItem } from '../components/fleet/DeviceListItem';
import { SummaryCard } from '../components/fleet/SummaryCard';
import { fleetApi } from '../api/fleetApi';
import type { DeviceUI, FleetSummary } from '../types';
import { Loading } from '../components/common/Loading';
import toast from 'react-hot-toast';

export const FleetManagement: React.FC = () => {
  const [devices, setDevices] = useState<DeviceUI[]>([]);
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dispositivos da API
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Usar o método com fallback para garantir que funcione mesmo se API estiver offline
      const devicesData = await fleetApi.getDevicesWithFallback();
      setDevices(devicesData);
      
      // Tentar carregar o summary também
      try {
        const summaryData = await fleetApi.getFleetSummary();
        setSummary(summaryData);
      } catch (summaryError) {
        console.warn('Não foi possível carregar summary:', summaryError);
      }
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
    device.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeviceClick = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    toast.success(`Navegando para detalhes do dispositivo: ${device?.name || deviceId}`);
    // Aqui seria implementada a navegação para a página de detalhes
  };

  // Calcular estatísticas baseado no summary ou nos devices carregados
  const onlineDevices = summary?.online_devices || devices.filter(d => d.status === 'ON').length;
  const offlineDevices = summary?.offline_devices || devices.filter(d => d.status === 'OFF').length;
  const warningDevices = summary?.warning_devices || devices.filter(d => d.status === 'WARNING').length;
  const totalDevices = summary?.total_devices || devices.length;
  const totalCameras = devices.filter(d => d.type === 'camera').length;

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
            {filteredDevices.map((device: DeviceUI) => (
              <DeviceListItem
                key={device.id}
                id={device.id}
                name={device.name}
                lastSeen={device.lastSeen}
                status={device.status}
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
