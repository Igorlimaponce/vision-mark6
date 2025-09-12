// Serviço de notificações conforme seção 16 do manual

import { toast } from 'react-hot-toast';
import { logger } from './logger';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class NotificationService {
  private defaultOptions: NotificationOptions = {
    duration: 4000,
    position: 'top-right',
    dismissible: true,
  };

  private getIcon(type: NotificationType): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  }

  private show(type: NotificationType, message: string, options?: NotificationOptions): string {
    const opts = { ...this.defaultOptions, ...options };
    const icon = this.getIcon(type);
    
    logger.info(`Notification shown: ${type}`, 'Notification', { message });

    let toastId: string;

    switch (type) {
      case 'success':
        toastId = toast.success(`${icon} ${message}`, {
          duration: opts.duration,
          position: opts.position,
        });
        break;
      case 'error':
        toastId = toast.error(`${icon} ${message}`, {
          duration: opts.duration,
          position: opts.position,
        });
        break;
      case 'warning':
        toastId = toast(`${icon} ${message}`, {
          duration: opts.duration,
          position: opts.position,
          style: {
            background: '#FFC107',
            color: '#000',
          },
        });
        break;
      case 'info':
      default:
        toastId = toast(`${icon} ${message}`, {
          duration: opts.duration,
          position: opts.position,
          style: {
            background: '#2196F3',
            color: '#fff',
          },
        });
        break;
    }

    return toastId;
  }

  success(message: string, options?: NotificationOptions): string {
    return this.show('success', message, options);
  }

  error(message: string, options?: NotificationOptions): string {
    return this.show('error', message, options);
  }

  warning(message: string, options?: NotificationOptions): string {
    return this.show('warning', message, options);
  }

  info(message: string, options?: NotificationOptions): string {
    return this.show('info', message, options);
  }

  dismiss(toastId: string): void {
    toast.dismiss(toastId);
  }

  dismissAll(): void {
    toast.dismiss();
  }

  // Notificações específicas do sistema
  deviceConnected(deviceId: string): void {
    this.success(`Dispositivo ${deviceId} conectado`);
  }

  deviceDisconnected(deviceId: string): void {
    this.warning(`Dispositivo ${deviceId} desconectado`);
  }

  pipelineStarted(pipelineName: string): void {
    this.info(`Pipeline "${pipelineName}" iniciado`);
  }

  pipelineStopped(pipelineName: string): void {
    this.warning(`Pipeline "${pipelineName}" parado`);
  }

  pipelineError(pipelineName: string, error: string): void {
    this.error(`Erro no pipeline "${pipelineName}": ${error}`);
  }

  dataSaved(): void {
    this.success('Dados salvos com sucesso');
  }

  dataLoadError(): void {
    this.error('Erro ao carregar dados');
  }

  unauthorizedAccess(): void {
    this.error('Acesso não autorizado');
  }

  sessionExpired(): void {
    this.warning('Sessão expirada. Faça login novamente.');
  }

  connectionLost(): void {
    this.error('Conexão perdida. Tentando reconectar...');
  }

  connectionRestored(): void {
    this.success('Conexão restaurada');
  }
}

export const notifications = new NotificationService();
