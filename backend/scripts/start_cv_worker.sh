#!/bin/bash

# Script para iniciar o worker Celery para pipelines CV

# Definir diretório base
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# Ativar ambiente virtual se existir
if [ -d "$BASE_DIR/venv" ]; then
    source "$BASE_DIR/venv/bin/activate"
    echo "✅ Ambiente virtual ativado"
fi

# Configurar PYTHONPATH
export PYTHONPATH="$BASE_DIR:$PYTHONPATH"

# Configurar variáveis de ambiente
export CELERY_BROKER_URL="redis://localhost:6379/0"
export CELERY_RESULT_BACKEND="redis://localhost:6379/0"

echo "🚀 Iniciando CV Pipeline Worker..."
echo "📁 Diretório base: $BASE_DIR"
echo "🔗 Broker: $CELERY_BROKER_URL"

cd "$BASE_DIR"

# Iniciar worker com configurações otimizadas para CV
celery -A app.workers.cv_pipeline_worker worker \
    --loglevel=info \
    --concurrency=2 \
    --pool=threads \
    --queues=cv_pipeline \
    --hostname=cv-worker@%h \
    --max-tasks-per-child=50 \
    --time-limit=1800 \
    --soft-time-limit=1700

echo "👋 CV Pipeline Worker finalizado"
