import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../../common';

interface VehicleCountData {
  time: string;
  vehicles: number;
}

interface VehicleCountWidgetProps {
  data?: VehicleCountData[];
  title?: string;
}

const mockData: VehicleCountData[] = [
  { time: '08:00', vehicles: 12 },
  { time: '09:00', vehicles: 19 },
  { time: '10:00', vehicles: 24 },
  { time: '11:00', vehicles: 35 },
  { time: '12:00', vehicles: 28 },
  { time: '13:00', vehicles: 42 },
  { time: '14:00', vehicles: 38 },
  { time: '15:00', vehicles: 33 },
  { time: '16:00', vehicles: 29 },
  { time: '17:00', vehicles: 45 },
  { time: '18:00', vehicles: 52 },
  { time: '19:00', vehicles: 31 }
];

export const VehicleCountWidget: React.FC<VehicleCountWidgetProps> = ({ 
  data = mockData, 
  title = "Contagem de Veículos por Hora" 
}) => {
  return (
    <Card className="h-80">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip 
            labelStyle={{ color: '#374151' }}
            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #d1d5db' }}
          />
          <Bar dataKey="vehicles" fill="#4A90E2" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
