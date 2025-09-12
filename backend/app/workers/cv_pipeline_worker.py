"""
Workers Celery para processamento de pipelines CV.
"""

import asyncio
import logging
from typing import Dict, Any
from celery import Celery
from celery.signals import worker_ready, worker_shutdown

from app.core.config import settings
from app.cv.pipeline import pipeline_manager

logger = logging.getLogger(__name__)

# Configurar Celery
celery_app = Celery(
    "cv_pipeline_worker",
    broker=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    backend=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
)

# Configurações do Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,  # 1 hora
)


@worker_ready.connect
def worker_ready_handler(sender=None, **kwargs):
    """Executado quando o worker está pronto."""
    logger.info("CV Pipeline Worker iniciado e pronto para processar tarefas")


@worker_shutdown.connect  
def worker_shutdown_handler(sender=None, **kwargs):
    """Executado quando o worker está sendo desligado."""
    logger.info("Desligando CV Pipeline Worker...")
    
    # Limpar todos os pipelines em execução
    try:
        pipeline_manager.cleanup_all()
        logger.info("Pipelines limpos com sucesso")
    except Exception as e:
        logger.error(f"Erro ao limpar pipelines: {str(e)}")


@celery_app.task(bind=True, name="pipeline.create")
def create_pipeline_task(self, pipeline_id: str, pipeline_config: Dict[str, Any]):
    """Cria um pipeline para execução."""
    try:
        logger.info(f"Criando pipeline {pipeline_id}")
        
        success = pipeline_manager.create_pipeline(pipeline_id, pipeline_config)
        
        if success:
            logger.info(f"Pipeline {pipeline_id} criado com sucesso")
            return {"success": True, "pipeline_id": pipeline_id}
        else:
            error_msg = f"Falha ao criar pipeline {pipeline_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
            
    except Exception as e:
        error_msg = f"Erro ao criar pipeline {pipeline_id}: {str(e)}"
        logger.error(error_msg)
        self.retry(countdown=60, max_retries=3)
        return {"success": False, "error": error_msg}


@celery_app.task(bind=True, name="pipeline.start")
def start_pipeline_task(self, pipeline_id: str):
    """Inicia a execução de um pipeline."""
    try:
        logger.info(f"Iniciando pipeline {pipeline_id}")
        
        success = pipeline_manager.start_pipeline(pipeline_id)
        
        if success:
            logger.info(f"Pipeline {pipeline_id} iniciado com sucesso")
            return {"success": True, "pipeline_id": pipeline_id}
        else:
            error_msg = f"Falha ao iniciar pipeline {pipeline_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
            
    except Exception as e:
        error_msg = f"Erro ao iniciar pipeline {pipeline_id}: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}


@celery_app.task(bind=True, name="pipeline.stop")
def stop_pipeline_task(self, pipeline_id: str):
    """Para a execução de um pipeline."""
    try:
        logger.info(f"Parando pipeline {pipeline_id}")
        
        success = pipeline_manager.stop_pipeline(pipeline_id)
        
        if success:
            logger.info(f"Pipeline {pipeline_id} parado com sucesso")
            return {"success": True, "pipeline_id": pipeline_id}
        else:
            error_msg = f"Falha ao parar pipeline {pipeline_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
            
    except Exception as e:
        error_msg = f"Erro ao parar pipeline {pipeline_id}: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}


@celery_app.task(bind=True, name="pipeline.pause")
def pause_pipeline_task(self, pipeline_id: str):
    """Pausa a execução de um pipeline."""
    try:
        logger.info(f"Pausando pipeline {pipeline_id}")
        
        success = pipeline_manager.pause_pipeline(pipeline_id)
        
        if success:
            logger.info(f"Pipeline {pipeline_id} pausado com sucesso")
            return {"success": True, "pipeline_id": pipeline_id}
        else:
            error_msg = f"Falha ao pausar pipeline {pipeline_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
            
    except Exception as e:
        error_msg = f"Erro ao pausar pipeline {pipeline_id}: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}


@celery_app.task(bind=True, name="pipeline.resume")
def resume_pipeline_task(self, pipeline_id: str):
    """Resume a execução de um pipeline pausado."""
    try:
        logger.info(f"Resumindo pipeline {pipeline_id}")
        
        success = pipeline_manager.resume_pipeline(pipeline_id)
        
        if success:
            logger.info(f"Pipeline {pipeline_id} resumido com sucesso")
            return {"success": True, "pipeline_id": pipeline_id}
        else:
            error_msg = f"Falha ao resumir pipeline {pipeline_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
            
    except Exception as e:
        error_msg = f"Erro ao resumir pipeline {pipeline_id}: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}


@celery_app.task(bind=True, name="pipeline.delete")
def delete_pipeline_task(self, pipeline_id: str):
    """Remove um pipeline."""
    try:
        logger.info(f"Removendo pipeline {pipeline_id}")
        
        success = pipeline_manager.delete_pipeline(pipeline_id)
        
        if success:
            logger.info(f"Pipeline {pipeline_id} removido com sucesso")
            return {"success": True, "pipeline_id": pipeline_id}
        else:
            error_msg = f"Falha ao remover pipeline {pipeline_id}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}
            
    except Exception as e:
        error_msg = f"Erro ao remover pipeline {pipeline_id}: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}


@celery_app.task(bind=True, name="pipeline.get_status")
def get_pipeline_status_task(self, pipeline_id: str):
    """Obtém o status de um pipeline."""
    try:
        status = pipeline_manager.get_pipeline_status(pipeline_id)
        
        if status:
            return {"success": True, "status": status}
        else:
            return {"success": False, "error": "Pipeline não encontrado"}
            
    except Exception as e:
        error_msg = f"Erro ao obter status do pipeline {pipeline_id}: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}


@celery_app.task(bind=True, name="system.health_check")
def health_check_task(self):
    """Verifica a saúde do sistema de pipelines."""
    try:
        stats = pipeline_manager.get_system_stats()
        
        return {
            "success": True,
            "timestamp": asyncio.get_event_loop().time(),
            "stats": stats
        }
        
    except Exception as e:
        error_msg = f"Erro no health check: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}


@celery_app.task(bind=True, name="system.cleanup")
def cleanup_task(self):
    """Limpa recursos do sistema."""
    try:
        logger.info("Executando limpeza do sistema")
        pipeline_manager.cleanup_all()
        
        return {"success": True, "message": "Limpeza executada com sucesso"}
        
    except Exception as e:
        error_msg = f"Erro na limpeza: {str(e)}"
        logger.error(error_msg)
        return {"success": False, "error": error_msg}


# Tarefas periódicas (configurar com celery beat se necessário)
@celery_app.task(name="pipeline.monitor")
def monitor_pipelines_task():
    """Monitora pipelines em execução."""
    try:
        stats = pipeline_manager.get_system_stats()
        logger.info(f"Monitor: {stats['running_pipelines']} pipelines ativos")
        
        # Aqui poderia enviar dados via WebSocket para o frontend
        return stats
        
    except Exception as e:
        logger.error(f"Erro no monitoramento: {str(e)}")
        return None


if __name__ == "__main__":
    # Para execução direta do worker
    celery_app.start()
