// Constantes da aplicação conforme Design System do manual

export const COLORS = {
  primary: {
    orange: '#FF6B35',
    orangeHover: '#E55A2B',
  },
  gray: {
    dark: '#2D2D2D',
    medium: '#3A3A3A',
    light: '#F5F5F5',
  },
  status: {
    success: '#4CAF50',
    error: '#F44336',
    info: '#2196F3',
    warning: '#FFC107',
  },
  visualization: {
    pipeline: '#4A90E2',
    detection: '#7ED321',
    analytics: '#9013FE',
  }
} as const;

export const SPACING = {
  padding: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  margin: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  }
} as const;

export const TYPOGRAPHY = {
  sizes: {
    title: '24px-32px',
    subtitle: '18px-20px',
    body: '14px-16px',
    label: '12px-14px',
  },
  weights: {
    title: 600,
    subtitle: 500,
    body: 400,
    label: 500,
  }
} as const;

export const SIDEBAR = {
  width: {
    collapsed: '80px',
    expanded: '240px',
  },
  background: COLORS.gray.dark,
  iconSize: '24px',
  hoverEffect: COLORS.gray.medium,
  transition: '0.3s',
} as const;

export const DEVICE_STATUS = {
  ON: 'ON',
  OFF: 'OFF',
  WARNING: 'WARNING',
} as const;

export const NODE_CATEGORIES = {
  INPUT: 'input',
  DETECTION: 'detection',
  LOGIC: 'logic',
  ACTION: 'action',
} as const;

export const API_ENDPOINTS = {
  FLEET: '/api/fleet',
  PIPELINES: '/api/pipelines',
  AUTH: '/api/auth',
  WEBSOCKET: '/ws',
} as const;
