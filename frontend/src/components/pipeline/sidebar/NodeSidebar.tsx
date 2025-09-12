import { Video, Car, User, Smile, Users, Clock, ArrowRightLeft, Square, MessageCircle, Bell, Settings, Zap } from 'lucide-react';

interface NodeTemplate {
  id: string;
  type: string;
  category: 'input' | 'detection' | 'logic' | 'action';
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const nodeTemplates: NodeTemplate[] = [
  // Input/Sources
  {
    id: 'video-feed',
    type: 'videoFeed',
    category: 'input',
    name: 'Feed de Vídeo',
    description: 'Captura stream de vídeo de câmera',
    icon: Video,
    color: 'bg-blue-100 text-blue-600'
  },
  
  // Detection & AI
  {
    id: 'object-detection',
    type: 'objectDetection',
    category: 'detection',
    name: 'Detecção de Objetos',
    description: 'Modelo genérico para detecção de objetos',
    icon: Car,
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 'person-detection',
    type: 'personDetection',
    category: 'detection',
    name: 'Person Detection',
    description: 'Modelo especializado para detectar pessoas',
    icon: User,
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 'face-detection',
    type: 'faceDetection',
    category: 'detection',
    name: 'Face Detection',
    description: 'Detecta rostos humanos',
    icon: Smile,
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 'face-recognition',
    type: 'faceRecognition',
    category: 'detection',
    name: 'Face Recognition',
    description: 'Reconhecimento facial com banco de dados',
    icon: Users,
    color: 'bg-green-100 text-green-600'
  },
  
  // Logic & Filtering
  {
    id: 'polygon-detection',
    type: 'polygonDetection',
    category: 'logic',
    name: 'Detecção em Polígono',
    description: 'Filtra detecções dentro de área poligonal',
    icon: Square,
    color: 'bg-purple-100 text-purple-600'
  },
  {
    id: 'loitering',
    type: 'loitering',
    category: 'logic',
    name: 'Loitering',
    description: 'Detecta permanência prolongada',
    icon: Clock,
    color: 'bg-purple-100 text-purple-600'
  },
  {
    id: 'polyline-direction',
    type: 'polylineDirection',
    category: 'logic',
    name: 'Polyline com Direção',
    description: 'Conta objetos que cruzam linha com direção',
    icon: ArrowRightLeft,
    color: 'bg-purple-100 text-purple-600'
  },
  
  // Actions & Notifications
  {
    id: 'whatsapp',
    type: 'whatsapp',
    category: 'action',
    name: 'WhatsApp',
    description: 'Envia notificação via WhatsApp',
    icon: MessageCircle,
    color: 'bg-red-100 text-red-600'
  },
  {
    id: 'kanban-notification',
    type: 'kanbanNotification',
    category: 'action',
    name: 'Kanban Notification',
    description: 'Cria card de alerta em painel Kanban',
    icon: Bell,
    color: 'bg-red-100 text-red-600'
  },
  {
    id: 'custom-alert',
    type: 'customAlert',
    category: 'action',
    name: 'Custom Alert',
    description: 'Alerta com payload customizado',
    icon: Settings,
    color: 'bg-red-100 text-red-600'
  },
  {
    id: 'plc',
    type: 'plc',
    category: 'action',
    name: 'PLC',
    description: 'Integração com sistema industrial',
    icon: Zap,
    color: 'bg-red-100 text-red-600'
  }
];

const categoryNames = {
  input: 'Entrada (Input/Sources)',
  detection: 'Detecção & IA',
  logic: 'Lógica & Filtragem',
  action: 'Ações & Notificações'
};

interface NodeSidebarProps {
  onNodeDragStart?: (nodeType: string) => void;
}

export const NodeSidebar: React.FC<NodeSidebarProps> = ({ onNodeDragStart }) => {
  const categories = Object.keys(categoryNames) as Array<keyof typeof categoryNames>;

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    onNodeDragStart?.(nodeType);
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Nós de Pipeline</h2>
        <p className="text-sm text-gray-600">Arraste os nós para o canvas</p>
      </div>

      <div className="p-4 space-y-6">
        {categories.map((category) => {
          const categoryNodes = nodeTemplates.filter(node => node.category === category);
          
          return (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                {categoryNames[category]}
              </h3>
              
              <div className="space-y-2">
                {categoryNodes.map((node) => {
                  const Icon = node.icon;
                  
                  return (
                    <div
                      key={node.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, node.type)}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all"
                    >
                      <div className={`p-2 rounded-full ${node.color}`}>
                        <Icon size={16} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900">
                          {node.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {node.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
