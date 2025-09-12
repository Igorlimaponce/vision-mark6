// Layout de dashboard com suporte a drag-and-drop
// Permite reorganizar widgets de forma intuitiva

import React, { useState, useCallback } from 'react';
import { StatsWidget } from './StatsWidget';
import { ChartWidget } from './ChartWidget';
import { AlertsWidget } from './AlertsWidget';
import { Plus, Layout, Save, RotateCcw } from 'lucide-react';

interface DashboardWidget {
  id: string;
  type: 'stats' | 'chart' | 'alerts';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config?: Record<string, any>;
}

interface DashboardLayoutProps {
  initialWidgets?: DashboardWidget[];
  onLayoutChange?: (widgets: DashboardWidget[]) => void;
  onSaveLayout?: (widgets: DashboardWidget[]) => void;
  editable?: boolean;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'stats-1',
    type: 'stats',
    title: 'Estatísticas Gerais',
    position: { x: 0, y: 0 },
    size: { width: 6, height: 4 }
  },
  {
    id: 'chart-1', 
    type: 'chart',
    title: 'Tendência de Detecções',
    position: { x: 6, y: 0 },
    size: { width: 6, height: 4 }
  },
  {
    id: 'alerts-1',
    type: 'alerts', 
    title: 'Alertas Ativos',
    position: { x: 0, y: 4 },
    size: { width: 4, height: 6 }
  }
];

const WIDGET_TYPES = {
  stats: { 
    label: 'Estatísticas', 
    component: StatsWidget,
    defaultSize: { width: 6, height: 4 },
    minSize: { width: 4, height: 3 }
  },
  chart: { 
    label: 'Gráfico', 
    component: ChartWidget,
    defaultSize: { width: 6, height: 4 },
    minSize: { width: 4, height: 3 }
  },
  alerts: { 
    label: 'Alertas', 
    component: AlertsWidget,
    defaultSize: { width: 4, height: 6 },
    minSize: { width: 3, height: 4 }
  }
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  initialWidgets = DEFAULT_WIDGETS,
  onLayoutChange,
  onSaveLayout,
  editable = true
}) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(initialWidgets);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [gridSize] = useState(12); // Grid de 12 colunas

  const updateWidgets = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    onLayoutChange?.(newWidgets);
  }, [onLayoutChange]);

  const addWidget = useCallback((type: keyof typeof WIDGET_TYPES) => {
    const config = WIDGET_TYPES[type];
    const newWidget: DashboardWidget = {
      id: `${type}-${Date.now()}`,
      type,
      title: config.label,
      position: { x: 0, y: 0 },
      size: config.defaultSize
    };

    // Colocar no final
    const maxY = Math.max(...widgets.map(w => w.position.y + w.size.height), 0);
    newWidget.position.y = maxY;

    updateWidgets([...widgets, newWidget]);
    setShowAddMenu(false);
  }, [widgets, updateWidgets]);





  const handleSaveLayout = useCallback(() => {
    onSaveLayout?.(widgets);
  }, [widgets, onSaveLayout]);

  const resetLayout = useCallback(() => {
    if (confirm('Tem certeza que deseja restaurar o layout padrão?')) {
      updateWidgets(DEFAULT_WIDGETS);
    }
  }, [updateWidgets]);

  const renderWidget = (widget: DashboardWidget) => {
    const WidgetComponent = WIDGET_TYPES[widget.type]?.component;
    
    if (!WidgetComponent) {
      return (
        <div className="p-4 text-center text-gray-500">
          Widget type '{widget.type}' not found
        </div>
      );
    }

    return (
      <WidgetComponent
        key={widget.id}
        id={widget.id}
        {...(widget.config || {})}
      />
    );
  };

  const getWidgetStyle = (widget: DashboardWidget): React.CSSProperties => {
    return {
      gridColumn: `${widget.position.x + 1} / span ${widget.size.width}`,
      gridRow: `${widget.position.y + 1} / span ${widget.size.height}`,
      minHeight: '200px'
    };
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Monitor em tempo real do sistema AIOS</p>
          </div>
          
          {editable && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Widget</span>
              </button>
              
              <button
                onClick={handleSaveLayout}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Layout</span>
              </button>
              
              <button
                onClick={resetLayout}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Resetar</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Add widget menu */}
        {showAddMenu && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Adicionar Widget</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(WIDGET_TYPES).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => addWidget(type as keyof typeof WIDGET_TYPES)}
                  className="p-3 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-center"
                >
                  <Layout className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                  <span className="text-sm text-gray-700">{config.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Grid */}
      <div 
        className="grid gap-4 auto-rows-[100px]"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
        {widgets.map(widget => (
          <div
            key={widget.id}
            style={getWidgetStyle(widget)}
            className="transition-all duration-200"
          >
            {renderWidget(widget)}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {widgets.length === 0 && (
        <div className="text-center py-12">
          <Layout className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Nenhum widget configurado
          </h3>
          <p className="text-gray-500 mb-4">
            Adicione widgets para começar a monitorar seu sistema
          </p>
          {editable && (
            <button
              onClick={() => setShowAddMenu(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Primeiro Widget</span>
            </button>
          )}
        </div>
      )}

      {/* Status info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          {widgets.length} widget{widgets.length !== 1 ? 's' : ''} configurado{widgets.length !== 1 ? 's' : ''} • 
          Última atualização: {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>
    </div>
  );
};
