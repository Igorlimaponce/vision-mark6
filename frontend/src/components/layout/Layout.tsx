import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isFullHeightPage = location.pathname === '/pipelines';

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/fleet':
        return 'Fleet Management';
      case '/dashboard':
        return 'Dashboard';
      case '/pipelines':
        return 'Pipelines';
      case '/events':
        return 'Eventos';
      case '/alerts':
        return 'Alertas';
      default:
        return 'AIOS';
    }
  };

  const getPageSubtitle = () => {
    switch (location.pathname) {
      case '/fleet':
        return 'Monitoramento e gerenciamento da frota de dispositivos';
      case '/dashboard':
        return 'Visualização de dados agregados e métricas';
      case '/pipelines':
        return 'Criação e gerenciamento de fluxos de IA';
      case '/events':
        return 'Log completo de eventos do sistema AIOS';
      case '/alerts':
        return 'Notificações críticas e alertas de segurança';
      default:
        return undefined;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isFullHeightPage && <Header title={getPageTitle()} subtitle={getPageSubtitle()} />}
        
        <main className={isFullHeightPage ? "flex-1 overflow-hidden" : "flex-1 overflow-auto p-6"}>
          {children}
        </main>
      </div>
    </div>
  );
};
