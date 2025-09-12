// Validações de entrada conforme seção 12 do manual

export const validateRequiredField = (value: string | undefined, fieldName: string): string | null => {
  if (!value || value.trim() === '') {
    return `${fieldName} é obrigatório`;
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email inválido';
  }
  return null;
};

export const validateUrl = (url: string): string | null => {
  try {
    new URL(url);
    return null;
  } catch {
    return 'URL inválida';
  }
};

export const validatePipelineName = (name: string): string | null => {
  if (name.length < 3) {
    return 'Nome deve ter pelo menos 3 caracteres';
  }
  if (name.length > 50) {
    return 'Nome deve ter no máximo 50 caracteres';
  }
  return null;
};

export const validateDeviceId = (deviceId: string): string | null => {
  const deviceIdRegex = /^[A-Z0-9-]+$/;
  if (!deviceIdRegex.test(deviceId)) {
    return 'ID do dispositivo deve conter apenas letras maiúsculas, números e hífens';
  }
  return null;
};

export const validatePort = (port: string): string | null => {
  const portNumber = parseInt(port);
  if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
    return 'Porta deve ser um número entre 1 e 65535';
  }
  return null;
};

export const validateConnections = (sourceId: string, targetId: string, existingConnections: any[]): string | null => {
  const duplicateConnection = existingConnections.find(
    conn => conn.source === sourceId && conn.target === targetId
  );
  
  if (duplicateConnection) {
    return 'Conexão já existe entre estes nós';
  }
  
  return null;
};
