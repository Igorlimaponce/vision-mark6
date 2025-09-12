# AIOS v2.0 - Guia Completo de Instalação e Configuração

## 📋 Visão Geral

Este guia contém todas as instruções necessárias para configurar e executar o AIOS v2.0 (Sistema de Análise e Inteligência Operacional) em ambiente de produção ou desenvolvimento.

## 🛠 Pré-requisitos

### Sistema Operacional
- **Linux (Recomendado)**: Ubuntu 20.04+ ou CentOS 8+
- **macOS**: 10.15+ com Docker Desktop
- **Windows**: Windows 10+ com WSL2 e Docker Desktop

### Software Necessário
- **Docker**: v20.10+
- **Docker Compose**: v2.0+
- **Git**: v2.30+
- **Python**: 3.11+ (para desenvolvimento local)
- **Node.js**: 18+ (para desenvolvimento local)

### Recursos de Hardware
- **Mínimo**: 8GB RAM, 4 CPU cores, 50GB disco
- **Recomendado**: 16GB RAM, 8 CPU cores, 100GB disco
- **GPU**: NVIDIA GPU com CUDA 11.8+ (opcional, para melhor performance de IA)

---

## 🚀 Instalação Rápida (Docker)

### 1. Clonar o Repositório
```bash
git clone https://github.com/your-username/aios-v2.git
cd aios-v2
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
nano .env
```

### 3. Baixar Modelos de IA
```bash
./scripts/download_models.sh
```

### 4. Executar com Docker
```bash
docker-compose up -d
```

### 5. Verificar Status
```bash
docker-compose ps
curl http://localhost/health
```

---

## 🔧 Configuração Detalhada

### 1. Variáveis de Ambiente (.env)

Crie o arquivo `.env` na raiz do projeto com as seguintes configurações:

```bash
# ================================
# Database Configuration
# ================================
POSTGRES_DB=aios
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password_here
DATABASE_URL=postgresql://postgres:secure_password_here@db:5432/aios

# ================================
# Security
# ================================
SECRET_KEY=your_very_long_secret_key_here_min_32_chars
JWT_SECRET_KEY=another_long_secret_for_jwt_tokens

# ================================
# Redis Configuration
# ================================
REDIS_URL=redis://redis:6379/0

# ================================
# WhatsApp Business API
# ================================
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id

# ================================
# Kanban Integrations
# ================================

# Trello
TRELLO_API_KEY=your_trello_api_key
TRELLO_API_SECRET=your_trello_api_secret
TRELLO_DEFAULT_BOARD_ID=your_default_board_id

# Asana
ASANA_ACCESS_TOKEN=your_asana_access_token
ASANA_DEFAULT_WORKSPACE=your_workspace_id

# Monday.com
MONDAY_API_TOKEN=your_monday_api_token
MONDAY_DEFAULT_BOARD_ID=your_board_id

# Jira
JIRA_SERVER_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your_email@domain.com
JIRA_API_TOKEN=your_jira_api_token
JIRA_DEFAULT_PROJECT=PROJ

# ================================
# PLC Configuration
# ================================
PLC_MODBUS_TIMEOUT=5.0
PLC_S7_TIMEOUT=5.0
PLC_MONITORING_INTERVAL=1.0

# ================================
# AI Models Configuration
# ================================
YOLO_MODEL_PATH=./models/yolo/yolov8n.pt
FACE_MODEL_PATH=./models/face/
CONFIDENCE_THRESHOLD=0.6
NMS_THRESHOLD=0.45

# ================================
# Streaming Configuration
# ================================
RTSP_TIMEOUT=10.0
WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302
MAX_CONCURRENT_STREAMS=10

# ================================
# Monitoring
# ================================
GRAFANA_PASSWORD=admin_password_here
PROMETHEUS_RETENTION=30d

# ================================
# Email Configuration (Optional)
# ================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@yourdomain.com
```

### 2. Configuração de Integrações Externas

#### WhatsApp Business API

1. **Criar conta no Meta for Developers**:
   - Acesse: https://developers.facebook.com/
   - Crie um app tipo "Business"

2. **Configurar WhatsApp Business API**:
   - Adicione produto "WhatsApp Business API"
   - Configure número de telefone
   - Obtenha access token e phone number ID

3. **Configurar Webhook**:
   ```bash
   # URL do webhook
   https://yourdomain.com/api/v1/whatsapp/webhook
   
   # Verify token (definir no .env)
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token
   ```

#### Trello Integration

1. **Obter API Key**:
   - Acesse: https://trello.com/app-key
   - Copie sua API Key

2. **Gerar Token**:
   ```bash
   # Substitua YOUR_API_KEY pela sua chave
   https://trello.com/1/authorize?expiration=never&scope=read,write,account&response_type=token&name=AIOS&key=YOUR_API_KEY
   ```

3. **Obter Board ID**:
   ```bash
   curl "https://api.trello.com/1/members/me/boards?key=YOUR_API_KEY&token=YOUR_TOKEN"
   ```

#### Asana Integration

1. **Criar Personal Access Token**:
   - Acesse: https://app.asana.com/0/my-apps
   - Vá em "Personal access tokens"
   - Clique "Create new token"

2. **Obter Workspace ID**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" https://app.asana.com/api/1.0/workspaces
   ```

#### Monday.com Integration

1. **Gerar API Token**:
   - Acesse: https://your-account.monday.com/admin/integrations/api
   - Clique "Generate API Token"

2. **Obter Board ID**:
   ```bash
   curl -X POST https://api.monday.com/v2 \
     -H "Authorization: YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "query { boards { id name } }"}'
   ```

#### Jira Integration

1. **Criar API Token**:
   - Acesse: https://id.atlassian.com/manage-profile/security/api-tokens
   - Clique "Create API token"

2. **Testar conexão**:
   ```bash
   curl -u your_email@domain.com:your_api_token \
     https://your-domain.atlassian.net/rest/api/3/myself
   ```

### 3. Download e Configuração de Modelos de IA

Crie o script para download dos modelos:

```bash
#!/bin/bash
# scripts/download_models.sh

echo "🤖 Downloading AI Models for AIOS v2.0..."

# Create models directory
mkdir -p models/{yolo,face,tracking}

# Download YOLO models
echo "📥 Downloading YOLO models..."
cd models/yolo

# YOLOv8 Nano (fastest)
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt

# YOLOv8 Small (balanced)
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8s.pt

# YOLOv8 Medium (accurate)
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8m.pt

cd ../..

# Download face detection models
echo "👤 Downloading face detection models..."
cd models/face

# MTCNN models (will be downloaded automatically by library)
python3 -c "
import mtcnn
detector = mtcnn.MTCNN()
print('MTCNN models downloaded successfully')
"

cd ../..

# Create classes file
echo "📝 Creating classes configuration..."
cat > models/classes.txt << EOF
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

# Create model configuration
cat > models/config.json << EOF
{
  "yolo": {
    "model_path": "./models/yolo/yolov8n.pt",
    "confidence_threshold": 0.6,
    "nms_threshold": 0.45,
    "classes": "./models/classes.txt"
  },
  "face_detection": {
    "model_type": "mtcnn",
    "min_face_size": 40,
    "thresholds": [0.6, 0.7, 0.7],
    "factor": 0.709
  },
  "tracking": {
    "max_disappeared": 50,
    "max_distance": 100
  }
}
EOF

echo "✅ AI Models downloaded and configured successfully!"
echo "📊 Model sizes:"
du -sh models/*/
```

Torne o script executável:
```bash
chmod +x scripts/download_models.sh
./scripts/download_models.sh
```

### 4. Configuração de Banco de Dados

Crie o script de inicialização do banco:

```sql
-- backend/init.sql
-- AIOS v2.0 Database Initialization

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create initial admin user (será sobrescrito pelo Alembic)
-- Esta tabela é apenas para garantir que o banco inicialize corretamente
CREATE TABLE IF NOT EXISTS system_info (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL DEFAULT '2.0.0',
    initialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_info (version) VALUES ('2.0.0') ON CONFLICT DO NOTHING;

-- Create indexes for performance
-- (As tabelas reais serão criadas pelo Alembic)
```

### 5. Configuração de Monitoring

Crie as configurações do Prometheus:

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'aios-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    
  - job_name: 'aios-frontend'
    static_configs:
      - targets: ['frontend:3000']
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['db:5432']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

---

## 🐳 Comandos Docker Essenciais

### Desenvolvimento
```bash
# Executar em modo desenvolvimento
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Ver logs em tempo real
docker-compose logs -f backend frontend

# Executar comandos no backend
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser

# Acessar banco de dados
docker-compose exec db psql -U postgres -d aios
```

### Produção
```bash
# Build e deploy
docker-compose build --no-cache
docker-compose up -d

# Verificar saúde dos serviços
docker-compose ps
docker-compose exec backend curl http://localhost:8000/health
docker-compose exec frontend curl http://localhost:3000/health

# Backup do banco
docker-compose exec db pg_dump -U postgres aios > backup_$(date +%Y%m%d_%H%M%S).sql

# Logs de produção
docker-compose logs --tail=100 -f
```

### Manutenção
```bash
# Limpar containers parados
docker system prune -f

# Atualizar apenas um serviço
docker-compose up -d --no-deps backend

# Reiniciar serviços específicos
docker-compose restart nginx redis

# Monitorar recursos
docker stats
```

---

## 🔍 Verificação de Instalação

### 1. Teste de Conectividade
```bash
# Frontend
curl http://localhost:3000/health
# Resposta esperada: healthy

# Backend
curl http://localhost:8000/health
# Resposta esperada: {"status": "healthy"}

# API de integração
curl http://localhost:8000/api/v1/integration/status
# Resposta esperada: JSON com status dos serviços
```

### 2. Teste de Funcionalidades
```bash
# Teste de detecção de IA
curl -X POST http://localhost:8000/api/v1/integration/detection/emit \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": "CAM_001",
    "class_name": "person",
    "confidence": 0.89,
    "bbox": [100, 150, 200, 300]
  }'

# Teste de evento AIOS
curl -X POST http://localhost:8000/api/v1/integration/events/emit \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "intrusion_detected",
    "source": "CAM_001", 
    "severity": "high",
    "data": {"test": true}
  }'

# Verificar histórico de eventos
curl http://localhost:8000/api/v1/integration/events/history?limit=10
```

### 3. Teste de Integrações
```bash
# Teste PLC
curl http://localhost:8000/api/v1/integration/plc/status

# Teste WhatsApp (configurar .env primeiro)
curl -X POST http://localhost:8000/api/v1/integration/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5511999999999",
    "template_name": "security_alert",
    "parameters": {"location": "Test Location"}
  }'

# Teste Kanban
curl -X POST http://localhost:8000/api/v1/integration/kanban/task/create \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "trello",
    "title": "Test Task",
    "priority": "medium"
  }'
```

---

## 🎯 Acesso às Interfaces

### Principais
- **Frontend AIOS**: http://localhost:3000
- **API Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Monitoramento
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin_password_here)

### Desenvolvimento
- **PostgreSQL**: localhost:5432 (postgres/secure_password_here)
- **Redis**: localhost:6379

---

## 🚨 Solução de Problemas

### Problemas Comuns

**1. Container não inicia**
```bash
# Verificar logs
docker-compose logs backend

# Verificar recursos
docker system df
free -h

# Recriar containers
docker-compose down -v
docker-compose up -d
```

**2. Erro de banco de dados**
```bash
# Verificar conexão
docker-compose exec db pg_isready -U postgres

# Recriar banco
docker-compose down -v
docker volume rm aios_postgres_data
docker-compose up -d
```

**3. Modelos de IA não carregam**
```bash
# Verificar modelos
ls -la models/yolo/
ls -la models/face/

# Re-download
rm -rf models/
./scripts/download_models.sh
```

**4. Integrações externas falham**
```bash
# Verificar variáveis
docker-compose exec backend env | grep -E "(WHATSAPP|TRELLO|ASANA)"

# Testar conectividade
docker-compose exec backend curl -I https://api.whatsapp.com
docker-compose exec backend curl -I https://api.trello.com
```

### Logs Importantes
```bash
# Backend detalhado
docker-compose logs -f backend | grep -E "(ERROR|WARNING|Integration|PLC|WhatsApp)"

# Nginx access logs
docker-compose logs nginx | tail -100

# PostgreSQL logs
docker-compose logs db | grep -E "(ERROR|FATAL)"
```

---

## 🔒 Segurança em Produção

### 1. SSL/HTTPS
```bash
# Gerar certificado Let's Encrypt (recomendado)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com

# Copiar certificados
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem

# Descomentar configuração HTTPS no nginx.conf
```

### 2. Firewall
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Bloquear acesso direto às portas dos serviços
sudo ufw deny 5432/tcp  # PostgreSQL
sudo ufw deny 6379/tcp  # Redis
sudo ufw deny 9090/tcp  # Prometheus
```

### 3. Secrets Management
```bash
# Usar Docker Secrets em produção
echo "secure_password" | docker secret create postgres_password -
echo "jwt_secret_key" | docker secret create jwt_secret -

# Atualizar docker-compose.yml para usar secrets
```

---

## 📈 Performance e Escalabilidade

### 1. Configuração de Hardware
```yaml
# Para produção com alta carga
deploy:
  resources:
    reservations:
      memory: 4G
      cpus: '2.0'
    limits:
      memory: 8G
      cpus: '4.0'
```

### 2. Otimizações
```bash
# PostgreSQL
echo "shared_preload_libraries = 'pg_stat_statements'" >> postgresql.conf
echo "max_connections = 200" >> postgresql.conf
echo "shared_buffers = 256MB" >> postgresql.conf

# Redis
echo "maxmemory 1gb" >> redis.conf
echo "maxmemory-policy allkeys-lru" >> redis.conf
```

### 3. Monitoramento
```bash
# Métricas em tempo real
curl http://localhost:8000/api/v1/integration/metrics

# Logs estruturados
docker-compose logs --tail=100 -f | jq '.'
```

---

## 🎉 Pronto para Produção!

Após seguir todos os passos deste guia, você terá:

✅ **Sistema AIOS v2.0 totalmente funcional**  
✅ **Todas as integrações configuradas**  
✅ **Monitoramento completo ativo**  
✅ **Ambiente seguro e otimizado**  
✅ **Backup e recuperação configurados**  

### Próximos Passos
1. **Configurar câmeras RTSP** no sistema
2. **Definir ROIs** nas áreas de interesse
3. **Calibrar modelos de IA** para seu ambiente
4. **Configurar alertas** personalizados
5. **Treinar equipe** no uso da plataforma

### Suporte
- **Documentação**: `/docs` no sistema
- **API Reference**: `http://localhost:8000/docs`
- **Logs**: `docker-compose logs`
- **Health Check**: `http://localhost/health`

**🚀 AIOS v2.0 está pronto para transformar sua segurança e operações!**
