import { Handle, Position } from '@xyflow/react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppNodeData {
  phoneNumber: string;
  message: string;
  sendImage: boolean;
  notificationInterval: number;
}

interface WhatsAppNodeProps {
  data: WhatsAppNodeData;
  selected?: boolean;
}

export const WhatsAppNode: React.FC<WhatsAppNodeProps> = ({ data, selected }) => {
  return (
    <div className={`bg-white border-2 rounded-lg p-4 min-w-48 ${
      selected ? 'border-orange-500 shadow-lg' : 'border-gray-300 shadow-md'
    }`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-red-500 border-2 border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-red-100 rounded-full">
          <MessageCircle size={20} className="text-red-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">WhatsApp</h3>
          <p className="text-xs text-gray-500">Actions & Notifications</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Telefone:</span>
          <span className="ml-1 font-mono">{data.phoneNumber || '+55...'}</span>
        </div>
        <div>
          <span className="text-gray-600">Mensagem:</span>
          <p className="text-xs bg-gray-50 p-2 rounded mt-1 italic">
            {data.message || 'Alerta: Evento detectado!'}
          </p>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Intervalo:</span>
          <span>{data.notificationInterval || 30}s</span>
        </div>
        {data.sendImage && (
          <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Incluir imagem
          </div>
        )}
      </div>
    </div>
  );
};
