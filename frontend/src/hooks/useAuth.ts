// Hook personalizado para autenticação conforme seção 14

import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { AUTH_CONFIG, ROLE_PERMISSIONS } from '../config/auth';
import { logger } from '../utils/logger';
import { notifications } from '../utils/notifications';

export const useAuth = () => {
  const { currentUser, setCurrentUser, setAuthenticated, isAuthenticated } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem(AUTH_CONFIG.tokenKey);
      const userJson = localStorage.getItem(AUTH_CONFIG.userKey);
      
      if (!token || !userJson) {
        setAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        // Verificar token com o backend
        const response = await fetch('http://localhost:8000/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Ajustar o formato da data se necessário
          if (userData.created_at && typeof userData.created_at === 'string') {
            userData.created_at = new Date(userData.created_at);
          }
          
          setCurrentUser(userData);
          setAuthenticated(true);
          logger.info('User authenticated from token', 'Auth', { userId: userData.id });
        } else {
          await logout();
          if (response.status === 401) {
            notifications.error('Sessão expirada. Faça login novamente.');
          }
        }
      } catch (parseError) {
        logger.error('Token validation error', 'Auth', parseError);
        await logout();
      }
    } catch (error) {
      logger.error('Auth check failed', 'Auth', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🚀 Iniciando login para:', email);
      
      // Chamar API real do backend
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });
      
      console.log('📡 Resposta da API:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Login bem-sucedido, dados recebidos:', data);
        
        // Salvar token JWT
        localStorage.setItem(AUTH_CONFIG.tokenKey, data.access_token);
        
        // Buscar dados do usuário
        const userResponse = await fetch('http://localhost:8000/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          // Ajustar formato da data se necessário
          if (userData.created_at && typeof userData.created_at === 'string') {
            userData.created_at = new Date(userData.created_at);
          }
          
          localStorage.setItem(AUTH_CONFIG.userKey, JSON.stringify(userData));
          
          setCurrentUser(userData);
          setAuthenticated(true);
          
          logger.info('User logged in', 'Auth', { userId: userData.id });
          notifications.success(`Bem-vindo, ${userData.full_name || userData.email}!`);
          
          return true;
        } else {
          console.error('❌ Erro ao carregar dados do usuário');
          notifications.error('Erro ao carregar dados do usuário');
          return false;
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Erro na API:', response.status, errorData);
        notifications.error(errorData.detail || 'Email ou senha incorretos');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro de conexão:', error);
      logger.error('Login failed', 'Auth', error);
      notifications.error('Erro de conexão com o servidor');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // JWT é stateless, então só precisamos limpar o localStorage
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
    localStorage.removeItem(AUTH_CONFIG.userKey);
    
    setCurrentUser(null);
    setAuthenticated(false);
    
    logger.info('User logged out', 'Auth');
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser || !currentUser.role) return false;
    
    const userPermissions = ROLE_PERMISSIONS[currentUser.role as keyof typeof ROLE_PERMISSIONS] || [];
    return userPermissions.includes(permission as any);
  };

  const hasRole = (role: string): boolean => {
    return currentUser?.role === role;
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem(AUTH_CONFIG.refreshTokenKey);
      
      if (!refreshTokenValue) {
        await logout();
        return false;
      }

      const response = await fetch(AUTH_CONFIG.refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (response.ok) {
        const data = await response.json();
        
        localStorage.setItem(AUTH_CONFIG.tokenKey, data.token);
        localStorage.setItem(AUTH_CONFIG.refreshTokenKey, data.refreshToken);
        
        logger.info('Token refreshed', 'Auth');
        return true;
      } else {
        await logout();
        notifications.sessionExpired();
        return false;
      }
    } catch (error) {
      logger.error('Token refresh failed', 'Auth', error);
      await logout();
      return false;
    }
  };

  return {
    user: currentUser,
    isLoading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasRole,
    refreshToken,
    checkAuthStatus,
  };
};
