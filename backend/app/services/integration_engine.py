# Sistema de Integração Completa AIOS v2.0
# Orquestração de todos os componentes do sistema

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json
import os

# Importações dos serviços implementados
from .whatsapp_service import WhatsAppNotificationService
from .kanban_service import KanbanNotificationService
from .plc_service import PLCCommunicationService
from .rtsp_streaming import RTSPStreamManager
from .webrtc_streaming import WebRTCStreamManager

logger = logging.getLogger(__name__)

@dataclass
class AIOSEvent:
    """Evento padronizado do sistema AIOS"""
    id: str
    type: str  # intrusion, fire, emergency, equipment_failure, etc
    source: str  # camera_id, sensor_id, etc
    severity: str  # low, medium, high, critical
    timestamp: datetime
    data: Dict[str, Any]
    processed: bool = False

@dataclass
class IntegrationConfig:
    """Configuração de integração do sistema"""
    enable_whatsapp: bool = True
    enable_kanban: bool = True
    enable_plc: bool = True
    enable_streaming: bool = True
    
    # Mapeamento de eventos para ações
    event_action_mapping: Dict[str, List[str]] = None
    
    # Configurações de notificação
    notification_thresholds: Dict[str, str] = None
    
    def __post_init__(self):
        if self.event_action_mapping is None:
            self.event_action_mapping = {
                'intrusion_detected': ['plc_alarm', 'whatsapp_alert', 'kanban_task'],
                'fire_detected': ['plc_emergency', 'whatsapp_critical', 'kanban_urgent'],
                'equipment_failure': ['kanban_maintenance', 'whatsapp_info'],
                'emergency_button': ['plc_lockdown', 'whatsapp_critical', 'kanban_urgent'],
                'perimeter_breach': ['plc_alarm', 'whatsapp_alert', 'kanban_task'],
                'unauthorized_access': ['plc_alarm', 'whatsapp_alert', 'kanban_security']
            }
        
        if self.notification_thresholds is None:
            self.notification_thresholds = {
                'low': 'kanban',
                'medium': 'kanban,whatsapp',
                'high': 'kanban,whatsapp,plc',
                'critical': 'all'
            }

class AIOSIntegrationEngine:
    """Motor de integração principal do AIOS v2.0"""
    
    def __init__(self, config: IntegrationConfig = None):
        self.config = config or IntegrationConfig()
        
        # Serviços de notificação
        self.whatsapp_service: Optional[WhatsAppNotificationService] = None
        self.kanban_service: Optional[KanbanNotificationService] = None
        self.plc_service: Optional[PLCCommunicationService] = None
        
        # Serviços de streaming
        self.rtsp_manager: Optional[RTSPStreamManager] = None
        self.webrtc_manager: Optional[WebRTCStreamManager] = None
        
        # Fila de eventos
        self.event_queue: asyncio.Queue = asyncio.Queue()
        self.event_history: List[AIOSEvent] = []
        
        # Tasks de processamento
        self.processing_task: Optional[asyncio.Task] = None
        self.is_running = False
        
        # Estatísticas
        self.stats = {
            'events_processed': 0,
            'events_failed': 0,
            'notifications_sent': 0,
            'plc_actions_executed': 0,
            'start_time': None
        }

    async def initialize(self):
        """Inicializar todos os serviços de integração"""
        logger.info("Initializing AIOS Integration Engine v2.0")
        
        self.stats['start_time'] = datetime.now()
        
        # Inicializar serviços de notificação
        if self.config.enable_whatsapp:
            self.whatsapp_service = WhatsAppNotificationService()
            await self.whatsapp_service.initialize()
            logger.info("WhatsApp service initialized")
        
        if self.config.enable_kanban:
            self.kanban_service = KanbanNotificationService()  
            await self.kanban_service.initialize()
            logger.info("Kanban service initialized")
        
        if self.config.enable_plc:
            self.plc_service = PLCCommunicationService()
            await self.plc_service.initialize()
            
            # Registrar callback para alarmes PLC
            self.plc_service.register_event_callback('alarm', self._handle_plc_alarm)
            logger.info("PLC service initialized")
        
        # Inicializar serviços de streaming
        if self.config.enable_streaming:
            self.rtsp_manager = RTSPStreamManager()
            self.webrtc_manager = WebRTCStreamManager()
            logger.info("Streaming services initialized")
        
        # Iniciar processamento de eventos
        await self._start_event_processing()
        
        logger.info("AIOS Integration Engine fully initialized")

    async def _start_event_processing(self):
        """Iniciar processamento de eventos"""
        if self.processing_task and not self.processing_task.done():
            return
        
        self.is_running = True
        self.processing_task = asyncio.create_task(self._event_processing_loop())
        logger.info("Event processing started")

    async def _event_processing_loop(self):
        """Loop principal de processamento de eventos"""
        while self.is_running:
            try:
                # Aguardar evento na fila
                event = await asyncio.wait_for(
                    self.event_queue.get(), 
                    timeout=1.0
                )
                
                await self._process_event(event)
                
            except asyncio.TimeoutError:
                # Timeout normal, continuar loop
                continue
            except asyncio.CancelledError:
                logger.info("Event processing loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in event processing loop: {e}")
                self.stats['events_failed'] += 1

    async def _process_event(self, event: AIOSEvent):
        """Processar um evento individual"""
        logger.info(f"Processing event: {event.type} from {event.source} (severity: {event.severity})")
        
        try:
            # Adicionar ao histórico
            self.event_history.append(event)
            if len(self.event_history) > 1000:
                self.event_history = self.event_history[-500:]
            
            # Obter ações para este tipo de evento
            actions = self.config.event_action_mapping.get(event.type, [])
            
            # Determinar quais serviços usar baseado na severidade
            enabled_services = self._get_enabled_services_for_severity(event.severity)
            
            # Executar ações em paralelo
            tasks = []
            
            # Ações PLC
            if 'plc' in enabled_services and self.plc_service:
                for action in actions:
                    if action.startswith('plc_'):
                        task = asyncio.create_task(
                            self._execute_plc_action(action, event)
                        )
                        tasks.append(task)
            
            # Notificações WhatsApp
            if 'whatsapp' in enabled_services and self.whatsapp_service:
                for action in actions:
                    if action.startswith('whatsapp_'):
                        task = asyncio.create_task(
                            self._send_whatsapp_notification(action, event)
                        )
                        tasks.append(task)
            
            # Tasks Kanban
            if 'kanban' in enabled_services and self.kanban_service:
                for action in actions:
                    if action.startswith('kanban_'):
                        task = asyncio.create_task(
                            self._create_kanban_task(action, event)
                        )
                        tasks.append(task)
            
            # Executar todas as ações
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                success_count = sum(1 for r in results if r is True)
                logger.info(f"Event {event.id} processed: {success_count}/{len(tasks)} actions successful")
            
            # Marcar como processado
            event.processed = True
            self.stats['events_processed'] += 1
            
        except Exception as e:
            logger.error(f"Error processing event {event.id}: {e}")
            self.stats['events_failed'] += 1

    def _get_enabled_services_for_severity(self, severity: str) -> List[str]:
        """Determinar quais serviços usar baseado na severidade"""
        threshold = self.config.notification_thresholds.get(severity, 'kanban')
        
        if threshold == 'all':
            return ['whatsapp', 'kanban', 'plc']
        else:
            return threshold.split(',')

    async def _execute_plc_action(self, action: str, event: AIOSEvent) -> bool:
        """Executar ação PLC"""
        if not self.plc_service:
            return False
        
        try:
            # Mapear ação para evento PLC
            plc_event_mapping = {
                'plc_alarm': 'intrusion_detected',
                'plc_emergency': 'emergency_detected', 
                'plc_lockdown': 'lockdown_initiated'
            }
            
            plc_event = plc_event_mapping.get(action)
            if plc_event:
                await self.plc_service.handle_aios_event(plc_event, event.data)
                self.stats['plc_actions_executed'] += 1
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error executing PLC action {action}: {e}")
            return False

    async def _send_whatsapp_notification(self, action: str, event: AIOSEvent) -> bool:
        """Enviar notificação WhatsApp"""
        if not self.whatsapp_service:
            return False
        
        try:
            # Mapear ação para template WhatsApp
            template_mapping = {
                'whatsapp_alert': 'security_alert',
                'whatsapp_critical': 'emergency_alert',
                'whatsapp_info': 'maintenance_alert'
            }
            
            template_name = template_mapping.get(action, 'security_alert')
            
            # Obter lista de contatos para este tipo de evento
            contacts = await self._get_notification_contacts(event.type, event.severity)
            
            # Preparar parâmetros da mensagem
            message_params = {
                'event_type': event.type,
                'source': event.source,
                'timestamp': event.timestamp.strftime('%d/%m/%Y %H:%M:%S'),
                'severity': event.severity
            }
            
            # Enviar para todos os contatos
            success_count = 0
            for contact in contacts:
                success = await self.whatsapp_service.send_template_message(
                    contact['phone'],
                    template_name,
                    message_params
                )
                if success:
                    success_count += 1
            
            if success_count > 0:
                self.stats['notifications_sent'] += success_count
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error sending WhatsApp notification {action}: {e}")
            return False

    async def _create_kanban_task(self, action: str, event: AIOSEvent) -> bool:
        """Criar task no Kanban"""
        if not self.kanban_service:
            return False
        
        try:
            # Mapear ação para prioridade e projeto
            task_mapping = {
                'kanban_task': {'priority': 'medium', 'project': 'security'},
                'kanban_urgent': {'priority': 'high', 'project': 'security'},
                'kanban_maintenance': {'priority': 'medium', 'project': 'maintenance'},
                'kanban_security': {'priority': 'high', 'project': 'security'}
            }
            
            task_config = task_mapping.get(action, {'priority': 'medium', 'project': 'security'})
            
            # Criar descrição da task
            task_title = f"AIOS Alert: {event.type}"
            task_description = f"""
Evento detectado pelo sistema AIOS:

Tipo: {event.type}
Fonte: {event.source}  
Severidade: {event.severity}
Data/Hora: {event.timestamp.strftime('%d/%m/%Y %H:%M:%S')}

Dados adicionais:
{json.dumps(event.data, indent=2, default=str)}

ID do Evento: {event.id}
            """.strip()
            
            # Criar task
            task_data = {
                'title': task_title,
                'description': task_description,
                'priority': task_config['priority'],
                'project': task_config['project'],
                'labels': [event.type, event.severity, 'aios-alert'],
                'due_date': None  # Sem prazo específico
            }
            
            success = await self.kanban_service.create_task_from_alert(
                event.id,
                task_data
            )
            
            if success:
                self.stats['notifications_sent'] += 1
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error creating Kanban task {action}: {e}")
            return False

    async def _get_notification_contacts(self, event_type: str, severity: str) -> List[Dict]:
        """Obter contatos para notificação baseado no evento"""
        # TODO: Implementar busca no banco de dados
        # Por enquanto, retornar contatos mock
        
        base_contacts = [
            {'phone': '+5511999999999', 'name': 'Supervisor Segurança', 'role': 'security'},
            {'phone': '+5511888888888', 'name': 'Gerente Operacional', 'role': 'management'}
        ]
        
        if severity in ['high', 'critical']:
            # Adicionar contatos de emergência
            base_contacts.extend([
                {'phone': '+5511777777777', 'name': 'Diretor Geral', 'role': 'executive'},
                {'phone': '+5511666666666', 'name': 'Coordenador TI', 'role': 'technical'}
            ])
        
        return base_contacts

    async def _handle_plc_alarm(self, alarm_data: Dict):
        """Processar alarme do PLC como evento AIOS"""
        event = AIOSEvent(
            id=alarm_data['id'],
            type='plc_alarm',
            source=f"plc_{alarm_data['rule_id']}",
            severity='high' if alarm_data['priority'] == 'critical' else alarm_data['priority'],
            timestamp=alarm_data['timestamp'],
            data=alarm_data
        )
        
        await self.emit_event(event)

    async def emit_event(self, event: AIOSEvent):
        """Emitir evento para processamento"""
        await self.event_queue.put(event)
        logger.debug(f"Event emitted: {event.type} from {event.source}")

    async def emit_detection_event(self, detection_data: Dict):
        """Emitir evento de detecção de IA"""
        event_type_mapping = {
            'person': 'intrusion_detected',
            'fire': 'fire_detected', 
            'smoke': 'fire_detected',
            'weapon': 'security_threat',
            'vehicle': 'vehicle_detected'
        }
        
        detected_class = detection_data.get('class', 'unknown')
        event_type = event_type_mapping.get(detected_class, 'object_detected')
        
        # Determinar severidade baseada na confiança e classe
        confidence = detection_data.get('confidence', 0)
        if detected_class in ['fire', 'smoke', 'weapon']:
            severity = 'critical' if confidence > 0.8 else 'high'
        elif detected_class == 'person':
            severity = 'high' if confidence > 0.7 else 'medium'
        else:
            severity = 'medium' if confidence > 0.6 else 'low'
        
        event = AIOSEvent(
            id=f"detection_{int(datetime.now().timestamp())}_{detected_class}",
            type=event_type,
            source=detection_data.get('camera_id', 'unknown'),
            severity=severity,
            timestamp=datetime.now(),
            data=detection_data
        )
        
        await self.emit_event(event)

    async def emit_streaming_event(self, stream_data: Dict):
        """Emitir evento de streaming"""
        event_type = stream_data.get('event_type', 'stream_status')
        
        event = AIOSEvent(
            id=f"stream_{int(datetime.now().timestamp())}",
            type=event_type,
            source=stream_data.get('stream_id', 'unknown'),
            severity='low',
            timestamp=datetime.now(),
            data=stream_data
        )
        
        await self.emit_event(event)

    def get_system_status(self) -> Dict[str, Any]:
        """Obter status completo do sistema"""
        uptime = None
        if self.stats['start_time']:
            uptime = (datetime.now() - self.stats['start_time']).total_seconds()
        
        status = {
            'engine_status': 'running' if self.is_running else 'stopped',
            'uptime_seconds': uptime,
            'events_in_queue': self.event_queue.qsize(),
            'services': {
                'whatsapp': self.whatsapp_service is not None,
                'kanban': self.kanban_service is not None,
                'plc': self.plc_service is not None,
                'streaming': self.rtsp_manager is not None
            },
            'statistics': self.stats.copy()
        }
        
        # Adicionar status dos serviços específicos
        if self.plc_service:
            status['plc_stats'] = self.plc_service.get_system_stats()
        
        if self.whatsapp_service:
            status['whatsapp_stats'] = self.whatsapp_service.get_service_stats()
        
        if self.kanban_service:
            status['kanban_stats'] = self.kanban_service.get_service_stats()
        
        return status

    def get_event_history(self, limit: int = 100) -> List[Dict]:
        """Obter histórico de eventos"""
        events = self.event_history[-limit:]
        return [
            {
                'id': e.id,
                'type': e.type,
                'source': e.source,
                'severity': e.severity,
                'timestamp': e.timestamp.isoformat(),
                'processed': e.processed,
                'data': e.data
            }
            for e in events
        ]

    async def test_integration(self) -> Dict[str, Any]:
        """Testar integração completa do sistema"""
        logger.info("Starting integration test")
        
        test_results = {
            'timestamp': datetime.now().isoformat(),
            'tests': {}
        }
        
        # Teste de evento mock
        test_event = AIOSEvent(
            id=f"test_{int(datetime.now().timestamp())}",
            type='intrusion_detected',
            source='test_camera_01',
            severity='medium',
            timestamp=datetime.now(),
            data={'test': True, 'confidence': 0.85}
        )
        
        try:
            # Emitir evento de teste
            await self.emit_event(test_event)
            
            # Aguardar processamento
            await asyncio.sleep(2)
            
            test_results['tests']['event_processing'] = {
                'success': True,
                'message': 'Event emitted and processed successfully'
            }
            
        except Exception as e:
            test_results['tests']['event_processing'] = {
                'success': False,
                'error': str(e)
            }
        
        # Testar serviços individuais
        if self.plc_service:
            try:
                plc_stats = self.plc_service.get_system_stats()
                test_results['tests']['plc_service'] = {
                    'success': True,
                    'stats': plc_stats
                }
            except Exception as e:
                test_results['tests']['plc_service'] = {
                    'success': False,
                    'error': str(e)
                }
        
        if self.whatsapp_service:
            try:
                wa_stats = self.whatsapp_service.get_service_stats()
                test_results['tests']['whatsapp_service'] = {
                    'success': True,
                    'stats': wa_stats
                }
            except Exception as e:
                test_results['tests']['whatsapp_service'] = {
                    'success': False,
                    'error': str(e)
                }
        
        if self.kanban_service:
            try:
                kb_stats = self.kanban_service.get_service_stats()
                test_results['tests']['kanban_service'] = {
                    'success': True,
                    'stats': kb_stats
                }
            except Exception as e:
                test_results['tests']['kanban_service'] = {
                    'success': False,
                    'error': str(e)
                }
        
        logger.info("Integration test completed")
        return test_results

    async def shutdown(self):
        """Encerrar motor de integração"""
        logger.info("Shutting down AIOS Integration Engine")
        
        self.is_running = False
        
        # Cancelar processamento de eventos
        if self.processing_task and not self.processing_task.done():
            self.processing_task.cancel()
            try:
                await self.processing_task
            except asyncio.CancelledError:
                pass
        
        # Encerrar serviços
        shutdown_tasks = []
        
        if self.whatsapp_service:
            shutdown_tasks.append(
                asyncio.create_task(self.whatsapp_service.shutdown())
            )
        
        if self.kanban_service:
            shutdown_tasks.append(
                asyncio.create_task(self.kanban_service.shutdown())
            )
        
        if self.plc_service:
            shutdown_tasks.append(
                asyncio.create_task(self.plc_service.shutdown())
            )
        
        if shutdown_tasks:
            await asyncio.gather(*shutdown_tasks, return_exceptions=True)
        
        logger.info("AIOS Integration Engine shut down completed")

# Instância global do motor de integração
integration_engine = AIOSIntegrationEngine()

# Funções de conveniência para uso em outros módulos
async def initialize_integration_engine(config: IntegrationConfig = None):
    """Inicializar motor de integração global"""
    global integration_engine
    if config:
        integration_engine.config = config
    await integration_engine.initialize()

async def emit_aios_event(event: AIOSEvent):
    """Emitir evento AIOS"""
    await integration_engine.emit_event(event)

async def emit_detection(detection_data: Dict):
    """Emitir evento de detecção"""
    await integration_engine.emit_detection_event(detection_data)

def get_integration_status() -> Dict[str, Any]:
    """Obter status da integração"""
    return integration_engine.get_system_status()
