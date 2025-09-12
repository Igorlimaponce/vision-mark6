// Página de Configurações conforme manual AIOS v2.0

import { useState } from 'react';
import { Settings, Save, Shield, Bell, Eye, EyeOff } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { AUTH_CONFIG } from '../config/auth';
import { notifications } from '../utils/notifications';

interface ConfigSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

// Componente de Configurações Gerais
const GeneralSettings = () => {
  const [config, setConfig] = useState({
    systemName: 'AIOS v2.0',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    theme: 'light',
    autoRefresh: true,
    refreshInterval: 30,
  });

  const handleSave = () => {
    notifications.success('Configurações gerais salvas com sucesso');
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações Gerais</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Sistema
          </label>
          <input
            type="text"
            value={config.systemName}
            onChange={(e) => setConfig(prev => ({ ...prev, systemName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fuso Horário
          </label>
          <select
            value={config.timezone}
            onChange={(e) => setConfig(prev => ({ ...prev, timezone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
            <option value="America/New_York">Nova York (GMT-5)</option>
            <option value="Europe/London">Londres (GMT+0)</option>
            <option value="Asia/Tokyo">Tóquio (GMT+9)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Idioma
          </label>
          <select
            value={config.language}
            onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English (US)</option>
            <option value="es-ES">Español</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Atualização Automática
            </label>
            <p className="text-xs text-gray-500">Atualizar dados automaticamente</p>
          </div>
          <input
            type="checkbox"
            checked={config.autoRefresh}
            onChange={(e) => setConfig(prev => ({ ...prev, autoRefresh: e.target.checked }))}
            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
          />
        </div>

        {config.autoRefresh && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intervalo de Atualização (segundos)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={config.refreshInterval}
              onChange={(e) => setConfig(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          Salvar Configurações
        </Button>
      </div>
    </Card>
  );
};

// Componente de Configurações de Segurança
const SecuritySettings = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [securityConfig, setSecurityConfig] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    passwordExpiry: 90,
  });

  const handlePasswordChange = () => {
    if (passwords.new !== passwords.confirm) {
      notifications.error('As senhas não coincidem');
      return;
    }
    notifications.success('Senha alterada com sucesso');
    setPasswords({ current: '', new: '', confirm: '' });
  };

  const handleSecuritySave = () => {
    notifications.success('Configurações de segurança salvas');
  };

  return (
    <div className="space-y-6">
      {/* Alteração de Senha */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alterar Senha</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha Atual
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwords.current}
                onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwords.new}
                onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={handlePasswordChange} className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Alterar Senha
          </Button>
        </div>
      </Card>

      {/* Configurações de Segurança */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Segurança</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Autenticação de Dois Fatores
              </label>
              <p className="text-xs text-gray-500">Adicionar camada extra de segurança</p>
            </div>
            <input
              type="checkbox"
              checked={securityConfig.twoFactorEnabled}
              onChange={(e) => setSecurityConfig(prev => ({ ...prev, twoFactorEnabled: e.target.checked }))}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeout de Sessão (minutos)
            </label>
            <input
              type="number"
              min="15"
              max="480"
              value={securityConfig.sessionTimeout}
              onChange={(e) => setSecurityConfig(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Máximo de Tentativas de Login
            </label>
            <input
              type="number"
              min="3"
              max="10"
              value={securityConfig.maxLoginAttempts}
              onChange={(e) => setSecurityConfig(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={handleSecuritySave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Salvar Configurações
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Componente de Configurações de Notificações
const NotificationSettings = () => {
  const [notificationConfig, setNotificationConfig] = useState({
    emailAlerts: true,
    pushNotifications: true,
    smsAlerts: false,
    alertTypes: {
      critical: true,
      warning: true,
      info: false,
    },
    emailAddress: 'user@example.com',
    phoneNumber: '',
  });

  const handleNotificationSave = () => {
    notifications.success('Configurações de notificação salvas');
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Notificação</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Alertas por Email
            </label>
            <p className="text-xs text-gray-500">Receber alertas via email</p>
          </div>
          <input
            type="checkbox"
            checked={notificationConfig.emailAlerts}
            onChange={(e) => setNotificationConfig(prev => ({ ...prev, emailAlerts: e.target.checked }))}
            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notificações Push
            </label>
            <p className="text-xs text-gray-500">Notificações no navegador</p>
          </div>
          <input
            type="checkbox"
            checked={notificationConfig.pushNotifications}
            onChange={(e) => setNotificationConfig(prev => ({ ...prev, pushNotifications: e.target.checked }))}
            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipos de Alerta
          </label>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={notificationConfig.alertTypes.critical}
                onChange={(e) => setNotificationConfig(prev => ({
                  ...prev,
                  alertTypes: { ...prev.alertTypes, critical: e.target.checked }
                }))}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mr-2"
              />
              <span className="text-sm text-gray-700">Críticos</span>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={notificationConfig.alertTypes.warning}
                onChange={(e) => setNotificationConfig(prev => ({
                  ...prev,
                  alertTypes: { ...prev.alertTypes, warning: e.target.checked }
                }))}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mr-2"
              />
              <span className="text-sm text-gray-700">Avisos</span>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={notificationConfig.alertTypes.info}
                onChange={(e) => setNotificationConfig(prev => ({
                  ...prev,
                  alertTypes: { ...prev.alertTypes, info: e.target.checked }
                }))}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mr-2"
              />
              <span className="text-sm text-gray-700">Informativos</span>
            </div>
          </div>
        </div>

        {notificationConfig.emailAlerts && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email para Alertas
            </label>
            <input
              type="email"
              value={notificationConfig.emailAddress}
              onChange={(e) => setNotificationConfig(prev => ({ ...prev, emailAddress: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button onClick={handleNotificationSave} className="flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Salvar Configurações
        </Button>
      </div>
    </Card>
  );
};

export const ConfigurationsPage = () => {
  const { hasPermission } = useAuth();
  const [activeSection, setActiveSection] = useState('general');

  const canConfigureSystem = hasPermission(AUTH_CONFIG.permissions.SYSTEM_CONFIG);

  if (!canConfigureSystem) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h2>
          <p className="text-gray-600">
            Você não tem permissão para acessar as configurações do sistema.
          </p>
        </div>
      </div>
    );
  }

  const sections: ConfigSection[] = [
    { id: 'general', title: 'Geral', icon: Settings, component: GeneralSettings },
    { id: 'security', title: 'Segurança', icon: Shield, component: SecuritySettings },
    { id: 'notifications', title: 'Notificações', icon: Bell, component: NotificationSettings },
  ];

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component || GeneralSettings;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Gerencie as configurações do sistema</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Menu Lateral */}
        <div className="lg:w-64">
          <Card className="p-4">
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {section.title}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Conteúdo */}
        <div className="flex-1">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};
