# Sistema de Notificações WhatsApp para AIOS
# Integração com WhatsApp Business API para envio de alertas críticos

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import os
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Tipos de mensagem WhatsApp"""
    TEXT = "text"
    TEMPLATE = "template"
    IMAGE = "image"
    DOCUMENT = "document"

class AlertLevel(Enum):
    """Níveis de alerta para determinar quando enviar notificações"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class WhatsAppContact:
    """Contato do WhatsApp para notificações"""
    phone_number: str
    name: str
    alert_levels: List[AlertLevel]
    is_active: bool = True
    timezone: str = "America/Sao_Paulo"

@dataclass
class WhatsAppMessage:
    """Estrutura de mensagem WhatsApp"""
    recipient: str
    message_type: MessageType
    content: Union[str, Dict]
    template_name: Optional[str] = None
    template_params: Optional[List[str]] = None
    media_url: Optional[str] = None
    
class WhatsAppNotificationService:
    """Serviço de notificações WhatsApp integrado com AIOS"""
    
    def __init__(self):
        self.api_url = os.getenv('WHATSAPP_API_URL', 'https://graph.facebook.com/v18.0')
        self.access_token = os.getenv('WHATSAPP_ACCESS_TOKEN')
        self.phone_number_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID')
        self.business_account_id = os.getenv('WHATSAPP_BUSINESS_ACCOUNT_ID')
        
        # Configurações de rate limiting
        self.rate_limit = 100  # mensagens por minuto
        self.sent_messages = []
        
        # Contatos configurados
        self.contacts: Dict[str, WhatsAppContact] = {}
        
        # Templates pré-configurados
        self.templates = {
            'intrusion_alert': {
                'name': 'intrusion_alert',
                'params': ['device_name', 'location', 'timestamp']
            },
            'system_down': {
                'name': 'system_down', 
                'params': ['device_name', 'error_message']
            },
            'detection_summary': {
                'name': 'detection_summary',
                'params': ['total_detections', 'alert_count', 'period']
            }
        }
        
        if not all([self.access_token, self.phone_number_id]):
            logger.warning("WhatsApp API credentials not configured properly")

    async def initialize(self):
        """Inicializar o serviço e carregar configurações"""
        await self._load_contacts()
        await self._verify_webhook()
        logger.info("WhatsApp Notification Service initialized")

    async def _load_contacts(self):
        """Carregar contatos do banco de dados"""
        # TODO: Implementar carregamento do banco de dados
        # Por enquanto, usar configuração mock
        mock_contacts = [
            WhatsAppContact(
                phone_number="+5511999999999",
                name="Administrador Sistema",
                alert_levels=[AlertLevel.HIGH, AlertLevel.CRITICAL]
            ),
            WhatsAppContact(
                phone_number="+5511888888888", 
                name="Segurança",
                alert_levels=[AlertLevel.MEDIUM, AlertLevel.HIGH, AlertLevel.CRITICAL]
            ),
            WhatsAppContact(
                phone_number="+5511777777777",
                name="Operador",
                alert_levels=[AlertLevel.CRITICAL]
            )
        ]
        
        for contact in mock_contacts:
            self.contacts[contact.phone_number] = contact
            
        logger.info(f"Loaded {len(self.contacts)} WhatsApp contacts")

    async def _verify_webhook(self):
        """Verificar configuração do webhook"""
        try:
            url = f"{self.api_url}/{self.business_account_id}/subscribed_apps"
            headers = {'Authorization': f'Bearer {self.access_token}'}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.info("WhatsApp webhook verified successfully")
                        return True
                    else:
                        logger.warning(f"Webhook verification failed: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"Error verifying webhook: {e}")
            return False

    def _check_rate_limit(self) -> bool:
        """Verificar rate limiting"""
        now = datetime.now()
        # Remove mensagens antigas (mais de 1 minuto)
        self.sent_messages = [
            msg_time for msg_time in self.sent_messages 
            if now - msg_time < timedelta(minutes=1)
        ]
        
        return len(self.sent_messages) < self.rate_limit

    async def send_alert(
        self,
        alert_level: AlertLevel,
        title: str,
        message: str,
        device_name: str = None,
        location: str = None,
        image_url: str = None
    ) -> bool:
        """Enviar alerta via WhatsApp para contatos relevantes"""
        
        if not self._check_rate_limit():
            logger.warning("Rate limit exceeded, skipping WhatsApp notification")
            return False

        # Filtrar contatos baseado no nível do alerta
        relevant_contacts = [
            contact for contact in self.contacts.values()
            if contact.is_active and alert_level in contact.alert_levels
        ]
        
        if not relevant_contacts:
            logger.info(f"No contacts configured for alert level: {alert_level.value}")
            return True

        success_count = 0
        
        for contact in relevant_contacts:
            try:
                # Preparar mensagem
                formatted_message = self._format_alert_message(
                    title, message, device_name, location
                )
                
                # Enviar mensagem de texto
                text_sent = await self._send_text_message(
                    contact.phone_number, formatted_message
                )
                
                if text_sent:
                    success_count += 1
                    self.sent_messages.append(datetime.now())
                
                # Enviar imagem se disponível
                if image_url and text_sent:
                    await self._send_image_message(
                        contact.phone_number, image_url, "Captura do Evento"
                    )
                
                # Pequeno delay entre mensagens
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error sending WhatsApp alert to {contact.name}: {e}")

        logger.info(f"WhatsApp alert sent to {success_count}/{len(relevant_contacts)} contacts")
        return success_count > 0

    def _format_alert_message(
        self, title: str, message: str, device_name: str = None, location: str = None
    ) -> str:
        """Formatar mensagem de alerta"""
        timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        
        formatted = f"🚨 *AIOS - {title}*\n\n"
        formatted += f"📋 {message}\n\n"
        
        if device_name:
            formatted += f"📷 *Dispositivo:* {device_name}\n"
        
        if location:
            formatted += f"📍 *Local:* {location}\n"
            
        formatted += f"🕐 *Horário:* {timestamp}\n\n"
        formatted += "_Sistema AIOS de Monitoramento_"
        
        return formatted

    async def _send_text_message(self, recipient: str, message: str) -> bool:
        """Enviar mensagem de texto"""
        try:
            url = f"{self.api_url}/{self.phone_number_id}/messages"
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "text",
                "text": {"body": message}
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.debug(f"Text message sent successfully: {result}")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to send text message: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error sending text message: {e}")
            return False

    async def _send_image_message(self, recipient: str, image_url: str, caption: str = "") -> bool:
        """Enviar mensagem com imagem"""
        try:
            url = f"{self.api_url}/{self.phone_number_id}/messages"
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "image",
                "image": {
                    "link": image_url,
                    "caption": caption
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.debug(f"Image message sent successfully: {result}")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to send image message: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error sending image message: {e}")
            return False

    async def send_template_message(
        self, 
        recipient: str, 
        template_name: str, 
        parameters: List[str]
    ) -> bool:
        """Enviar mensagem usando template pré-aprovado"""
        try:
            url = f"{self.api_url}/{self.phone_number_id}/messages"
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            # Construir componentes do template
            components = [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": param} for param in parameters
                    ]
                }
            ]
            
            payload = {
                "messaging_product": "whatsapp",
                "to": recipient,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": "pt_BR"},
                    "components": components
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.debug(f"Template message sent successfully: {result}")
                        return True
                    else:
                        error_text = await response.text()
                        logger.error(f"Failed to send template message: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error sending template message: {e}")
            return False

    async def send_daily_summary(self, stats: Dict) -> bool:
        """Enviar resumo diário para administradores"""
        summary_contacts = [
            contact for contact in self.contacts.values()
            if contact.is_active and AlertLevel.LOW in contact.alert_levels
        ]
        
        if not summary_contacts:
            return True

        message = self._format_daily_summary(stats)
        success_count = 0
        
        for contact in summary_contacts:
            try:
                if await self._send_text_message(contact.phone_number, message):
                    success_count += 1
                    self.sent_messages.append(datetime.now())
                    
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error sending daily summary to {contact.name}: {e}")

        logger.info(f"Daily summary sent to {success_count}/{len(summary_contacts)} contacts")
        return success_count > 0

    def _format_daily_summary(self, stats: Dict) -> str:
        """Formatar mensagem de resumo diário"""
        date = datetime.now().strftime("%d/%m/%Y")
        
        message = f"📊 *AIOS - Resumo Diário {date}*\n\n"
        message += f"🔍 *Detecções:* {stats.get('total_detections', 0)}\n"
        message += f"⚠️ *Alertas:* {stats.get('total_alerts', 0)}\n"
        message += f"📷 *Câmeras Ativas:* {stats.get('active_cameras', 0)}\n"
        message += f"⏱️ *Uptime Sistema:* {stats.get('system_uptime', '0')}%\n\n"
        
        if stats.get('top_locations'):
            message += "*🏢 Locais com Mais Atividade:*\n"
            for location, count in stats['top_locations'][:3]:
                message += f"• {location}: {count} detecções\n"
            message += "\n"
        
        message += "_Sistema AIOS de Monitoramento_"
        
        return message

    async def handle_webhook(self, webhook_data: Dict) -> bool:
        """Processar webhook do WhatsApp"""
        try:
            # Processar mensagens recebidas, status de entrega, etc.
            entries = webhook_data.get('entry', [])
            
            for entry in entries:
                changes = entry.get('changes', [])
                for change in changes:
                    if change.get('field') == 'messages':
                        value = change.get('value', {})
                        
                        # Processar mensagens recebidas
                        messages = value.get('messages', [])
                        for message in messages:
                            await self._process_incoming_message(message)
                        
                        # Processar status de entrega
                        statuses = value.get('statuses', [])
                        for status in statuses:
                            await self._process_message_status(status)
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing WhatsApp webhook: {e}")
            return False

    async def _process_incoming_message(self, message: Dict):
        """Processar mensagem recebida"""
        from_number = message.get('from')
        message_type = message.get('type')
        
        logger.info(f"Received {message_type} message from {from_number}")
        
        # Aqui poderia implementar comandos como:
        # - "STATUS" para obter status do sistema
        # - "ALERTS" para obter alertas recentes
        # - "HELP" para ajuda
        
        if message_type == 'text':
            text_body = message.get('text', {}).get('body', '').upper().strip()
            
            if text_body == 'STATUS':
                await self._send_system_status(from_number)
            elif text_body == 'HELP':
                await self._send_help_message(from_number)

    async def _process_message_status(self, status: Dict):
        """Processar status de entrega da mensagem"""
        message_id = status.get('id')
        status_type = status.get('status')
        
        logger.debug(f"Message {message_id} status: {status_type}")

    async def _send_system_status(self, recipient: str):
        """Enviar status do sistema"""
        # TODO: Obter status real do sistema
        status_message = "✅ *AIOS - Status do Sistema*\n\n"
        status_message += "🟢 Sistema: Online\n"
        status_message += "📷 Câmeras: 8/10 ativas\n"
        status_message += "⚡ CPU: 45%\n"
        status_message += "💾 Memória: 62%\n"
        status_message += "🌐 Rede: Estável\n\n"
        status_message += f"🕐 Última atualização: {datetime.now().strftime('%H:%M:%S')}"
        
        await self._send_text_message(recipient, status_message)

    async def _send_help_message(self, recipient: str):
        """Enviar mensagem de ajuda"""
        help_message = "🤖 *AIOS - Comandos Disponíveis*\n\n"
        help_message += "• *STATUS* - Status do sistema\n"
        help_message += "• *HELP* - Esta mensagem\n\n"
        help_message += "_Mais comandos em breve..._"
        
        await self._send_text_message(recipient, help_message)

    async def add_contact(self, contact: WhatsAppContact) -> bool:
        """Adicionar novo contato"""
        try:
            self.contacts[contact.phone_number] = contact
            # TODO: Salvar no banco de dados
            logger.info(f"Added WhatsApp contact: {contact.name}")
            return True
        except Exception as e:
            logger.error(f"Error adding contact: {e}")
            return False

    async def remove_contact(self, phone_number: str) -> bool:
        """Remover contato"""
        try:
            if phone_number in self.contacts:
                del self.contacts[phone_number]
                # TODO: Remover do banco de dados
                logger.info(f"Removed WhatsApp contact: {phone_number}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error removing contact: {e}")
            return False

    def get_contacts(self) -> List[WhatsAppContact]:
        """Obter lista de contatos"""
        return list(self.contacts.values())

    async def test_connection(self) -> bool:
        """Testar conexão com API do WhatsApp"""
        try:
            # Enviar mensagem de teste para um número específico
            test_number = os.getenv('WHATSAPP_TEST_NUMBER')
            if not test_number:
                logger.warning("Test number not configured")
                return False
                
            test_message = "🧪 Teste de conexão AIOS - " + datetime.now().strftime("%H:%M:%S")
            
            return await self._send_text_message(test_number, test_message)
            
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False
