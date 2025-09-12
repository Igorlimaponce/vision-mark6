# Sistema de Comunicação PLC para AIOS
# Integração com controladores PLC para automação industrial baseada em eventos

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import struct
import socket
import os

logger = logging.getLogger(__name__)

class PLCProtocol(Enum):
    """Protocolos PLC suportados"""
    MODBUS_TCP = "modbus_tcp"
    ETHERNET_IP = "ethernet_ip"
    PROFINET = "profinet"
    SIEMENS_S7 = "siemens_s7"
    OMRON_FINS = "omron_fins"

class PLCDataType(Enum):
    """Tipos de dados PLC"""
    BOOL = "bool"
    INT16 = "int16"
    INT32 = "int32"
    FLOAT32 = "float32"
    STRING = "string"

class PLCOperationType(Enum):
    """Tipos de operação PLC"""
    READ = "read"
    WRITE = "write"
    SUBSCRIBE = "subscribe"

@dataclass
class PLCDevice:
    """Configuração de dispositivo PLC"""
    id: str
    name: str
    protocol: PLCProtocol
    ip_address: str
    port: int
    rack: int = 0
    slot: int = 0
    timeout: float = 5.0
    is_active: bool = True
    last_communication: Optional[datetime] = None

@dataclass
class PLCTag:
    """Tag PLC para comunicação"""
    name: str
    address: str
    data_type: PLCDataType
    access_mode: str = "RW"  # R, W, RW
    description: str = ""
    scaling_factor: float = 1.0
    offset: float = 0.0

@dataclass
class PLCAlarmRule:
    """Regra de alarme baseada em tag PLC"""
    id: str
    name: str
    tag_name: str
    condition: str  # ==, !=, >, <, >=, <=
    threshold_value: Union[int, float, bool]
    message: str
    priority: str = "medium"
    is_enabled: bool = True
    cooldown_minutes: int = 5

@dataclass
class PLCAction:
    """Ação a ser executada no PLC baseada em eventos AIOS"""
    id: str
    name: str
    trigger_event: str  # intrusion, fire, emergency, etc
    device_id: str
    tag_name: str
    action_value: Union[int, float, bool]
    description: str = ""
    is_enabled: bool = True
    delay_seconds: float = 0.0

class PLCCommunicationService:
    """Serviço de comunicação PLC integrado com AIOS"""
    
    def __init__(self):
        self.devices: Dict[str, PLCDevice] = {}
        self.tags: Dict[str, PLCTag] = {}
        self.alarm_rules: Dict[str, PLCAlarmRule] = {}
        self.actions: Dict[str, PLCAction] = {}
        
        # Conexões ativas
        self.connections: Dict[str, Any] = {}
        
        # Cache de valores lidos
        self.tag_values: Dict[str, Any] = {}
        self.tag_timestamps: Dict[str, datetime] = {}
        
        # Histórico de alarmes
        self.alarm_history: List[Dict] = []
        
        # Callbacks para eventos
        self.event_callbacks: Dict[str, List[Callable]] = {}
        
        # Task de monitoramento
        self.monitoring_task: Optional[asyncio.Task] = None
        self.monitoring_interval = 1.0  # segundos

    async def initialize(self):
        """Inicializar o serviço PLC"""
        await self._load_configuration()
        await self._establish_connections()
        await self._start_monitoring()
        logger.info("PLC Communication Service initialized")

    async def _load_configuration(self):
        """Carregar configuração de dispositivos, tags e regras"""
        # TODO: Carregar do banco de dados
        # Por enquanto, configuração mock
        
        # Dispositivos mock
        mock_devices = [
            PLCDevice(
                id="plc_001",
                name="PLC Principal - Portaria",
                protocol=PLCProtocol.MODBUS_TCP,
                ip_address="192.168.1.10",
                port=502
            ),
            PLCDevice(
                id="plc_002", 
                name="PLC Secundário - Almoxarifado",
                protocol=PLCProtocol.SIEMENS_S7,
                ip_address="192.168.1.11",
                port=102,
                rack=0,
                slot=1
            )
        ]
        
        for device in mock_devices:
            self.devices[device.id] = device
        
        # Tags mock
        mock_tags = [
            PLCTag(
                name="alarm_siren",
                address="40001",
                data_type=PLCDataType.BOOL,
                description="Sirene de Alarme"
            ),
            PLCTag(
                name="emergency_light",
                address="40002", 
                data_type=PLCDataType.BOOL,
                description="Luz de Emergência"
            ),
            PLCTag(
                name="door_lock_main",
                address="40003",
                data_type=PLCDataType.BOOL,
                description="Trava da Porta Principal"
            ),
            PLCTag(
                name="temperature_sensor",
                address="30001",
                data_type=PLCDataType.FLOAT32,
                access_mode="R",
                description="Sensor de Temperatura"
            ),
            PLCTag(
                name="system_status",
                address="30002",
                data_type=PLCDataType.INT16,
                access_mode="R", 
                description="Status do Sistema"
            )
        ]
        
        for tag in mock_tags:
            self.tags[tag.name] = tag
        
        # Regras de alarme mock
        mock_alarm_rules = [
            PLCAlarmRule(
                id="temp_high",
                name="Temperatura Alta",
                tag_name="temperature_sensor",
                condition=">=",
                threshold_value=40.0,
                message="Temperatura acima do limite: {value}°C",
                priority="high"
            ),
            PLCAlarmRule(
                id="system_error",
                name="Erro no Sistema",
                tag_name="system_status",
                condition="!=",
                threshold_value=1,
                message="Sistema PLC em estado de erro: {value}",
                priority="critical"
            )
        ]
        
        for rule in mock_alarm_rules:
            self.alarm_rules[rule.id] = rule
        
        # Ações mock
        mock_actions = [
            PLCAction(
                id="intrusion_alarm",
                name="Ativar Alarme - Intrusão",
                trigger_event="intrusion_detected",
                device_id="plc_001",
                tag_name="alarm_siren",
                action_value=True,
                description="Ativar sirene quando intrusão for detectada"
            ),
            PLCAction(
                id="emergency_lighting",
                name="Ativar Iluminação de Emergência",
                trigger_event="emergency_detected",
                device_id="plc_001",
                tag_name="emergency_light",
                action_value=True,
                description="Ativar iluminação de emergência"
            ),
            PLCAction(
                id="lockdown_doors",
                name="Trancar Portas - Emergência",
                trigger_event="lockdown_initiated",
                device_id="plc_001",
                tag_name="door_lock_main",
                action_value=True,
                delay_seconds=2.0,
                description="Trancar portas principais em caso de emergência"
            )
        ]
        
        for action in mock_actions:
            self.actions[action.id] = action
        
        logger.info(f"Loaded PLC config: {len(self.devices)} devices, {len(self.tags)} tags, {len(self.alarm_rules)} rules, {len(self.actions)} actions")

    async def _establish_connections(self):
        """Estabelecer conexões com dispositivos PLC"""
        for device_id, device in self.devices.items():
            if not device.is_active:
                continue
                
            try:
                if device.protocol == PLCProtocol.MODBUS_TCP:
                    connection = await self._connect_modbus(device)
                elif device.protocol == PLCProtocol.SIEMENS_S7:
                    connection = await self._connect_siemens_s7(device)
                else:
                    logger.warning(f"Protocol {device.protocol.value} not implemented yet")
                    continue
                
                if connection:
                    self.connections[device_id] = connection
                    device.last_communication = datetime.now()
                    logger.info(f"Connected to PLC {device.name}")
                
            except Exception as e:
                logger.error(f"Failed to connect to PLC {device.name}: {e}")

    async def _connect_modbus(self, device: PLCDevice) -> Optional[Dict]:
        """Conectar a dispositivo Modbus TCP"""
        try:
            # Simular conexão Modbus
            # TODO: Implementar com biblioteca pymodbus
            mock_connection = {
                'type': 'modbus_tcp',
                'socket': None,  # socket real seria criado aqui
                'device': device,
                'connected': True,
                'last_used': datetime.now()
            }
            
            logger.info(f"Modbus TCP connection established to {device.ip_address}:{device.port}")
            return mock_connection
            
        except Exception as e:
            logger.error(f"Modbus connection failed: {e}")
            return None

    async def _connect_siemens_s7(self, device: PLCDevice) -> Optional[Dict]:
        """Conectar a dispositivo Siemens S7"""
        try:
            # Simular conexão S7
            # TODO: Implementar com biblioteca snap7
            mock_connection = {
                'type': 'siemens_s7',
                'client': None,  # cliente S7 real seria criado aqui
                'device': device,
                'connected': True,
                'last_used': datetime.now()
            }
            
            logger.info(f"Siemens S7 connection established to {device.ip_address}:{device.port}")
            return mock_connection
            
        except Exception as e:
            logger.error(f"Siemens S7 connection failed: {e}")
            return None

    async def _start_monitoring(self):
        """Iniciar monitoramento contínuo dos PLCs"""
        if self.monitoring_task and not self.monitoring_task.done():
            return
            
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("PLC monitoring started")

    async def _monitoring_loop(self):
        """Loop principal de monitoramento"""
        while True:
            try:
                await self._read_all_tags()
                await self._check_alarm_rules()
                await self._cleanup_connections()
                
                await asyncio.sleep(self.monitoring_interval)
                
            except asyncio.CancelledError:
                logger.info("PLC monitoring loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in PLC monitoring loop: {e}")
                await asyncio.sleep(5.0)  # Wait before retry

    async def _read_all_tags(self):
        """Ler todos os tags configurados"""
        for tag_name, tag in self.tags.items():
            if 'R' not in tag.access_mode:
                continue
                
            try:
                # Encontrar dispositivo responsável por este tag
                # TODO: Implementar mapeamento tag -> dispositivo
                device_id = list(self.devices.keys())[0]  # Mock: usar primeiro dispositivo
                
                value = await self._read_tag_value(device_id, tag)
                if value is not None:
                    self.tag_values[tag_name] = value
                    self.tag_timestamps[tag_name] = datetime.now()
                    
            except Exception as e:
                logger.error(f"Error reading tag {tag_name}: {e}")

    async def _read_tag_value(self, device_id: str, tag: PLCTag) -> Optional[Any]:
        """Ler valor de um tag específico"""
        connection = self.connections.get(device_id)
        if not connection or not connection.get('connected'):
            return None
            
        device = connection['device']
        
        try:
            if device.protocol == PLCProtocol.MODBUS_TCP:
                return await self._read_modbus_tag(connection, tag)
            elif device.protocol == PLCProtocol.SIEMENS_S7:
                return await self._read_s7_tag(connection, tag)
            else:
                logger.warning(f"Reading not implemented for protocol {device.protocol.value}")
                return None
                
        except Exception as e:
            logger.error(f"Error reading tag {tag.name}: {e}")
            return None

    async def _read_modbus_tag(self, connection: Dict, tag: PLCTag) -> Optional[Any]:
        """Ler tag Modbus"""
        # Simular leitura Modbus
        # TODO: Implementar leitura real com pymodbus
        
        if tag.data_type == PLCDataType.BOOL:
            # Simular valor booleano
            import random
            return random.choice([True, False])
        elif tag.data_type == PLCDataType.FLOAT32:
            # Simular temperatura
            import random
            return round(random.uniform(20.0, 45.0), 1)
        elif tag.data_type == PLCDataType.INT16:
            # Simular status
            import random
            return random.randint(0, 3)
        
        return None

    async def _read_s7_tag(self, connection: Dict, tag: PLCTag) -> Optional[Any]:
        """Ler tag Siemens S7"""
        # Simular leitura S7
        # TODO: Implementar leitura real com snap7
        
        if tag.data_type == PLCDataType.BOOL:
            import random
            return random.choice([True, False])
        elif tag.data_type == PLCDataType.FLOAT32:
            import random
            return round(random.uniform(18.0, 42.0), 1)
        elif tag.data_type == PLCDataType.INT16:
            import random
            return random.randint(1, 2)
        
        return None

    async def _check_alarm_rules(self):
        """Verificar regras de alarme"""
        for rule_id, rule in self.alarm_rules.items():
            if not rule.is_enabled:
                continue
                
            tag_value = self.tag_values.get(rule.tag_name)
            if tag_value is None:
                continue
                
            # Verificar cooldown
            last_alarm = self._get_last_alarm(rule_id)
            if last_alarm:
                time_since_last = datetime.now() - last_alarm['timestamp']
                if time_since_last.total_seconds() < rule.cooldown_minutes * 60:
                    continue
            
            # Avaliar condição
            if self._evaluate_alarm_condition(rule, tag_value):
                await self._trigger_alarm(rule, tag_value)

    def _evaluate_alarm_condition(self, rule: PLCAlarmRule, value: Any) -> bool:
        """Avaliar condição de alarme"""
        try:
            if rule.condition == "==":
                return value == rule.threshold_value
            elif rule.condition == "!=":
                return value != rule.threshold_value
            elif rule.condition == ">":
                return value > rule.threshold_value
            elif rule.condition == "<":
                return value < rule.threshold_value
            elif rule.condition == ">=":
                return value >= rule.threshold_value
            elif rule.condition == "<=":
                return value <= rule.threshold_value
            else:
                logger.warning(f"Unknown condition: {rule.condition}")
                return False
        except Exception as e:
            logger.error(f"Error evaluating alarm condition: {e}")
            return False

    async def _trigger_alarm(self, rule: PLCAlarmRule, value: Any):
        """Disparar alarme"""
        alarm_data = {
            'id': f"plc_alarm_{rule.id}_{int(datetime.now().timestamp())}",
            'rule_id': rule.id,
            'rule_name': rule.name,
            'tag_name': rule.tag_name,
            'value': value,
            'threshold': rule.threshold_value,
            'condition': rule.condition,
            'message': rule.message.format(value=value),
            'priority': rule.priority,
            'timestamp': datetime.now()
        }
        
        # Adicionar ao histórico
        self.alarm_history.append(alarm_data)
        
        # Limitar histórico
        if len(self.alarm_history) > 1000:
            self.alarm_history = self.alarm_history[-500:]
        
        logger.warning(f"PLC Alarm triggered: {alarm_data['message']}")
        
        # Notificar callbacks
        await self._notify_alarm_callbacks(alarm_data)

    def _get_last_alarm(self, rule_id: str) -> Optional[Dict]:
        """Obter último alarme de uma regra"""
        for alarm in reversed(self.alarm_history):
            if alarm['rule_id'] == rule_id:
                return alarm
        return None

    async def _notify_alarm_callbacks(self, alarm_data: Dict):
        """Notificar callbacks de alarme"""
        callbacks = self.event_callbacks.get('alarm', [])
        for callback in callbacks:
            try:
                await callback(alarm_data)
            except Exception as e:
                logger.error(f"Error in alarm callback: {e}")

    async def _cleanup_connections(self):
        """Limpar conexões inativas"""
        current_time = datetime.now()
        inactive_connections = []
        
        for device_id, connection in self.connections.items():
            last_used = connection.get('last_used', current_time)
            if (current_time - last_used).total_seconds() > 300:  # 5 minutos
                inactive_connections.append(device_id)
        
        for device_id in inactive_connections:
            await self._disconnect_device(device_id)

    async def _disconnect_device(self, device_id: str):
        """Desconectar dispositivo"""
        connection = self.connections.get(device_id)
        if not connection:
            return
            
        try:
            # Fechar conexão específica do protocolo
            if connection['type'] == 'modbus_tcp':
                socket_conn = connection.get('socket')
                if socket_conn:
                    socket_conn.close()
            elif connection['type'] == 'siemens_s7':
                s7_client = connection.get('client') 
                if s7_client:
                    # s7_client.disconnect() # snap7
                    pass
            
            del self.connections[device_id]
            logger.info(f"Disconnected from PLC {device_id}")
            
        except Exception as e:
            logger.error(f"Error disconnecting from PLC {device_id}: {e}")

    async def write_tag(self, device_id: str, tag_name: str, value: Any) -> bool:
        """Escrever valor em tag PLC"""
        tag = self.tags.get(tag_name)
        if not tag:
            logger.error(f"Tag {tag_name} not found")
            return False
            
        if 'W' not in tag.access_mode:
            logger.error(f"Tag {tag_name} is read-only")
            return False
        
        connection = self.connections.get(device_id)
        if not connection or not connection.get('connected'):
            logger.error(f"No connection to device {device_id}")
            return False
        
        try:
            device = connection['device']
            
            if device.protocol == PLCProtocol.MODBUS_TCP:
                success = await self._write_modbus_tag(connection, tag, value)
            elif device.protocol == PLCProtocol.SIEMENS_S7:
                success = await self._write_s7_tag(connection, tag, value)
            else:
                logger.warning(f"Writing not implemented for protocol {device.protocol.value}")
                return False
            
            if success:
                connection['last_used'] = datetime.now()
                logger.info(f"Wrote value {value} to tag {tag_name}")
                
                # Atualizar cache local
                self.tag_values[tag_name] = value
                self.tag_timestamps[tag_name] = datetime.now()
            
            return success
            
        except Exception as e:
            logger.error(f"Error writing tag {tag_name}: {e}")
            return False

    async def _write_modbus_tag(self, connection: Dict, tag: PLCTag, value: Any) -> bool:
        """Escrever tag Modbus"""
        # Simular escrita Modbus
        # TODO: Implementar escrita real com pymodbus
        logger.debug(f"Simulating Modbus write: {tag.name} = {value}")
        return True

    async def _write_s7_tag(self, connection: Dict, tag: PLCTag, value: Any) -> bool:
        """Escrever tag Siemens S7"""
        # Simular escrita S7
        # TODO: Implementar escrita real com snap7
        logger.debug(f"Simulating S7 write: {tag.name} = {value}")
        return True

    async def execute_action(self, action_id: str, context: Dict = None) -> bool:
        """Executar ação PLC"""
        action = self.actions.get(action_id)
        if not action or not action.is_enabled:
            return False
        
        logger.info(f"Executing PLC action: {action.name}")
        
        # Aplicar delay se configurado
        if action.delay_seconds > 0:
            await asyncio.sleep(action.delay_seconds)
        
        # Executar escrita no tag
        success = await self.write_tag(
            action.device_id,
            action.tag_name, 
            action.action_value
        )
        
        if success:
            logger.info(f"PLC action {action.name} executed successfully")
        else:
            logger.error(f"Failed to execute PLC action {action.name}")
        
        return success

    async def handle_aios_event(self, event_type: str, event_data: Dict):
        """Processar evento do AIOS e executar ações correspondentes"""
        relevant_actions = [
            action for action in self.actions.values()
            if action.is_enabled and action.trigger_event == event_type
        ]
        
        if not relevant_actions:
            return
        
        logger.info(f"Processing AIOS event {event_type}, {len(relevant_actions)} actions to execute")
        
        # Executar ações em paralelo
        tasks = []
        for action in relevant_actions:
            task = asyncio.create_task(
                self.execute_action(action.id, event_data)
            )
            tasks.append(task)
        
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            success_count = sum(1 for r in results if r is True)
            logger.info(f"Executed {success_count}/{len(tasks)} PLC actions for event {event_type}")

    def register_event_callback(self, event_type: str, callback: Callable):
        """Registrar callback para eventos PLC"""
        if event_type not in self.event_callbacks:
            self.event_callbacks[event_type] = []
        self.event_callbacks[event_type].append(callback)

    def get_tag_value(self, tag_name: str) -> Optional[Any]:
        """Obter valor atual de um tag"""
        return self.tag_values.get(tag_name)

    def get_tag_timestamp(self, tag_name: str) -> Optional[datetime]:
        """Obter timestamp da última leitura de um tag"""
        return self.tag_timestamps.get(tag_name)

    def get_device_status(self, device_id: str) -> Dict[str, Any]:
        """Obter status de um dispositivo"""
        device = self.devices.get(device_id)
        if not device:
            return {'error': 'Device not found'}
        
        connection = self.connections.get(device_id)
        is_connected = connection and connection.get('connected', False)
        
        return {
            'id': device.id,
            'name': device.name,
            'protocol': device.protocol.value,
            'ip_address': device.ip_address,
            'port': device.port,
            'is_active': device.is_active,
            'is_connected': is_connected,
            'last_communication': device.last_communication.isoformat() if device.last_communication else None
        }

    def get_alarm_history(self, limit: int = 100) -> List[Dict]:
        """Obter histórico de alarmes"""
        return self.alarm_history[-limit:]

    def get_system_stats(self) -> Dict[str, Any]:
        """Obter estatísticas do sistema PLC"""
        total_devices = len(self.devices)
        connected_devices = len([d for d in self.connections.values() if d.get('connected')])
        total_tags = len(self.tags)
        active_alarms = len([r for r in self.alarm_rules.values() if r.is_enabled])
        active_actions = len([a for a in self.actions.values() if a.is_enabled])
        
        return {
            'total_devices': total_devices,
            'connected_devices': connected_devices,
            'connection_rate': (connected_devices / total_devices * 100) if total_devices > 0 else 0,
            'total_tags': total_tags,
            'active_alarms': active_alarms,
            'active_actions': active_actions,
            'alarm_history_count': len(self.alarm_history),
            'monitoring_interval': self.monitoring_interval
        }

    async def shutdown(self):
        """Encerrar serviço PLC"""
        logger.info("Shutting down PLC Communication Service")
        
        # Cancelar monitoramento
        if self.monitoring_task and not self.monitoring_task.done():
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        # Desconectar todos os dispositivos
        disconnect_tasks = []
        for device_id in list(self.connections.keys()):
            task = asyncio.create_task(self._disconnect_device(device_id))
            disconnect_tasks.append(task)
        
        if disconnect_tasks:
            await asyncio.gather(*disconnect_tasks, return_exceptions=True)
        
        logger.info("PLC Communication Service shut down")
