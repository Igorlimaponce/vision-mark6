import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { 
  Server, 
  BarChart3, 
  Workflow, 
  Settings, 
  FileText, 
  Headset, 
  User,
  LogOut,
  AlertTriangle,
  Users
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface MenuItemProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isExpanded: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, isActive, onClick, isExpanded }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center p-3 rounded-lg transition-all duration-300 w-full text-left group ${
        isActive 
          ? 'bg-orange-500 text-white' 
          : 'text-white hover:bg-gray-600'
      }`}
      title={!isExpanded ? label : undefined}
    >
      <Icon size={24} className="flex-shrink-0" />
      <span className={`ml-3 whitespace-nowrap transition-all duration-300 ${
        isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
      }`}>
        {label}
      </span>
    </button>
  );
};

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = [
    { icon: Server, label: 'Fleet Management', path: '/fleet' },
    { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
    { icon: Workflow, label: 'Pipelines', path: '/pipelines' },
    { icon: AlertTriangle, label: 'Alertas', path: '/alerts' },
    { icon: FileText, label: 'Relatórios', path: '/reports' },
    { icon: Users, label: 'Usuários', path: '/users' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
    { icon: Headset, label: 'Suporte', path: '/support' },
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div 
      className={`bg-gray-800 h-full flex flex-col transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Header/Logo */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <span className={`ml-3 text-white font-bold text-lg whitespace-nowrap transition-all duration-300 ${
            isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
          }`}>
            AIOS v2.0
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <MenuItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.path}
            onClick={() => handleMenuClick(item.path)}
            isExpanded={isExpanded}
          />
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-700">
        {/* User Info */}
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-white" />
          </div>
          <div className={`ml-3 transition-all duration-300 ${
            isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
          }`}>
            <p className="text-white text-sm font-medium whitespace-nowrap">
              {user?.email || 'Usuário'}
            </p>
            <p className="text-gray-400 text-xs whitespace-nowrap">
              {user?.role || 'Admin'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center p-2 rounded-lg transition-all duration-300 w-full text-left text-gray-300 hover:text-white hover:bg-gray-700"
          title={!isExpanded ? 'Sair' : undefined}
        >
          <LogOut size={20} className="flex-shrink-0" />
          <span className={`ml-3 text-sm whitespace-nowrap transition-all duration-300 ${
            isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 w-0 overflow-hidden'
          }`}>
            Sair
          </span>
        </button>
      </div>
    </div>
  );
};
