import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
from celery import Task
from sqlalchemy.orm import Session

from app.workers.celery_app import celery_app
from app.db.session import SessionLocal
from app.crud import crud_device, crud_event, crud_pipeline
from app.api.ws.manager import connection_manager
from app.core.config import settings

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """
    Base task class that provides database session management.
    """
    _db = None

    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(bind=True, base=DatabaseTask)
def process_video_stream(self, device_id: str, pipeline_config: Dict[str, Any]):
    """
    Process video stream from a device using a pipeline configuration.
    This is the main computer vision processing task.
    """
    logger.info(f"Starting video processing for device {device_id}")
    
    try:
        # Get device information
        device = crud_device.get_device(self.db, device_id=device_id)
        if not device:
            logger.error(f"Device {device_id} not found")
            return {"error": "Device not found"}
        
        # Update device status to processing
        crud_device.update_device_status(
            self.db,
            device_id=device_id,
            status="PROCESSING"
        )
        
        # TODO: Implement actual video processing logic
        # This would involve:
        # 1. Connecting to RTSP stream
        # 2. Running YOLO detection
        # 3. Applying pipeline logic (polygons, loitering, etc.)
        # 4. Generating events and detections
        # 5. Sending notifications
        
        # Placeholder: simulate processing
        import time
        time.sleep(2)
        
        # Update device status back to online
        crud_device.update_device_status(
            self.db,
            device_id=device_id,
            status="ON"
        )
        
        # Broadcast status update via WebSocket
        connection_manager.broadcast_device_status(
            device_id=device_id,
            status="ON",
            organization_id=str(device.organization_id),
            metadata={"last_processed": datetime.utcnow().isoformat()}
        )
        
        logger.info(f"Completed video processing for device {device_id}")
        return {"success": True, "device_id": device_id}
        
    except Exception as e:
        logger.error(f"Error processing video for device {device_id}: {str(e)}")
        
        # Update device status to error
        crud_device.update_device_status(
            self.db,
            device_id=device_id,
            status="ERROR"
        )
        
        raise self.retry(exc=e, countdown=60, max_retries=3)


@celery_app.task(bind=True, base=DatabaseTask)
def run_pipeline(self, pipeline_id: str, device_ids: List[str] = None):
    """
    Execute a pipeline on specified devices or all devices in the organization.
    """
    logger.info(f"Starting pipeline execution: {pipeline_id}")
    
    try:
        # Get pipeline configuration
        pipeline = crud_pipeline.get_pipeline(self.db, pipeline_id=pipeline_id)
        if not pipeline:
            logger.error(f"Pipeline {pipeline_id} not found")
            return {"error": "Pipeline not found"}
        
        # Update pipeline status
        crud_pipeline.update_pipeline_status(self.db, pipeline_id=pipeline_id, status="running")
        
        # Get devices to process
        if device_ids:
            devices = [crud_device.get_device(self.db, device_id=did) for did in device_ids]
            devices = [d for d in devices if d]  # Filter out None values
        else:
            # Get all online devices from the same organization
            devices = crud_device.get_devices_by_status(
                self.db, 
                organization_id=pipeline.organization_id, 
                status="ON"
            )
        
        # Start video processing tasks for each device
        task_results = []
        for device in devices:
            task_result = process_video_stream.delay(
                device_id=str(device.id),
                pipeline_config={
                    "pipeline_id": pipeline_id,
                    "nodes": [node.__dict__ for node in pipeline.nodes],
                    "edges": [edge.__dict__ for edge in pipeline.edges]
                }
            )
            task_results.append(task_result.id)
        
        logger.info(f"Started {len(task_results)} video processing tasks for pipeline {pipeline_id}")
        return {
            "success": True,
            "pipeline_id": pipeline_id,
            "devices_count": len(devices),
            "task_ids": task_results
        }
        
    except Exception as e:
        logger.error(f"Error running pipeline {pipeline_id}: {str(e)}")
        crud_pipeline.update_pipeline_status(self.db, pipeline_id=pipeline_id, status="error")
        raise


@celery_app.task(bind=True, base=DatabaseTask)
def cleanup_old_data(self, table_name: str, days_old: int):
    """
    Clean up old data from specified table.
    """
    logger.info(f"Cleaning up old data from {table_name} (older than {days_old} days)")
    
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        if table_name == "detections":
            # Clean old detections
            deleted_count = self.db.execute(
                f"DELETE FROM detections WHERE timestamp < '{cutoff_date}'"
            ).rowcount
            
        elif table_name == "events":
            # Clean old acknowledged events
            deleted_count = self.db.execute(
                f"DELETE FROM events WHERE timestamp < '{cutoff_date}' AND acknowledged = 'Y'"
            ).rowcount
            
        else:
            logger.warning(f"Unknown table for cleanup: {table_name}")
            return {"error": "Unknown table"}
        
        self.db.commit()
        
        logger.info(f"Cleaned up {deleted_count} records from {table_name}")
        return {"success": True, "deleted_count": deleted_count}
        
    except Exception as e:
        logger.error(f"Error cleaning up {table_name}: {str(e)}")
        self.db.rollback()
        raise


@celery_app.task(bind=True, base=DatabaseTask)
def check_device_health(self):
    """
    Check device health and mark stale devices as offline.
    """
    logger.info("Checking device health")
    
    try:
        # Mark devices as offline if they haven't sent heartbeat in 5 minutes
        updated_count = crud_device.mark_device_offline_if_stale(self.db, minutes_threshold=5)
        
        if updated_count > 0:
            logger.info(f"Marked {updated_count} devices as offline due to staleness")
        
        return {"success": True, "updated_devices": updated_count}
        
    except Exception as e:
        logger.error(f"Error checking device health: {str(e)}")
        raise


@celery_app.task(bind=True, base=DatabaseTask)
def update_pipeline_metrics(self):
    """
    Update pipeline execution metrics and statistics.
    """
    logger.info("Updating pipeline metrics")
    
    try:
        # TODO: Implement metrics collection
        # This could involve:
        # 1. Counting active pipelines
        # 2. Measuring processing rates
        # 3. Tracking error rates
        # 4. Updating dashboard statistics
        
        return {"success": True, "metrics_updated": True}
        
    except Exception as e:
        logger.error(f"Error updating pipeline metrics: {str(e)}")
        raise


@celery_app.task(bind=True, base=DatabaseTask)
def send_notification(self, notification_type: str, payload: Dict[str, Any]):
    """
    Send notifications (WhatsApp, email, etc.) based on pipeline events.
    """
    logger.info(f"Sending {notification_type} notification")
    
    try:
        if notification_type == "whatsapp":
            # TODO: Implement WhatsApp notification
            phone = payload.get("phone")
            message = payload.get("message")
            logger.info(f"Would send WhatsApp to {phone}: {message}")
            
        elif notification_type == "email":
            # TODO: Implement email notification
            email = payload.get("email")
            subject = payload.get("subject")
            logger.info(f"Would send email to {email}: {subject}")
            
        elif notification_type == "webhook":
            # TODO: Implement webhook notification
            url = payload.get("url")
            data = payload.get("data")
            logger.info(f"Would send webhook to {url}: {data}")
            
        else:
            logger.warning(f"Unknown notification type: {notification_type}")
            return {"error": "Unknown notification type"}
        
        return {"success": True, "notification_type": notification_type}
        
    except Exception as e:
        logger.error(f"Error sending {notification_type} notification: {str(e)}")
        raise
