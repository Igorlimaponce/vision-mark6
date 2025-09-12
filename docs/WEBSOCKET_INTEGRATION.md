# WebSocket Integration - Sistema de Pipelines CV

## Visão Geral

Este documento descreve a integração WebSocket implementada para monitoramento em tempo real dos pipelines de Computer Vision.

## Arquitetura

### Backend

#### 1. Pipeline WebSocket Service (`backend/app/services/pipeline_websocket.py`)
- **Função**: Integra o PipelineManager com o sistema WebSocket
- **Responsabilidades**:
  - Registrar callbacks no PipelineManager
  - Converter eventos do pipeline em mensagens WebSocket
  - Transmitir atualizações para clientes conectados

#### 2. WebSocket Connection Manager (existente)
- **Função**: Gerencia conexões WebSocket ativas
- **Responsabilidades**:
  - Manter lista de clientes conectados
  - Broadcast de mensagens para clientes específicos
  - Gerenciar autenticação via WebSocket

### Frontend

#### 1. useWebSocket Hook (`frontend/src/hooks/useWebSocket.ts`)
- **Função**: Hook React para comunicação WebSocket
- **Funcionalidades**:
  - Conexão/desconexão automática
  - Callbacks tipados para diferentes tipos de eventos
  - Reconexão automática em caso de falha

#### 2. PipelineMonitor Component (`frontend/src/components/pipeline/PipelineMonitor.tsx`)
- **Função**: Componente de monitoramento em tempo real
- **Melhorias**:
  - Substituição de polling por WebSocket
  - Atualizações instantâneas de status
  - Monitoramento de FPS e métricas em tempo real

## Tipos de Mensagens WebSocket

### 1. Pipeline Status Update
```typescript
interface PipelineStatusUpdate {
  pipeline_id: string;
  status: string;
  detailed_status?: {
    stats: ExecutionStats;
    nodes: Record<string, any>;
    error_message?: string;
    last_frame_time?: number;
  };
}
```

### 2. Pipeline Frame Update
```typescript
interface PipelineFrameUpdate {
  pipeline_id: string;
  frame_data: {
    frame_id: number;
    timestamp: number;
    detections_count: number;
    processing_time: number;
    fps: number;
    node_results: Record<string, any>;
  };
}
```

### 3. Pipeline Analytics Update
```typescript
interface PipelineAnalyticsUpdate {
  pipeline_id: string;
  analytics: {
    node_id: string;
    node_type: string;
    people_count?: number;
    trend?: string;
    new_crossings?: number;
    total_crossings?: number;
    new_intrusions?: number;
    active_zones?: number;
    results: any;
  };
}
```

### 4. Pipeline Error Update
```typescript
interface PipelineErrorUpdate {
  pipeline_id: string;
  error_message: string;
  severity: string;
}
```

## Fluxo de Dados

1. **Pipeline Execution**: PipelineExecutor executa nós do pipeline
2. **Callback Triggers**: PipelineManager dispara callbacks registrados
3. **WebSocket Service**: PipelineWebSocketService recebe callbacks e formata mensagens
4. **Broadcast**: ConnectionManager envia mensagens para clientes conectados
5. **Frontend Updates**: useWebSocket hook recebe mensagens e dispara callbacks
6. **UI Updates**: Componentes React atualizam interface em tempo real

## Vantagens da Implementação

### Tempo Real
- Atualizações instantâneas sem polling
- Redução significativa na latência
- Melhor experiência do usuário

### Performance
- Menor uso de recursos (CPU/rede)
- Eliminação de requisições HTTP desnecessárias
- Atualizações apenas quando necessário

### Escalabilidade
- Suporte a múltiplos clientes simultâneos
- Arquitetura desacoplada e modular
- Fácil extensão para novos tipos de eventos

## Uso no Frontend

### Conectar ao WebSocket
```typescript
const {
  isConnected,
  connect,
  onPipelineStatusUpdate,
  onPipelineFrameUpdate,
  onPipelineError,
  onPipelineAnalytics
} = useWebSocket();

// Conectar
useEffect(() => {
  connect();
}, [connect]);
```

### Registrar Callbacks
```typescript
// Status updates
const unsubscribeStatus = onPipelineStatusUpdate((data) => {
  if (data.pipeline_id === currentPipelineId) {
    updatePipelineStatus(data);
  }
});

// Frame updates para FPS
const unsubscribeFrame = onPipelineFrameUpdate((data) => {
  if (data.pipeline_id === currentPipelineId) {
    updateFPSMetrics(data.frame_data);
  }
});

// Cleanup
return () => {
  unsubscribeStatus();
  unsubscribeFrame();
};
```

## Configuração de Inicialização

### Backend Main App
```python
@app.on_event("startup")
async def startup_event():
    logger.info("Inicializando aplicação...")
    
    # Inicializar serviço WebSocket para pipelines
    pipeline_websocket_service.initialize()
    
    logger.info("Aplicação inicializada com sucesso!")
```

## Monitoramento e Debug

### Logs Backend
- Callbacks do PipelineManager são logados
- Mensagens WebSocket são registradas
- Erros de conexão são capturados

### Debug Frontend
- Estado da conexão disponível via `isConnected`
- Última mensagem acessível via `lastMessage`
- Status da conexão via `connectionStatus`

## Próximos Passos

1. **Testes Automatizados**: Implementar testes para integração WebSocket
2. **Métricas Avançadas**: Adicionar mais tipos de analytics
3. **Alertas**: Sistema de notificações baseado em eventos
4. **Histórico**: Armazenar histórico de eventos para análise
5. **Dashboard**: Painel centralizado para monitoramento de múltiplos pipelines

## Troubleshooting

### Problemas Comuns

1. **Conexão não estabelecida**
   - Verificar se o servidor WebSocket está rodando
   - Confirmar autenticação do usuário
   - Checar configuração de URLs

2. **Callbacks não disparando**
   - Verificar se PipelineWebSocketService foi inicializado
   - Confirmar se callbacks foram registrados corretamente
   - Checar logs do backend para erros

3. **Performance issues**
   - Monitorar frequência de mensagens
   - Implementar throttling se necessário
   - Otimizar payload das mensagens
