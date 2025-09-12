// Widget base reutilizável para dashboard
// Fornece estrutura comum para todos os widgets

import React, { type ReactNode } from 'react';
import { MoreVertical, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

export interface WidgetProps {
  id: string;
  title: string;
  children: ReactNode;
  isLoading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onMaximize?: () => void;
  onMinimize?: () => void;
  onRemove?: () => void;
  isMaximized?: boolean;
  className?: string;
  headerActions?: ReactNode;
  showActions?: boolean;
}

export const BaseWidget: React.FC<WidgetProps> = ({
  title,
  children,
  isLoading = false,
  error,
  onRefresh,
  onMaximize,
  onMinimize,
  onRemove,
  isMaximized = false,
  className = '',
  headerActions,
  showActions = true
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const handleMenuToggle = () => {
    setShowMenu(!showMenu);
  };

  const handleMenuAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 truncate">
            {title}
          </h3>
          
          <div className="flex items-center space-x-2">
            {/* Custom header actions */}
            {headerActions}
            
            {/* Loading indicator */}
            {isLoading && (
              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
            )}
            
            {/* Actions menu */}
            {showActions && (
              <div className="relative">
                <button
                  onClick={handleMenuToggle}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                    {onRefresh && (
                      <button
                        onClick={() => handleMenuAction(onRefresh)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Atualizar</span>
                      </button>
                    )}
                    
                    {isMaximized ? (
                      onMinimize && (
                        <button
                          onClick={() => handleMenuAction(onMinimize)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Minimize2 className="w-4 h-4" />
                          <span>Minimizar</span>
                        </button>
                      )
                    ) : (
                      onMaximize && (
                        <button
                          onClick={() => handleMenuAction(onMaximize)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Maximize2 className="w-4 h-4" />
                          <span>Maximizar</span>
                        </button>
                      )
                    )}
                    
                    {onRemove && (
                      <>
                        <div className="border-t border-gray-100" />
                        <button
                          onClick={() => handleMenuAction(onRemove)}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <span>Remover</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="relative">
        {/* Error state */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-800">
                  Erro ao carregar dados: {error}
                </p>
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                  >
                    Tentar novamente
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Loading overlay */}
        {isLoading && !error && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">Carregando...</p>
            </div>
          </div>
        )}
        
        {/* Widget content */}
        <div className={`${isLoading ? 'opacity-50' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};
