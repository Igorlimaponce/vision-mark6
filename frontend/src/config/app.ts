// Configurações específicas da aplicação conforme manual seção 10

export const APP_CONFIG = {
  name: 'AIOS v2.0',
  version: '2.0.0',
  description: 'Sistema de Controle de Operações de IA',
  author: 'Vision Corporation',
  
  // Configurações de WebSocket conforme seção 7.2
  websocket: {
    url: import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
  },
  
  // Configurações de API conforme seção 6
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  
  // Configurações de dispositivos conforme seção 8
  fleet: {
    maxDevicesPerPage: 20,
    statusUpdateInterval: 5000,
    healthCheckInterval: 60000,
    offlineThreshold: 120000, // 2 minutos
  },
  
  // Configurações de pipeline conforme seção 4
  pipeline: {
    maxNodesPerPipeline: 50,
    autoSaveInterval: 30000,
    executionTimeout: 300000, // 5 minutos
    maxConnections: 100,
  },
  
  // Configurações de dashboard conforme seção 5
  dashboard: {
    refreshInterval: 10000,
    maxWidgets: 12,
    chartAnimationDuration: 750,
    dataRetentionDays: 30,
  },
  
  // Configurações de performance conforme seção 13
  performance: {
    lazyLoadingThreshold: 500,
    virtualScrollingThreshold: 100,
    debounceDelay: 300,
    throttleDelay: 100,
  },
  
  // Configurações de segurança conforme seção 14
  security: {
    tokenExpirationTime: 3600000, // 1 hora
    refreshTokenExpirationTime: 86400000, // 24 horas
    maxLoginAttempts: 5,
    lockoutDuration: 900000, // 15 minutos
  },
  
  // Configurações de logging conforme seção 15
  logging: {
    level: import.meta.env.VITE_LOG_LEVEL || 'info',
    maxLogEntries: 1000,
    enableConsoleLogging: import.meta.env.NODE_ENV === 'development',
    enableRemoteLogging: import.meta.env.NODE_ENV === 'production',
  },
} as const;

export const FEATURE_FLAGS = {
  enablePipelineBuilder: true,
  enableRealTimeAnalytics: true,
  enableAdvancedFiltering: true,
  enableBulkOperations: true,
  enableExportFeatures: true,
  enableNotifications: true,
} as const;
