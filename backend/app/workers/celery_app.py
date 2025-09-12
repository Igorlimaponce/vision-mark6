from celery import Celery
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "aios_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_default_retry_delay=60,
    task_max_retries=3,
    worker_prefetch_multiplier=1,
    worker_concurrency=2,
)

# Task routing
celery_app.conf.task_routes = {
    "app.workers.tasks.process_video_stream": {"queue": "video_processing"},
    "app.workers.tasks.run_pipeline": {"queue": "pipeline_execution"},
    "app.workers.tasks.cleanup_old_data": {"queue": "maintenance"},
    "app.workers.tasks.send_notification": {"queue": "notifications"},
}

# Periodic tasks configuration
celery_app.conf.beat_schedule = {
    "cleanup-old-detections": {
        "task": "app.workers.tasks.cleanup_old_data",
        "schedule": 86400.0,  # Run daily
        "args": ("detections", 30),  # Clean detections older than 30 days
    },
    "check-device-health": {
        "task": "app.workers.tasks.check_device_health",
        "schedule": 300.0,  # Run every 5 minutes
    },
    "update-pipeline-metrics": {
        "task": "app.workers.tasks.update_pipeline_metrics",
        "schedule": 60.0,  # Run every minute
    },
}
