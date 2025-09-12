# Sistema de Notificações Kanban para AIOS
# Integração com ferramentas como Trello, Asana, Monday.com para criar tasks de alertas

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import os
import requests
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

class KanbanProvider(Enum):
    """Provedores de Kanban suportados"""
    TRELLO = "trello"
    ASANA = "asana"
    MONDAY = "monday"
    JIRA = "jira"

class TaskPriority(Enum):
    """Prioridades de task"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TaskStatus(Enum):
    """Status das tasks"""
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"

@dataclass
class KanbanBoard:
    """Configuração de board Kanban"""
    provider: KanbanProvider
    board_id: str
    board_name: str
    list_ids: Dict[TaskStatus, str]  # Mapeamento status -> list_id
    is_active: bool = True

@dataclass
class KanbanTask:
    """Task do Kanban criada pelo AIOS"""
    id: Optional[str]
    title: str
    description: str
    priority: TaskPriority
    status: TaskStatus
    board_id: str
    assignee: Optional[str] = None
    due_date: Optional[datetime] = None
    labels: List[str] = None
    alert_id: Optional[str] = None
    device_id: Optional[str] = None
    created_at: datetime = None
    
    def __post_init__(self):
        if self.labels is None:
            self.labels = []
        if self.created_at is None:
            self.created_at = datetime.now()

class KanbanNotificationService:
    """Serviço de notificações Kanban integrado com AIOS"""
    
    def __init__(self):
        # Configurações por provider
        self.providers_config = {
            KanbanProvider.TRELLO: {
                'api_key': os.getenv('TRELLO_API_KEY'),
                'token': os.getenv('TRELLO_TOKEN'),
                'base_url': 'https://api.trello.com/1'
            },
            KanbanProvider.ASANA: {
                'access_token': os.getenv('ASANA_ACCESS_TOKEN'),
                'base_url': 'https://app.asana.com/api/1.0'
            },
            KanbanProvider.MONDAY: {
                'api_key': os.getenv('MONDAY_API_KEY'),
                'base_url': 'https://api.monday.com/v2'
            },
            KanbanProvider.JIRA: {
                'username': os.getenv('JIRA_USERNAME'),
                'api_token': os.getenv('JIRA_API_TOKEN'),
                'base_url': os.getenv('JIRA_BASE_URL', 'https://your-domain.atlassian.net')
            }
        }
        
        # Boards configurados
        self.boards: Dict[str, KanbanBoard] = {}
        
        # Cache de tasks criadas
        self.created_tasks: Dict[str, KanbanTask] = {}
        
        # Templates de tasks por tipo de alerta
        self.task_templates = {
            'intrusion': {
                'title': '🚨 Intrusão Detectada - {device_name}',
                'description': 'Pessoa não autorizada detectada em {location}\n\nDetalhes:\n- Dispositivo: {device_name}\n- Horário: {timestamp}\n- Confiança: {confidence}%\n\nAção necessária: Verificar imediatamente',
                'priority': TaskPriority.URGENT,
                'labels': ['segurança', 'intrusão', 'urgente']
            },
            'abandoned_object': {
                'title': '📦 Objeto Abandonado - {device_name}',
                'description': 'Objeto abandonado detectado em {location}\n\nDetalhes:\n- Dispositivo: {device_name}\n- Horário: {timestamp}\n- Tempo: {duration} minutos\n\nAção necessária: Investigar e remover se necessário',
                'priority': TaskPriority.HIGH,
                'labels': ['segurança', 'objeto-abandonado']
            },
            'system_error': {
                'title': '❌ Erro no Sistema - {device_name}',
                'description': 'Erro detectado no sistema de monitoramento\n\nDetalhes:\n- Dispositivo: {device_name}\n- Erro: {error_message}\n- Horário: {timestamp}\n\nAção necessária: Verificar e corrigir problema',
                'priority': TaskPriority.HIGH,
                'labels': ['sistema', 'erro', 'manutenção']
            },
            'maintenance': {
                'title': '🔧 Manutenção Necessária - {device_name}',
                'description': 'Manutenção preventiva ou corretiva necessária\n\nDetalhes:\n- Dispositivo: {device_name}\n- Tipo: {maintenance_type}\n- Prioridade: {priority}\n\nAção necessária: Agendar manutenção',
                'priority': TaskPriority.MEDIUM,
                'labels': ['manutenção', 'preventiva']
            }
        }

    async def initialize(self):
        """Inicializar o serviço"""
        await self._load_boards()
        await self._test_connections()
        logger.info("Kanban Notification Service initialized")

    async def _load_boards(self):
        """Carregar configuração dos boards"""
        # TODO: Carregar do banco de dados
        # Por enquanto, configuração mock
        mock_boards = [
            KanbanBoard(
                provider=KanbanProvider.TRELLO,
                board_id="board_123",
                board_name="AIOS - Alertas de Segurança",
                list_ids={
                    TaskStatus.TODO: "list_todo_123",
                    TaskStatus.IN_PROGRESS: "list_progress_123", 
                    TaskStatus.REVIEW: "list_review_123",
                    TaskStatus.DONE: "list_done_123"
                }
            )
        ]
        
        for board in mock_boards:
            self.boards[board.board_id] = board
            
        logger.info(f"Loaded {len(self.boards)} Kanban boards")

    async def _test_connections(self):
        """Testar conexões com provedores configurados"""
        for provider, config in self.providers_config.items():
            if self._is_provider_configured(provider):
                try:
                    success = await self._test_provider_connection(provider)
                    if success:
                        logger.info(f"{provider.value} connection: OK")
                    else:
                        logger.warning(f"{provider.value} connection: FAILED")
                except Exception as e:
                    logger.error(f"Error testing {provider.value}: {e}")

    def _is_provider_configured(self, provider: KanbanProvider) -> bool:
        """Verificar se provider está configurado"""
        config = self.providers_config[provider]
        
        if provider == KanbanProvider.TRELLO:
            return bool(config['api_key'] and config['token'])
        elif provider == KanbanProvider.ASANA:
            return bool(config['access_token'])
        elif provider == KanbanProvider.MONDAY:
            return bool(config['api_key'])
        elif provider == KanbanProvider.JIRA:
            return bool(config['username'] and config['api_token'])
        
        return False

    async def _test_provider_connection(self, provider: KanbanProvider) -> bool:
        """Testar conexão com provider específico"""
        try:
            if provider == KanbanProvider.TRELLO:
                return await self._test_trello_connection()
            elif provider == KanbanProvider.ASANA:
                return await self._test_asana_connection()
            elif provider == KanbanProvider.MONDAY:
                return await self._test_monday_connection()
            elif provider == KanbanProvider.JIRA:
                return await self._test_jira_connection()
            
            return False
        except Exception as e:
            logger.error(f"Provider connection test failed: {e}")
            return False

    async def _test_trello_connection(self) -> bool:
        """Testar conexão com Trello"""
        config = self.providers_config[KanbanProvider.TRELLO]
        url = f"{config['base_url']}/members/me"
        params = {
            'key': config['api_key'],
            'token': config['token']
        }
        
        response = requests.get(url, params=params)
        return response.status_code == 200

    async def _test_asana_connection(self) -> bool:
        """Testar conexão com Asana"""
        config = self.providers_config[KanbanProvider.ASANA]
        url = f"{config['base_url']}/users/me"
        headers = {'Authorization': f'Bearer {config["access_token"]}'}
        
        response = requests.get(url, headers=headers)
        return response.status_code == 200

    async def _test_monday_connection(self) -> bool:
        """Testar conexão com Monday.com"""
        config = self.providers_config[KanbanProvider.MONDAY]
        url = config['base_url']
        headers = {'Authorization': config['api_key']}
        query = '{ me { id name } }'
        
        response = requests.post(url, json={'query': query}, headers=headers)
        return response.status_code == 200

    async def _test_jira_connection(self) -> bool:
        """Testar conexão com Jira"""
        config = self.providers_config[KanbanProvider.JIRA]
        url = f"{config['base_url']}/rest/api/3/myself"
        auth = (config['username'], config['api_token'])
        
        response = requests.get(url, auth=auth)
        return response.status_code == 200

    async def create_task_from_alert(
        self,
        alert_type: str,
        alert_data: Dict[str, Any],
        board_id: str = None,
        assignee: str = None
    ) -> Optional[KanbanTask]:
        """Criar task no Kanban baseada em alerta do AIOS"""
        
        if not board_id:
            # Usar primeiro board ativo
            active_boards = [b for b in self.boards.values() if b.is_active]
            if not active_boards:
                logger.warning("No active Kanban boards configured")
                return None
            board_id = active_boards[0].board_id

        board = self.boards.get(board_id)
        if not board:
            logger.error(f"Board {board_id} not found")
            return None

        # Obter template
        template = self.task_templates.get(alert_type)
        if not template:
            logger.warning(f"No template found for alert type: {alert_type}")
            template = {
                'title': f'Alerta AIOS - {alert_type}',
                'description': f'Alerta do tipo {alert_type} detectado',
                'priority': TaskPriority.MEDIUM,
                'labels': ['aios', alert_type]
            }

        # Formatar com dados do alerta  
        try:
            title = template['title'].format(**alert_data)
            description = template['description'].format(**alert_data)
        except KeyError as e:
            logger.warning(f"Missing template variable {e}, using raw template")
            title = template['title']
            description = template['description']

        # Criar task
        task = KanbanTask(
            id=None,
            title=title,
            description=description,
            priority=template['priority'],
            status=TaskStatus.TODO,
            board_id=board_id,
            assignee=assignee,
            labels=template['labels'].copy(),
            alert_id=alert_data.get('alert_id'),
            device_id=alert_data.get('device_id')
        )
        
        # Adicionar labels específicas do alerta
        if alert_data.get('device_name'):
            task.labels.append(f"device:{alert_data['device_name']}")
        if alert_data.get('location'):
            task.labels.append(f"local:{alert_data['location']}")

        # Criar task no provider
        created_task = await self._create_task_in_provider(task, board)
        
        if created_task:
            self.created_tasks[created_task.id] = created_task
            logger.info(f"Created Kanban task: {created_task.title}")
            return created_task
        
        return None

    async def _create_task_in_provider(self, task: KanbanTask, board: KanbanBoard) -> Optional[KanbanTask]:
        """Criar task no provider específico"""
        try:
            if board.provider == KanbanProvider.TRELLO:
                return await self._create_trello_card(task, board)
            elif board.provider == KanbanProvider.ASANA:
                return await self._create_asana_task(task, board)
            elif board.provider == KanbanProvider.MONDAY:
                return await self._create_monday_item(task, board)
            elif board.provider == KanbanProvider.JIRA:
                return await self._create_jira_issue(task, board)
            
            return None
        except Exception as e:
            logger.error(f"Error creating task in {board.provider.value}: {e}")
            return None

    async def _create_trello_card(self, task: KanbanTask, board: KanbanBoard) -> Optional[KanbanTask]:
        """Criar card no Trello"""
        config = self.providers_config[KanbanProvider.TRELLO]
        list_id = board.list_ids.get(task.status)
        
        if not list_id:
            logger.error(f"No list ID found for status {task.status}")
            return None

        url = f"{config['base_url']}/cards"
        params = {
            'key': config['api_key'],
            'token': config['token'],
            'idList': list_id,
            'name': task.title,
            'desc': task.description
        }
        
        # Adicionar labels se existirem
        if task.labels:
            # TODO: Criar/encontrar labels no Trello
            pass
        
        response = requests.post(url, params=params)
        
        if response.status_code == 200:
            card_data = response.json()
            task.id = card_data['id']
            return task
        else:
            logger.error(f"Failed to create Trello card: {response.status_code}")
            return None

    async def _create_asana_task(self, task: KanbanTask, board: KanbanBoard) -> Optional[KanbanTask]:
        """Criar task no Asana"""
        config = self.providers_config[KanbanProvider.ASANA]
        
        url = f"{config['base_url']}/tasks"
        headers = {
            'Authorization': f'Bearer {config["access_token"]}',
            'Content-Type': 'application/json'
        }
        
        # Mapear prioridade
        priority_map = {
            TaskPriority.LOW: None,
            TaskPriority.MEDIUM: None,
            TaskPriority.HIGH: 'high',
            TaskPriority.URGENT: 'high'
        }
        
        data = {
            'data': {
                'name': task.title,
                'notes': task.description,
                'projects': [board.board_id],
                'priority': priority_map.get(task.priority)
            }
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 201:
            task_data = response.json()['data']
            task.id = task_data['gid']
            return task
        else:
            logger.error(f"Failed to create Asana task: {response.status_code}")
            return None

    async def _create_monday_item(self, task: KanbanTask, board: KanbanBoard) -> Optional[KanbanTask]:
        """Criar item no Monday.com"""
        config = self.providers_config[KanbanProvider.MONDAY]
        
        url = config['base_url']
        headers = {
            'Authorization': config['api_key'],
            'Content-Type': 'application/json'
        }
        
        # Escapar aspas na descrição
        escaped_description = task.description.replace('"', '\\"')
        
        query = f'''
        mutation {{
            create_item (
                board_id: {board.board_id},
                item_name: "{task.title}",
                column_values: "{{
                    \\"text\\": \\"{escaped_description}\\"
                }}"
            ) {{
                id
                name
            }}
        }}
        '''
        
        response = requests.post(url, json={'query': query}, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            if 'data' in result and 'create_item' in result['data']:
                item_data = result['data']['create_item']
                task.id = item_data['id']
                return task
        
        logger.error(f"Failed to create Monday.com item: {response.status_code}")
        return None

    async def _create_jira_issue(self, task: KanbanTask, board: KanbanBoard) -> Optional[KanbanTask]:
        """Criar issue no Jira"""
        config = self.providers_config[KanbanProvider.JIRA]
        
        url = f"{config['base_url']}/rest/api/3/issue"
        auth = (config['username'], config['api_token'])
        headers = {'Content-Type': 'application/json'}
        
        # Mapear prioridade
        priority_map = {
            TaskPriority.LOW: 'Low',
            TaskPriority.MEDIUM: 'Medium', 
            TaskPriority.HIGH: 'High',
            TaskPriority.URGENT: 'Highest'
        }
        
        data = {
            'fields': {
                'project': {'key': board.board_id},
                'summary': task.title,
                'description': {
                    'type': 'doc',
                    'version': 1,
                    'content': [
                        {
                            'type': 'paragraph',
                            'content': [
                                {
                                    'type': 'text',
                                    'text': task.description
                                }
                            ]
                        }
                    ]
                },
                'issuetype': {'name': 'Task'},
                'priority': {'name': priority_map.get(task.priority, 'Medium')}
            }
        }
        
        response = requests.post(url, auth=auth, headers=headers, json=data)
        
        if response.status_code == 201:
            issue_data = response.json()
            task.id = issue_data['key']
            return task
        else:
            logger.error(f"Failed to create Jira issue: {response.status_code}")
            return None

    async def update_task_status(self, task_id: str, new_status: TaskStatus) -> bool:
        """Atualizar status de uma task"""
        task = self.created_tasks.get(task_id)
        if not task:
            logger.warning(f"Task {task_id} not found in cache")
            return False

        board = self.boards.get(task.board_id)
        if not board:
            logger.error(f"Board {task.board_id} not found")
            return False

        try:
            success = await self._update_task_status_in_provider(task, board, new_status)
            if success:
                task.status = new_status
                logger.info(f"Updated task {task_id} status to {new_status.value}")
            return success
        except Exception as e:
            logger.error(f"Error updating task status: {e}")
            return False

    async def _update_task_status_in_provider(
        self, task: KanbanTask, board: KanbanBoard, new_status: TaskStatus
    ) -> bool:
        """Atualizar status no provider"""
        if board.provider == KanbanProvider.TRELLO:
            return await self._update_trello_card_list(task, board, new_status)
        # TODO: Implementar para outros providers
        return False

    async def _update_trello_card_list(
        self, task: KanbanTask, board: KanbanBoard, new_status: TaskStatus
    ) -> bool:
        """Mover card para lista diferente no Trello"""
        config = self.providers_config[KanbanProvider.TRELLO]
        new_list_id = board.list_ids.get(new_status)
        
        if not new_list_id:
            logger.error(f"No list ID found for status {new_status}")
            return False

        url = f"{config['base_url']}/cards/{task.id}"
        params = {
            'key': config['api_key'],
            'token': config['token'],
            'idList': new_list_id
        }
        
        response = requests.put(url, params=params)
        return response.status_code == 200

    async def get_task_stats(self) -> Dict[str, Any]:
        """Obter estatísticas das tasks criadas"""
        stats = {
            'total_tasks': len(self.created_tasks),
            'by_status': {},
            'by_priority': {},
            'by_board': {}
        }
        
        for task in self.created_tasks.values():
            # Por status
            status_key = task.status.value
            stats['by_status'][status_key] = stats['by_status'].get(status_key, 0) + 1
            
            # Por prioridade
            priority_key = task.priority.value
            stats['by_priority'][priority_key] = stats['by_priority'].get(priority_key, 0) + 1
            
            # Por board
            board = self.boards.get(task.board_id)
            board_name = board.board_name if board else task.board_id
            stats['by_board'][board_name] = stats['by_board'].get(board_name, 0) + 1
        
        return stats

    def get_active_boards(self) -> List[KanbanBoard]:
        """Obter boards ativos"""
        return [board for board in self.boards.values() if board.is_active]

    async def add_board(self, board: KanbanBoard) -> bool:
        """Adicionar novo board"""
        try:
            # Testar conexão
            if self._is_provider_configured(board.provider):
                connection_ok = await self._test_provider_connection(board.provider)
                if not connection_ok:
                    logger.error(f"Cannot connect to {board.provider.value}")
                    return False
            
            self.boards[board.board_id] = board
            # TODO: Salvar no banco de dados
            logger.info(f"Added Kanban board: {board.board_name}")
            return True
        except Exception as e:
            logger.error(f"Error adding board: {e}")
            return False

    async def remove_board(self, board_id: str) -> bool:
        """Remover board"""
        try:
            if board_id in self.boards:
                del self.boards[board_id]
                # TODO: Remover do banco de dados
                logger.info(f"Removed Kanban board: {board_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error removing board: {e}")
            return False
