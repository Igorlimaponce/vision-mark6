// Templates e configurações dos nós disponíveis

import type { NodeTemplate } from '../types/pipeline';

// Templates de nós de entrada
export const inputNodeTemplates: NodeTemplate[] = [
  {
    type: 'camera_input',
    name: 'Camera RTSP',
    description: 'Entrada de vídeo via protocolo RTSP',
    category: 'input',
    icon: '📹',
    inputs: [],
    outputs: [
      {
        id: 'video_stream',
        label: 'Video Stream',
        type: 'video'
      }
    ],
    defaultConfig: {
      rtsp_url: 'rtsp://example.com/stream',
      fps: 30,
      resolution: '1920x1080',
      buffer_size: 10,
      reconnect_attempts: 3,
      timeout: 30
    }
  },
  {
    type: 'webcam_input',
    name: 'Webcam Local',
    description: 'Entrada de vídeo da webcam local',
    category: 'input',
    icon: '🎥',
    inputs: [],
    outputs: [
      {
        id: 'video_stream',
        label: 'Video Stream',
        type: 'video'
      }
    ],
    defaultConfig: {
      device_index: 0,
      fps: 30,
      resolution: '1280x720',
      auto_exposure: true
    }
  },
  {
    type: 'video_file_input',
    name: 'Arquivo de Vídeo',
    description: 'Entrada de arquivo de vídeo local',
    category: 'input',
    icon: '🎬',
    inputs: [],
    outputs: [
      {
        id: 'video_stream',
        label: 'Video Stream',
        type: 'video'
      }
    ],
    defaultConfig: {
      file_path: '',
      loop: false,
      start_frame: 0,
      end_frame: -1
    }
  },
  {
    type: 'image_input',
    name: 'Imagem',
    description: 'Entrada de imagem estática',
    category: 'input',
    icon: '🖼️',
    inputs: [],
    outputs: [
      {
        id: 'image',
        label: 'Image',
        type: 'image'
      }
    ],
    defaultConfig: {
      image_path: '',
      resize: false,
      target_size: [640, 480]
    }
  }
];

// Templates de nós de processamento
export const processingNodeTemplates: NodeTemplate[] = [
  {
    type: 'yolo_detection',
    name: 'YOLO Object Detection',
    description: 'Detecção de objetos usando YOLO',
    category: 'processing',
    icon: '🎯',
    inputs: [
      {
        id: 'video_input',
        label: 'Video Input',
        type: 'video',
        required: true
      }
    ],
    outputs: [
      {
        id: 'detections',
        label: 'Detections',
        type: 'detections'
      },
      {
        id: 'annotated_video',
        label: 'Annotated Video',
        type: 'video'
      }
    ],
    defaultConfig: {
      model_version: 'yolov8n',
      confidence_threshold: 0.5,
      iou_threshold: 0.45,
      classes: [],
      device: 'auto',
      batch_size: 1
    }
  },
  {
    type: 'face_detection',
    name: 'Face Detection',
    description: 'Detecção de faces humanas',
    category: 'processing',
    icon: '👤',
    inputs: [
      {
        id: 'video_input',
        label: 'Video Input',
        type: 'video',
        required: true
      }
    ],
    outputs: [
      {
        id: 'face_detections',
        label: 'Face Detections',
        type: 'detections'
      },
      {
        id: 'annotated_video',
        label: 'Annotated Video',
        type: 'video'
      }
    ],
    defaultConfig: {
      min_face_size: 40,
      confidence_threshold: 0.7,
      scale_factor: 1.1,
      min_neighbors: 3
    }
  },
  {
    type: 'motion_detection',
    name: 'Motion Detection',
    description: 'Detecção de movimento na imagem',
    category: 'processing',
    icon: '🏃',
    inputs: [
      {
        id: 'video_input',
        label: 'Video Input',
        type: 'video',
        required: true
      }
    ],
    outputs: [
      {
        id: 'motion_areas',
        label: 'Motion Areas',
        type: 'detections'
      },
      {
        id: 'motion_mask',
        label: 'Motion Mask',
        type: 'image'
      }
    ],
    defaultConfig: {
      threshold: 25,
      min_area: 500,
      blur_size: 21,
      background_learning_rate: 0.01
    }
  },
  {
    type: 'people_counting',
    name: 'People Counting',
    description: 'Contagem de pessoas com tracking',
    category: 'processing',
    icon: '👥',
    inputs: [
      {
        id: 'detections_input',
        label: 'Person Detections',
        type: 'detections',
        required: true
      }
    ],
    outputs: [
      {
        id: 'count_data',
        label: 'Count Data',
        type: 'analytics'
      },
      {
        id: 'tracks',
        label: 'Person Tracks',
        type: 'data'
      }
    ],
    defaultConfig: {
      counting_line: {
        x1: 0,
        y1: 240,
        x2: 640,
        y2: 240
      },
      direction: 'both',
      track_max_age: 30,
      track_min_hits: 3
    }
  }
];

// Templates de nós de análise
export const analyticsNodeTemplates: NodeTemplate[] = [
  {
    type: 'statistics',
    name: 'Statistical Analysis',
    description: 'Análise estatística dos dados',
    category: 'analytics',
    icon: '📊',
    inputs: [
      {
        id: 'data_input',
        label: 'Data Input',
        type: 'data',
        required: true
      }
    ],
    outputs: [
      {
        id: 'statistics',
        label: 'Statistics',
        type: 'analytics'
      }
    ],
    defaultConfig: {
      window_size: 100,
      metrics: ['mean', 'std', 'min', 'max', 'count'],
      update_interval: 5.0
    }
  },
  {
    type: 'heatmap',
    name: 'Heatmap Generator',
    description: 'Geração de mapa de calor',
    category: 'analytics',
    icon: '🔥',
    inputs: [
      {
        id: 'detections_input',
        label: 'Detections',
        type: 'detections',
        required: true
      }
    ],
    outputs: [
      {
        id: 'heatmap',
        label: 'Heatmap',
        type: 'image'
      },
      {
        id: 'heatmap_data',
        label: 'Heatmap Data',
        type: 'analytics'
      }
    ],
    defaultConfig: {
      resolution: [640, 480],
      blur_radius: 15,
      decay_factor: 0.99,
      colormap: 'hot'
    }
  },
  {
    type: 'event_aggregator',
    name: 'Event Aggregator',
    description: 'Agregação e filtragem de eventos',
    category: 'analytics',
    icon: '📋',
    inputs: [
      {
        id: 'events_input',
        label: 'Events',
        type: 'data',
        required: true
      }
    ],
    outputs: [
      {
        id: 'aggregated_events',
        label: 'Aggregated Events',
        type: 'analytics'
      }
    ],
    defaultConfig: {
      time_window: 60,
      aggregation_method: 'count',
      filters: [],
      group_by: []
    }
  }
];

// Templates de nós de saída
export const outputNodeTemplates: NodeTemplate[] = [
  {
    type: 'database_storage',
    name: 'Database Storage',
    description: 'Armazenamento em banco de dados',
    category: 'output',
    icon: '💾',
    inputs: [
      {
        id: 'data_input',
        label: 'Data Input',
        type: 'any',
        required: true
      }
    ],
    outputs: [],
    defaultConfig: {
      table_name: 'detections',
      batch_size: 100,
      flush_interval: 10.0,
      include_metadata: true
    }
  },
  {
    type: 'file_export',
    name: 'File Export',
    description: 'Exportação para arquivo',
    category: 'output',
    icon: '📁',
    inputs: [
      {
        id: 'data_input',
        label: 'Data Input',
        type: 'any',
        required: true
      }
    ],
    outputs: [],
    defaultConfig: {
      file_format: 'json',
      file_path: '/tmp/export.json',
      append_mode: true,
      rotation_size: '100MB'
    }
  },
  {
    type: 'alert_system',
    name: 'Alert System',
    description: 'Sistema de alertas e notificações',
    category: 'output',
    icon: '🚨',
    inputs: [
      {
        id: 'trigger_input',
        label: 'Trigger Input',
        type: 'any',
        required: true
      }
    ],
    outputs: [],
    defaultConfig: {
      alert_type: 'email',
      threshold: 1,
      cooldown_period: 300,
      message_template: 'Alert triggered: {data}'
    }
  },
  {
    type: 'webhook',
    name: 'Webhook',
    description: 'Chamada HTTP para webhook externo',
    category: 'output',
    icon: '🔗',
    inputs: [
      {
        id: 'data_input',
        label: 'Data Input',
        type: 'any',
        required: true
      }
    ],
    outputs: [],
    defaultConfig: {
      url: '',
      method: 'POST',
      headers: {},
      timeout: 30,
      retry_attempts: 3
    }
  },
  {
    type: 'live_display',
    name: 'Live Display',
    description: 'Exibição em tempo real',
    category: 'output',
    icon: '📺',
    inputs: [
      {
        id: 'video_input',
        label: 'Video Input',
        type: 'video',
        required: true
      }
    ],
    outputs: [],
    defaultConfig: {
      display_detections: true,
      show_fps: true,
      overlay_color: '#00FF00',
      font_size: 12
    }
  }
];

// Todas as templates disponíveis
export const allNodeTemplates: NodeTemplate[] = [
  ...inputNodeTemplates,
  ...processingNodeTemplates,
  ...analyticsNodeTemplates,
  ...outputNodeTemplates
];

// Função para buscar template por tipo
export const getNodeTemplate = (type: string): NodeTemplate | undefined => {
  return allNodeTemplates.find(template => template.type === type);
};

// Função para filtrar templates por categoria
export const getNodeTemplatesByCategory = (category: string): NodeTemplate[] => {
  return allNodeTemplates.filter(template => template.category === category);
};
