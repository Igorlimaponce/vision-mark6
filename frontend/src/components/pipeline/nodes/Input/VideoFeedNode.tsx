import { Handle, Position } from '@xyflow/react';
import { Video } from 'lucide-react';

interface VideoFeedNodeData {
  url: string;
  fps: number;
  rtspFormat: string;
  sceneChangeDetection: boolean;
}

interface VideoFeedNodeProps {
  data: VideoFeedNodeData;
  selected?: boolean;
}

export const VideoFeedNode: React.FC<VideoFeedNodeProps> = ({ data, selected }) => {
  return (
    <div className={`bg-white border-2 rounded-lg p-4 min-w-48 ${
      selected ? 'border-orange-500 shadow-lg' : 'border-gray-300 shadow-md'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-blue-100 rounded-full">
          <Video size={20} className="text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Feed de Vídeo</h3>
          <p className="text-xs text-gray-500">Input Source</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-600">URL:</span>
          <span className="ml-1 font-mono text-xs">{data.url || 'rtsp://...'}</span>
        </div>
        <div>
          <span className="text-gray-600">FPS:</span>
          <span className="ml-1">{data.fps || 30}</span>
        </div>
        <div>
          <span className="text-gray-600">Format:</span>
          <span className="ml-1">{data.rtspFormat || 'h264'}</span>
        </div>
        {data.sceneChangeDetection && (
          <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            Scene Change Detection
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
    </div>
  );
};
