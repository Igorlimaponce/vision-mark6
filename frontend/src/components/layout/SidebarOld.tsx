import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Server, 
  BarChart3, 
  Workflow, 
  Settings, 
  FileText, 
  Headset, 
  User,
  LogOut,
  Activity,
  AlertTriangle,
  Users
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { MenuItemProps } from '../../types';

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center p-3 rounded-lg transition-colors duration-300 w-full text-left ${
        isActive 
          ? 'bg-orange-500 text-white' 
          : 'text-white hover:bg-gray-600'
      }`}
      title={label}
    >
      <Icon size={24} />
      <span className="ml-3 hidden lg:block">{label}</span>
    </button>
  );
};

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: Server, label: 'Fleet Management', path: '/fleet' },
    { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
    { icon: Workflow, label: 'Pipelines', path: '/pipelines' },
    { icon: Activity, label: 'Analytics', path: '/analytics' },
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
  };

  return (
    <div className="bg-gray-800 h-screen w-20 lg:w-60 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-600">
        <div className="text-white font-bold text-xl text-center lg:text-left">
          <span className="lg:hidden">A</span>
          <span className="hidden lg:block">AIOS v2.0</span>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {menuItems.map((item) => (
          <MenuItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.path}
            onClick={() => handleMenuClick(item.path)}
          />
        ))}
      </nav>

      {/* User Profile */}
      <div className="px-2 py-4 border-t border-gray-600 space-y-1">
        {user && (
          <div className="text-white px-3 py-2 hidden lg:block">
            <p className="text-sm font-medium truncate">{user.email}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role}</p>
          </div>
        )}
        <MenuItem
          icon={User}
          label="Perfil"
          isActive={location.pathname === '/profile'}
          onClick={() => handleMenuClick('/profile')}
        />
        <MenuItem
          icon={LogOut}
          label="Sair"
          isActive={false}
          onClick={handleLogout}
        />
      </div>
    </div>
  );
};
