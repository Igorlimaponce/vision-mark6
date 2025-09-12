import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../../common';

interface DetectionData {
  time: string;
  detections: number;
  alerts: number;
}

interface DetectionTrendsWidgetProps {
  data?: DetectionData[];
  title?: string;
}

const mockData: DetectionData[] = [
  { time: '08:00', detections: 45, alerts: 2 },
  { time: '09:00', detections: 67, alerts: 1 },
  { time: '10:00', detections: 89, alerts: 3 },
  { time: '11:00', detections: 112, alerts: 5 },
  { time: '12:00', detections: 95, alerts: 2 },
  { time: '13:00', detections: 134, alerts: 7 },
  { time: '14:00', detections: 156, alerts: 4 },
  { time: '15:00', detections: 123, alerts: 6 },
  { time: '16:00', detections: 98, alerts: 3 },
  { time: '17:00', detections: 167, alerts: 8 },
  { time: '18:00', detections: 189, alerts: 9 },
  { time: '19:00', detections: 145, alerts: 5 }
];

export const DetectionTrendsWidget: React.FC<DetectionTrendsWidgetProps> = ({ 
  data = mockData, 
  title = "Tendências de Detecção" 
}) => {
  return (
    <Card className="h-80">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip 
            labelStyle={{ color: '#374151' }}
            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #d1d5db' }}
          />
          <Line 
            type="monotone" 
            dataKey="detections" 
            stroke="#7ED321" 
            strokeWidth={2}
            name="Detecções"
          />
          <Line 
            type="monotone" 
            dataKey="alerts" 
            stroke="#F44336" 
            strokeWidth={2}
            name="Alertas"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
