import asyncio
import random
import json
from datetime import datetime
from app.services.websocket_service import notify_system_metrics, notify_device_status_change, notify_new_event
import logging

logger = logging.getLogger(__name__)

class SystemMonitor:
    def __init__(self):
        self.is_running = False
        self.task = None

    async def start(self):
        """Iniciar monitoramento do sistema"""
        if self.is_running:
            return
        
        self.is_running = True
        self.task = asyncio.create_task(self._monitor_loop())
        logger.info("Sistema de monitoramento iniciado")

    async def stop(self):
        """Parar monitoramento do sistema"""
        self.is_running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Sistema de monitoramento parado")

    async def _monitor_loop(self):
        """Loop principal de monitoramento"""
        try:
            while self.is_running:
                # Enviar métricas do sistema a cada 30 segundos
                await self._send_system_metrics()
                await asyncio.sleep(30)
                
                # Simular mudança de status de dispositivo ocasionalmente
                if random.random() < 0.1:  # 10% de chance
                    await self._simulate_device_status_change()
                
                # Simular novo evento ocasionalmente
                if random.random() < 0.05:  # 5% de chance
                    await self._simulate_new_event()
                    
        except asyncio.CancelledError:
            logger.info("Monitor loop cancelled")
        except Exception as e:
            logger.error(f"Error in monitor loop: {e}")

    async def _send_system_metrics(self):
        """Enviar métricas do sistema via WebSocket"""
        try:
            metrics = {
                "devices": {
                    "total": 4,
                    "online": random.randint(2, 4),
                    "offline": random.randint(0, 2),
                    "warning": random.randint(0, 1)
                },
                "pipelines": {
                    "total": 3,
                    "active": random.randint(1, 3),
                    "inactive": random.randint(0, 2)
                },
                "system": {
                    "cpu_usage": round(random.uniform(20, 80), 1),
                    "memory_usage": round(random.uniform(40, 90), 1),
                    "disk_usage": round(random.uniform(30, 70), 1),
                    "network_usage": round(random.uniform(10, 50), 1)
                },
                "performance": {
                    "avg_fps": round(random.uniform(20, 30), 1),
                    "total_detections": random.randint(1000, 5000),
                    "active_streams": random.randint(2, 4)
                },
                "timestamp": datetime.now().isoformat()
            }
            
            await notify_system_metrics(metrics)
            logger.debug("System metrics sent via WebSocket")
            
        except Exception as e:
            logger.error(f"Error sending system metrics: {e}")

    async def _simulate_device_status_change(self):
        """Simular mudança de status de dispositivo"""
        try:
            device_ids = [
                "550e8400-e29b-41d4-a716-446655440010",
                "550e8400-e29b-41d4-a716-446655440011",
                "550e8400-e29b-41d4-a716-446655440012",
                "550e8400-e29b-41d4-a716-446655440013"
            ]
            
            device_id = random.choice(device_ids)
            new_status = random.choice(['online', 'offline', 'warning'])
            
            await notify_device_status_change(
                device_id=device_id,
                new_status=new_status,
                organization_id="550e8400-e29b-41d4-a716-446655440000"
            )
            
            logger.info(f"Simulated device status change: {device_id} -> {new_status}")
            
        except Exception as e:
            logger.error(f"Error simulating device status change: {e}")

    async def _simulate_new_event(self):
        """Simular novo evento/alerta"""
        try:
            event_types = [
                {
                    "title": "Movimento Detectado",
                    "message": "Movimento suspeito detectado na área restrita",
                    "severity": "high",
                    "type": "detection"
                },
                {
                    "title": "Dispositivo Reconectado", 
                    "message": "Câmera voltou a responder após interrupção",
                    "severity": "medium",
                    "type": "system"
                },
                {
                    "title": "Alta CPU Detectada",
                    "message": "Uso de CPU acima de 85% no servidor principal",
                    "severity": "medium", 
                    "type": "system"
                },
                {
                    "title": "Pessoa em Área Restrita",
                    "message": "Pipeline detectou pessoa não autorizada",
                    "severity": "high",
                    "type": "alert"
                }
            ]
            
            event_data = random.choice(event_types)
            event_data.update({
                "id": f"evt_{random.randint(1000, 9999)}",
                "device_id": random.choice([
                    "550e8400-e29b-41d4-a716-446655440010",
                    "550e8400-e29b-41d4-a716-446655440011", 
                    "550e8400-e29b-41d4-a716-446655440012",
                    "550e8400-e29b-41d4-a716-446655440013"
                ]),
                "timestamp": datetime.now().isoformat(),
                "acknowledged": False
            })
            
            await notify_new_event(
                event_data=event_data,
                organization_id="550e8400-e29b-41d4-a716-446655440000"
            )
            
            logger.info(f"Simulated new event: {event_data['title']}")
            
        except Exception as e:
            logger.error(f"Error simulating new event: {e}")

# Instância global do monitor
system_monitor = SystemMonitor()

async def start_system_monitor():
    """Iniciar o monitor do sistema"""
    await system_monitor.start()

async def stop_system_monitor():
    """Parar o monitor do sistema"""
    await system_monitor.stop()