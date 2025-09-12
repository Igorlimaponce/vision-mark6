#!/bin/bash
# AIOS v2.0 - AI Models Download Script

set -e  # Exit on any error

echo "🤖 AIOS v2.0 - Downloading AI Models..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create models directory structure
echo -e "${BLUE}📁 Creating models directory structure...${NC}"
mkdir -p models/{yolo,face,tracking,config}

# Function to download with progress
download_with_progress() {
    local url=$1
    local output=$2
    local description=$3
    
    echo -e "${YELLOW}📥 Downloading $description...${NC}"
    
    if command -v wget &> /dev/null; then
        wget --progress=bar:force:noscroll -O "$output" "$url"
    elif command -v curl &> /dev/null; then
        curl -L --progress-bar -o "$output" "$url"
    else
        echo -e "${RED}❌ Error: Neither wget nor curl is installed${NC}"
        exit 1
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Downloaded $description successfully${NC}"
    else
        echo -e "${RED}❌ Failed to download $description${NC}"
        exit 1
    fi
}

# Download YOLO models
echo -e "${BLUE}🎯 Downloading YOLO models...${NC}"
cd models/yolo

# YOLOv8 Nano (fastest, smallest)
download_with_progress \
    "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt" \
    "yolov8n.pt" \
    "YOLOv8 Nano model"

# YOLOv8 Small (balanced performance/accuracy)
download_with_progress \
    "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8s.pt" \
    "yolov8s.pt" \
    "YOLOv8 Small model"

# YOLOv8 Medium (more accurate, slower)
download_with_progress \
    "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8m.pt" \
    "yolov8m.pt" \
    "YOLOv8 Medium model"

cd ../..

# Setup face detection models
echo -e "${BLUE}👤 Setting up face detection models...${NC}"
cd models/face

# Create directory for MTCNN models (will be downloaded automatically by the library)
mkdir -p mtcnn_models

# Test MTCNN download
echo -e "${YELLOW}🧪 Testing MTCNN models download...${NC}"
python3 -c "
try:
    import mtcnn
    detector = mtcnn.MTCNN()
    print('${GREEN}✅ MTCNN models downloaded successfully${NC}')
except ImportError:
    print('${YELLOW}⚠️  MTCNN not installed - will be handled by Docker${NC}')
except Exception as e:
    print(f'${YELLOW}⚠️  MTCNN setup will be completed during first run: {e}${NC}')
" 2>/dev/null || echo -e "${YELLOW}⚠️  Python/MTCNN not available locally - will be handled by Docker${NC}"

cd ../..

# Create COCO classes file
echo -e "${BLUE}📝 Creating COCO classes configuration...${NC}"
cat > models/config/classes.txt << 'EOF'
person
bicycle
car
motorcycle
airplane
bus
train
truck
boat
traffic light
fire hydrant
stop sign
parking meter
bench
bird
cat
dog
horse
sheep
cow
elephant
bear
zebra
giraffe
backpack
umbrella
handbag
tie
suitcase
frisbee
skis
snowboard
sports ball
kite
baseball bat
baseball glove
skateboard
surfboard
tennis racket
bottle
wine glass
cup
fork
knife
spoon
bowl
banana
apple
sandwich
orange
broccoli
carrot
hot dog
pizza
donut
cake
chair
couch
potted plant
bed
dining table
toilet
tv
laptop
mouse
remote
keyboard
cell phone
microwave
oven
toaster
sink
refrigerator
book
clock
vase
scissors
teddy bear
hair drier
toothbrush
EOF

# Create model configuration file
echo -e "${BLUE}⚙️  Creating model configuration...${NC}"
cat > models/config/models_config.json << 'EOF'
{
  "version": "2.0.0",
  "models": {
    "yolo": {
      "default_model": "yolov8n.pt",
      "available_models": {
        "nano": {
          "file": "yolov8n.pt",
          "size": "~6MB",
          "speed": "fastest",
          "accuracy": "good",
          "recommended_use": "real-time detection, edge devices"
        },
        "small": {
          "file": "yolov8s.pt", 
          "size": "~22MB",
          "speed": "fast",
          "accuracy": "better",
          "recommended_use": "balanced performance"
        },
        "medium": {
          "file": "yolov8m.pt",
          "size": "~52MB", 
          "speed": "medium",
          "accuracy": "high",
          "recommended_use": "high accuracy requirements"
        }
      },
      "configuration": {
        "confidence_threshold": 0.6,
        "nms_threshold": 0.45,
        "max_detections": 100,
        "input_size": 640,
        "classes_file": "./models/config/classes.txt"
      }
    },
    "face_detection": {
      "default_model": "mtcnn",
      "models": {
        "mtcnn": {
          "type": "tensorflow",
          "min_face_size": 40,
          "thresholds": [0.6, 0.7, 0.7],
          "factor": 0.709,
          "post_process": true
        },
        "opencv_dnn": {
          "type": "opencv",
          "confidence_threshold": 0.7,
          "model_file": "opencv_face_detector_uint8.pb",
          "config_file": "opencv_face_detector.pbtxt"
        }
      }
    },
    "object_tracking": {
      "algorithm": "centroid",
      "parameters": {
        "max_disappeared": 50,
        "max_distance": 100,
        "tracking_confidence": 0.7
      }
    }
  },
  "performance": {
    "device": "auto",
    "batch_size": 1,
    "half_precision": false,
    "multi_threading": true,
    "max_workers": 4
  },
  "output": {
    "save_detections": true,
    "detection_format": "json",
    "image_output": false,
    "video_output": false
  }
}
EOF

# Create security classes mapping
echo -e "${BLUE}🔒 Creating security-specific classes mapping...${NC}"
cat > models/config/security_classes.json << 'EOF'
{
  "security_relevant_classes": {
    "high_priority": [
      "person"
    ],
    "medium_priority": [
      "car",
      "motorcycle", 
      "bicycle",
      "truck",
      "bus"
    ],
    "monitoring": [
      "backpack",
      "handbag",
      "suitcase",
      "bottle",
      "laptop"
    ]
  },
  "alert_thresholds": {
    "person": {
      "confidence": 0.7,
      "size_threshold": 0.1,
      "duration_threshold": 3.0
    },
    "vehicle": {
      "confidence": 0.6,
      "size_threshold": 0.2,
      "duration_threshold": 5.0
    }
  },
  "roi_behaviors": {
    "restricted_area": {
      "alert_on": ["person", "car", "motorcycle"],
      "ignore_classes": ["bird", "cat", "dog"]
    },
    "parking_area": {
      "alert_on": ["person"],
      "monitor_classes": ["car", "truck", "motorcycle"]
    },
    "entrance": {
      "alert_on": ["person"],
      "track_objects": true,
      "count_objects": true
    }
  }
}
EOF

# Create README for models directory
echo -e "${BLUE}📚 Creating models documentation...${NC}"
cat > models/README.md << 'EOF'
# AIOS v2.0 - AI Models Directory

This directory contains all AI models and configurations for the AIOS system.

## Directory Structure

```
models/
├── yolo/                    # YOLO object detection models
│   ├── yolov8n.pt          # Nano model (fastest)
│   ├── yolov8s.pt          # Small model (balanced)
│   └── yolov8m.pt          # Medium model (most accurate)
├── face/                    # Face detection models
│   └── mtcnn_models/       # MTCNN model files (auto-downloaded)
├── tracking/               # Object tracking configurations
├── config/                 # Configuration files
│   ├── classes.txt         # COCO class names
│   ├── models_config.json  # Model configurations
│   └── security_classes.json # Security-specific mappings
└── README.md              # This file
```

## Model Selection Guide

### YOLO Models
- **Nano (yolov8n.pt)**: Best for real-time applications, edge devices
- **Small (yolov8s.pt)**: Balanced performance and accuracy
- **Medium (yolov8m.pt)**: Highest accuracy, requires more resources

### Face Detection
- **MTCNN**: Multi-task CNN for face detection and alignment
- **OpenCV DNN**: Faster but less accurate alternative

## Usage

The models are automatically loaded by the AIOS backend based on the configuration in `models_config.json`. You can modify the default model and parameters as needed.

## Performance Tips

1. Use Nano model for multiple concurrent streams
2. Use Medium model for critical security areas requiring high accuracy
3. Enable GPU acceleration if available (CUDA)
4. Adjust confidence thresholds based on your environment

## Updating Models

To update to newer model versions:
1. Download new model files to the appropriate directories
2. Update the configuration in `models_config.json`
3. Restart the AIOS backend service
EOF

# Display summary
echo -e "${GREEN}=================================================="
echo -e "🎉 AI Models Download Complete!"
echo -e "==================================================${NC}"

echo -e "${BLUE}📊 Downloaded Models Summary:${NC}"
echo "YOLO Models:"
ls -lh models/yolo/*.pt 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'

echo ""
echo -e "${BLUE}📁 Directory Structure:${NC}"
find models -type f -name "*.json" -o -name "*.txt" -o -name "*.pt" | head -10 | sed 's/^/  /'

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Copy .env.example to .env and configure your settings"
echo "2. Run: docker-compose up -d"
echo "3. Access AIOS at: http://localhost:3000"

echo ""
echo -e "${BLUE}Model Configuration:${NC}"
echo "- Default YOLO model: YOLOv8 Nano (fastest)"
echo "- Face detection: MTCNN (high accuracy)"
echo "- Object tracking: Centroid algorithm"
echo "- Classes: 80 COCO classes supported"

echo ""
echo -e "${GREEN}🚀 AIOS v2.0 is ready to deploy!${NC}"
