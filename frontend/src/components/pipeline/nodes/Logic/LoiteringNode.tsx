import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';

interface LoiteringNodeData {
  timeThreshold: number;
  area?: string;
}

interface LoiteringNodeProps {
  data: LoiteringNodeData;
  selected?: boolean;
}

export const LoiteringNode: React.FC<LoiteringNodeProps> = ({ data, selected }) => {
  return (
    <div className={`bg-white border-2 rounded-lg p-4 min-w-48 ${
      selected ? 'border-orange-500 shadow-lg' : 'border-gray-300 shadow-md'
    }`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-purple-100 rounded-full">
          <Clock size={20} className="text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Loitering</h3>
          <p className="text-xs text-gray-500">Logic & Filtering</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Tempo Limite:</span>
          <span className="ml-1">{data.timeThreshold || 60}s</span>
        </div>
        {data.area && (
          <div>
            <span className="text-gray-600">Área:</span>
            <span className="ml-1">{data.area}</span>
          </div>
        )}
        <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
          Detecta permanência prolongada
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
      />
    </div>
  );
};
