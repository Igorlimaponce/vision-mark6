# AIOS Backend - Sistema de Análise e Inteligência Operacional v2.0

Backend robusto e escalável para a plataforma AIOS, construído com FastAPI, PostgreSQL/TimescaleDB, Redis e Celery.

## 🏗️ Arquitetura

### Stack Tecnológica

- **Framework:** FastAPI + Uvicorn (API REST e WebSockets)
- **Banco de Dados:** PostgreSQL + TimescaleDB (séries temporais)
- **Cache/Message Broker:** Redis
- **Task Queue:** Celery + Celery Beat
- **Visão Computacional:** OpenCV + PyTorch + YOLOv8
- **ORM:** SQLAlchemy + Alembic
- **Validação:** Pydantic
- **Autenticação:** JWT + bcrypt

### Componentes Principais

```
backend/
├── app/
│   ├── api/v1/endpoints/     # Routers FastAPI
│   ├── api/ws/              # WebSocket manager
│   ├── core/                # Configurações e segurança
│   ├── crud/                # Operações de banco de dados
│   ├── db/models/           # Modelos SQLAlchemy
│   ├── schemas/             # Schemas Pydantic
│   ├── services/            # Lógica de negócio
│   ├── workers/             # Tasks Celery
│   └── vision/              # Módulos de CV
├── docker-compose.yml       # Orquestração dos serviços
└── requirements.txt         # Dependências Python
```

## 🚀 Início Rápido

### Pré-requisitos

- Python 3.11+
- Docker & Docker Compose
- Git

### Configuração com Docker (Recomendado)

1. **Clone e configure o ambiente:**
```bash
cd backend
cp .env.example .env
# Edite o arquivo .env conforme necessário
```

2. **Inicie todos os serviços:**
```bash
docker-compose up -d
```

3. **Verifique os serviços:**
```bash
# Backend API
curl http://localhost:8000/health

# Documentação
open http://localhost:8000/docs

# Monitoramento Celery
open http://localhost:5555
```

### Configuração Manual (Desenvolvimento)

1. **Crie ambiente virtual:**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
```

2. **Instale dependências:**
```bash
pip install -r requirements.txt
```

3. **Configure banco de dados:**
```bash
# Inicie PostgreSQL e Redis
docker-compose up -d postgres redis

# Execute migrações
alembic upgrade head
```

4. **Inicie o servidor:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. **Inicie workers Celery (terminal separado):**
```bash
celery -A app.workers.tasks worker --loglevel=info
```

## 📊 Banco de Dados

### Schema Principal

- **organizations** - Multi-tenancy
- **users** - Autenticação e autorização
- **devices** - Fleet Management
- **pipelines/pipeline_nodes/pipeline_edges** - Pipeline Builder
- **events** (Hypertable) - Eventos de alto nível
- **detections** (Hypertable) - Detecções de objetos

### TimescaleDB

As tabelas `events` e `detections` são configuradas como hypertables para otimização de séries temporais:

```sql
-- Políticas de retenção automáticas
SELECT add_retention_policy('detections', INTERVAL '30 days');
SELECT add_retention_policy('events', INTERVAL '1 year');
```

## 🔌 API Endpoints

### Autenticação
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Registro
- `GET /api/v1/auth/me` - Usuário atual

### Fleet Management
- `GET /api/v1/fleet/` - Lista dispositivos
- `POST /api/v1/fleet/` - Criar dispositivo
- `PUT /api/v1/fleet/{id}/status` - Atualizar status
- `GET /api/v1/fleet/summary` - Resumo da frota

### Pipelines
- `GET /api/v1/pipelines/` - Lista pipelines
- `POST /api/v1/pipelines/` - Criar pipeline
- `POST /api/v1/pipelines/{id}/execute` - Executar pipeline

### Dashboard
- `GET /api/v1/dashboard/analytics` - Analytics
- `GET /api/v1/dashboard/events` - Eventos
- `GET /api/v1/dashboard/detections` - Detecções

### WebSocket
- `ws://localhost:8000/api/v1/ws?token=JWT_TOKEN` - Real-time updates

## ⚡ WebSocket Events

O sistema envia atualizações em tempo real via WebSocket:

```json
{
  "type": "device_status_update",
  "device_id": "uuid",
  "status": "ON|OFF|WARNING",
  "timestamp": 1234567890
}

{
  "type": "new_event",
  "event": {
    "id": "uuid",
    "event_type": "intrusion_detected",
    "severity": "critical"
  }
}

{
  "type": "pipeline_status_update",
  "pipeline_id": "uuid",
  "status": "active|inactive|error"
}
```

## 🔧 Configuração de Ambiente

### Variáveis Principais (.env)

```env
# Database
POSTGRES_SERVER=localhost
POSTGRES_USER=aios
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=aios_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
SECRET_KEY=your-super-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Computer Vision
YOLO_MODEL_PATH=./models/yolov8n.pt
DETECTION_CONFIDENCE_THRESHOLD=0.5
```

## 🔄 Tasks Celery

### Tasks Principais

- **process_video_stream** - Processamento de vídeo
- **run_pipeline** - Execução de pipeline
- **cleanup_old_data** - Limpeza de dados antigos
- **check_device_health** - Verificação de saúde dos dispositivos
- **send_notification** - Envio de notificações

### Tasks Periódicas

```python
# Configuradas no celery_app.py
celery_app.conf.beat_schedule = {
    "cleanup-old-detections": {
        "task": "app.workers.tasks.cleanup_old_data",
        "schedule": 86400.0,  # Diário
    },
    "check-device-health": {
        "task": "app.workers.tasks.check_device_health", 
        "schedule": 300.0,  # A cada 5 minutos
    }
}
```

## 🧪 Testes

```bash
# Executar testes
pytest

# Com coverage
pytest --cov=app tests/

# Testes específicos
pytest tests/test_fleet.py -v
```

## 📈 Monitoramento

### Health Checks

```bash
# API Health
curl http://localhost:8000/health

# Database
curl http://localhost:8000/api/v1/fleet/summary

# Redis
redis-cli ping

# Celery (via Flower)
open http://localhost:5555
```

### Logs

```bash
# Application logs
docker-compose logs -f backend

# Celery logs
docker-compose logs -f celery_worker

# Database logs
docker-compose logs -f postgres
```

## 🔒 Segurança

- JWT tokens com expiração configurável
- Hashing de senhas com bcrypt
- CORS configurado
- Rate limiting via Nginx
- Validação rigorosa com Pydantic
- Isolamento multi-tenant por organização

## 🚢 Deploy em Produção

### Docker Swarm

```bash
# Inicializar swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml aios
```

### Kubernetes

```bash
# Aplicar manifests
kubectl apply -f k8s/

# Verificar pods
kubectl get pods -n aios
```

### Considerações de Produção

1. **Variáveis de ambiente**: Use secrets management
2. **SSL/TLS**: Configure certificados
3. **Backup**: Automatize backup do PostgreSQL
4. **Escalabilidade**: Configure auto-scaling para workers
5. **Monitoramento**: Integre com Prometheus/Grafana

## 🔍 Troubleshooting

### Problemas Comuns

**Database connection error:**
```bash
# Verifique se PostgreSQL está rodando
docker-compose ps postgres

# Verifique logs
docker-compose logs postgres
```

**Celery workers não processando:**
```bash
# Verifique Redis
redis-cli ping

# Reinicie workers
docker-compose restart celery_worker
```

**High memory usage:**
```bash
# Monitore recursos
docker stats

# Ajuste concorrência Celery
# Edite CELERY_WORKER_CONCURRENCY no .env
```

## 📚 Documentação Adicional

- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Flower (Celery)**: http://localhost:5555
- **Arquitetura Detalhada**: [Link para documentação completa]

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença MIT. Veja [LICENSE](LICENSE) para detalhes.
