// Provider WebSocket para gerenciar conexão global

import { createContext, useContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { webSocketService } from '../services/websocket';
import { useAuth } from '../hooks/useAuth';

interface WebSocketContextType {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket deve ser usado dentro de WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const { isAuthenticated, user } = useAuth();
  const isConnected = useRef(false);

  const connect = () => {
    if (isAuthenticated && user && !isConnected.current) {
      webSocketService.connect();
      isConnected.current = true;
    }
  };

  const disconnect = () => {
    webSocketService.disconnect();
    isConnected.current = false;
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user]);

  const value: WebSocketContextType = {
    isConnected: isConnected.current,
    connect,
    disconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
