// Configurações de autenticação conforme seção 14 do manual

export const AUTH_CONFIG = {
  // URLs de autenticação
  loginUrl: '/api/auth/login',
  logoutUrl: '/api/auth/logout',
  refreshUrl: '/api/auth/refresh',
  profileUrl: '/api/auth/profile',
  
  // Configurações de token
  tokenKey: 'aios_token',
  refreshTokenKey: 'aios_refresh_token',
  userKey: 'aios_user',
  
  // Configurações de sessão
  sessionTimeout: 3600000, // 1 hora
  refreshThreshold: 300000, // 5 minutos antes da expiração
  
  // Configurações de segurança
  maxLoginAttempts: 5,
  lockoutDuration: 900000, // 15 minutos
  
  // Roles e permissões conforme manual
  roles: {
    ADMIN: 'admin',
    OPERATOR: 'operator',
    VIEWER: 'viewer',
  },
  
  permissions: {
    // Fleet Management
    FLEET_VIEW: 'fleet:view',
    FLEET_EDIT: 'fleet:edit',
    FLEET_DELETE: 'fleet:delete',
    FLEET_CREATE: 'fleet:create',
    
    // Pipeline Management
    PIPELINE_VIEW: 'pipeline:view',
    PIPELINE_EDIT: 'pipeline:edit',
    PIPELINE_DELETE: 'pipeline:delete',
    PIPELINE_CREATE: 'pipeline:create',
    PIPELINE_EXECUTE: 'pipeline:execute',
    
    // Dashboard
    DASHBOARD_VIEW: 'dashboard:view',
    DASHBOARD_EDIT: 'dashboard:edit',
    
    // Analytics
    ANALYTICS_VIEW: 'analytics:view',
    ANALYTICS_EXPORT: 'analytics:export',
    
    // System
    SYSTEM_CONFIG: 'system:config',
    USER_MANAGEMENT: 'user:management',
  }
} as const;

// Mapeamento de roles para permissões
export const ROLE_PERMISSIONS = {
  [AUTH_CONFIG.roles.ADMIN]: [
    AUTH_CONFIG.permissions.FLEET_VIEW,
    AUTH_CONFIG.permissions.FLEET_EDIT,
    AUTH_CONFIG.permissions.FLEET_DELETE,
    AUTH_CONFIG.permissions.FLEET_CREATE,
    AUTH_CONFIG.permissions.PIPELINE_VIEW,
    AUTH_CONFIG.permissions.PIPELINE_EDIT,
    AUTH_CONFIG.permissions.PIPELINE_DELETE,
    AUTH_CONFIG.permissions.PIPELINE_CREATE,
    AUTH_CONFIG.permissions.PIPELINE_EXECUTE,
    AUTH_CONFIG.permissions.DASHBOARD_VIEW,
    AUTH_CONFIG.permissions.DASHBOARD_EDIT,
    AUTH_CONFIG.permissions.ANALYTICS_VIEW,
    AUTH_CONFIG.permissions.ANALYTICS_EXPORT,
    AUTH_CONFIG.permissions.SYSTEM_CONFIG,
    AUTH_CONFIG.permissions.USER_MANAGEMENT,
  ],
  [AUTH_CONFIG.roles.OPERATOR]: [
    AUTH_CONFIG.permissions.FLEET_VIEW,
    AUTH_CONFIG.permissions.FLEET_EDIT,
    AUTH_CONFIG.permissions.PIPELINE_VIEW,
    AUTH_CONFIG.permissions.PIPELINE_EDIT,
    AUTH_CONFIG.permissions.PIPELINE_CREATE,
    AUTH_CONFIG.permissions.PIPELINE_EXECUTE,
    AUTH_CONFIG.permissions.DASHBOARD_VIEW,
    AUTH_CONFIG.permissions.ANALYTICS_VIEW,
  ],
  [AUTH_CONFIG.roles.VIEWER]: [
    AUTH_CONFIG.permissions.FLEET_VIEW,
    AUTH_CONFIG.permissions.PIPELINE_VIEW,
    AUTH_CONFIG.permissions.DASHBOARD_VIEW,
    AUTH_CONFIG.permissions.ANALYTICS_VIEW,
  ],
} as const;
