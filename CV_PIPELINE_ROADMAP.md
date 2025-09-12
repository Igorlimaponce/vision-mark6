# 🎯 ROADMAP: Implementação dos Nós de Pipeline de Visão Computacional

## 📋 Planejamento Detalhado

### FASE 1: Pipeline Builder Interface (1-2 dias)
```
🎨 Interface Visual para Criação de Pipelines
├── Drag & Drop Canvas
├── Biblioteca de Nós Disponíveis
├── Configuração de Propriedades
├── Preview em Tempo Real
└── Salvamento/Carregamento de Configurações
```

**Componentes a Criar:**
- `PipelineBuilder.tsx` - Canvas principal
- `NodeLibrary.tsx` - Biblioteca de nós
- `NodeEditor.tsx` - Editor de propriedades
- `PipelinePreview.tsx` - Preview do resultado

### FASE 2: Nós de Entrada (Input Nodes) (1 dia)
```
📹 Nós de Fonte de Dados
├── Camera Input Node (RTSP)
├── Video File Input Node
├── Image Input Node
└── Webcam Input Node
```

**Funcionalidades:**
- Configuração de streams RTSP
- Upload de arquivos de vídeo/imagem
- Seleção de câmeras locais
- Validação de formatos

### FASE 3: Nós de Processamento CV (3-4 dias)
```
🔍 Nós de Visão Computacional
├── Object Detection Node (YOLO)
├── Face Detection Node
├── People Counting Node
├── Motion Detection Node
├── Line Crossing Node
├── Area Intrusion Node
├── Speed Estimation Node
└── Custom Model Node
```

**Implementação por Nó:**
- Configuração de parâmetros
- Threshold de confiança
- ROI (Region of Interest)
- Output estruturado

### FASE 4: Nós de Análise (Analytics Nodes) (2 dias)
```
📊 Nós de Análise e Processamento
├── Statistical Analysis Node
├── Heatmap Generation Node
├── Track Filtering Node
├── Event Aggregation Node
├── Data Export Node
└── Alert Generation Node
```

### FASE 5: Nós de Saída (Output Nodes) (1-2 dias)
```
📤 Nós de Saída e Ação
├── Database Storage Node
├── File Export Node
├── Email Alert Node
├── Webhook Node
├── Live Stream Output Node
└── Dashboard Widget Node
```

### FASE 6: Sistema de Execução (2-3 dias)
```
⚡ Engine de Execução de Pipelines
├── Pipeline Scheduler
├── Worker Pool Management
├── Resource Monitoring
├── Error Handling
├── Performance Metrics
└── Auto-scaling
```

---

## 🛠️ Implementação Técnica

### Estrutura de Arquivos Backend
```
backend/
├── app/
│   ├── cv/
│   │   ├── nodes/
│   │   │   ├── input/
│   │   │   │   ├── camera_input.py
│   │   │   │   ├── file_input.py
│   │   │   │   └── webcam_input.py
│   │   │   ├── processing/
│   │   │   │   ├── object_detection.py
│   │   │   │   ├── face_detection.py
│   │   │   │   ├── motion_detection.py
│   │   │   │   └── people_counting.py
│   │   │   ├── analytics/
│   │   │   │   ├── statistical.py
│   │   │   │   ├── heatmap.py
│   │   │   │   └── tracking.py
│   │   │   └── output/
│   │   │       ├── database_storage.py
│   │   │       ├── file_export.py
│   │   │       └── alert_system.py
│   │   ├── pipeline/
│   │   │   ├── executor.py
│   │   │   ├── scheduler.py
│   │   │   └── validator.py
│   │   └── models/
│   │       ├── yolo_v8.py
│   │       ├── face_net.py
│   │       └── custom_models.py
│   └── tasks/
│       ├── cv_tasks.py
│       └── pipeline_tasks.py
```

### Estrutura de Arquivos Frontend
```
frontend/src/
├── components/
│   ├── pipeline/
│   │   ├── PipelineBuilder.tsx
│   │   ├── NodeLibrary.tsx
│   │   ├── NodeEditor.tsx
│   │   ├── PipelineCanvas.tsx
│   │   └── nodes/
│   │       ├── InputNodes.tsx
│   │       ├── ProcessingNodes.tsx
│   │       ├── AnalyticsNodes.tsx
│   │       └── OutputNodes.tsx
│   └── cv/
│       ├── VideoPlayer.tsx
│       ├── DetectionOverlay.tsx
│       ├── ROISelector.tsx
│       └── ModelConfig.tsx
├── hooks/
│   ├── usePipelineBuilder.ts
│   ├── useVideoStream.ts
│   └── useModelConfig.ts
└── services/
    ├── pipelineApi.ts
    ├── cvApi.ts
    └── streamingApi.ts
```

---

## 🎮 Exemplos de Nós

### Nó de Detecção de Objetos (YOLO)
```python
class ObjectDetectionNode(BaseNode):
    def __init__(self, config):
        self.model = YOLO('yolov8n.pt')
        self.confidence = config.get('confidence', 0.5)
        self.classes = config.get('classes', None)
    
    def process(self, frame):
        results = self.model(frame, conf=self.confidence)
        detections = []
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                detection = {
                    'class': int(box.cls),
                    'confidence': float(box.conf),
                    'bbox': box.xyxy.tolist(),
                    'label': self.model.names[int(box.cls)]
                }
                detections.append(detection)
        
        return {
            'frame': frame,
            'detections': detections,
            'metadata': {
                'timestamp': datetime.now(),
                'total_objects': len(detections)
            }
        }
```

### Nó de Contagem de Pessoas
```python
class PeopleCountingNode(BaseNode):
    def __init__(self, config):
        self.detector = ObjectDetectionNode(config)
        self.tracker = DeepSort()
        self.line_position = config.get('line_position')
        self.count = 0
    
    def process(self, frame):
        detections = self.detector.process(frame)
        
        # Filtrar apenas pessoas (classe 0 no COCO)
        people = [d for d in detections['detections'] 
                 if d['label'] == 'person']
        
        # Aplicar tracking
        tracks = self.tracker.update(people, frame)
        
        # Contar cruzamentos de linha
        for track in tracks:
            if self.crossed_line(track):
                self.count += 1
        
        return {
            'frame': frame,
            'people_count': len(people),
            'total_crossings': self.count,
            'tracks': tracks
        }
```

---

## 📊 Sistema de Configuração

### Schema de Nó
```json
{
  "id": "node_123",
  "type": "object_detection",
  "name": "YOLO Object Detector",
  "position": {"x": 100, "y": 200},
  "config": {
    "model": "yolov8n",
    "confidence": 0.5,
    "classes": ["person", "car", "truck"],
    "roi": {
      "x": 0, "y": 0, "width": 640, "height": 480
    }
  },
  "inputs": ["video_stream"],
  "outputs": ["detections", "annotated_frame"]
}
```

### Pipeline Configuration
```json
{
  "id": "pipeline_456",
  "name": "Parking Lot Monitor",
  "nodes": [...],
  "connections": [
    {"from": "camera_1", "to": "yolo_detector"},
    {"from": "yolo_detector", "to": "people_counter"},
    {"from": "people_counter", "to": "database_storage"}
  ],
  "settings": {
    "fps": 30,
    "resolution": "1920x1080",
    "buffer_size": 10
  }
}
```

---

## 🚀 Primeira Implementação

**Vamos começar pelo Pipeline Builder Interface!**

1. **PipelineBuilder Component** - Canvas drag & drop
2. **Nó básico de Input Camera** - RTSP stream
3. **Nó básico de Object Detection** - YOLO simples
4. **Nó básico de Output** - Display results

Isso criará um pipeline funcional básico que pode ser expandido gradualmente.

**Preparado para começar a implementação? 🎯**
