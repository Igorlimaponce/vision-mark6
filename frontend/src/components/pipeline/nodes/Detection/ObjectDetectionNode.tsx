import { Handle, Position } from '@xyflow/react';
import { Car } from 'lucide-react';

interface ObjectDetectionNodeData {
  model: string;
  classes: string[];
  confidenceThreshold: number;
}

interface ObjectDetectionNodeProps {
  data: ObjectDetectionNodeData;
  selected?: boolean;
}

export const ObjectDetectionNode: React.FC<ObjectDetectionNodeProps> = ({ data, selected }) => {
  return (
    <div className={`bg-white border-2 rounded-lg p-4 min-w-48 ${
      selected ? 'border-orange-500 shadow-lg' : 'border-gray-300 shadow-md'
    }`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-500 border-2 border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-green-100 rounded-full">
          <Car size={20} className="text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Detecção de Objetos</h3>
          <p className="text-xs text-gray-500">Detection & AI</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-600">Modelo:</span>
          <span className="ml-1">{data.model || 'YOLO v8'}</span>
        </div>
        <div>
          <span className="text-gray-600">Confiança:</span>
          <span className="ml-1">{data.confidenceThreshold || 0.7}</span>
        </div>
        <div>
          <span className="text-gray-600">Classes:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {(data.classes || ['car', 'person']).map((cls, index) => (
              <span 
                key={index}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
              >
                {cls}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500 border-2 border-white"
      />
    </div>
  );
};
