import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  DollarSign, 
  Settings, 
  MessageSquare, 
  Shield,
  BarChart3,
} from 'lucide-react';
import { ROUTES } from '@/router/routes';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.ADMIN_DASHBOARD, label: 'Overview', icon: LayoutDashboard },
  { to: ROUTES.ADMIN_TREASURY, label: 'Treasury', icon: DollarSign },
  { to: ROUTES.ADMIN_PROTOCOL, label: 'Protocols', icon: BarChart3 },
  { to: ROUTES.ADMIN_CONTRACTS, label: 'Contracts', icon: Settings },
  { to: ROUTES.ADMIN_CONTACT, label: 'Messages', icon: MessageSquare, badge: 3 },
];

function AdminNavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  
  return (
    <NavLink
      to={item.to}
      className={({ isActive: active }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
          active || isActive
            ? 'bg-forest-green/10 text-forest-green font-semibold'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <Icon size={20} />
      <span className="flex-1 text-sm">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-5 text-center">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 z-30">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-forest-green flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">Admin Panel</h1>
              <p className="text-xs text-gray-500">Ethernal Protocol</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <AdminNavItem
              key={item.to}
              item={item}
              isActive={location.pathname === item.to}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-600">Network</span>
            </div>
            <p className="text-xs font-mono text-gray-500 break-all">
              Arbitrum Sepolia
            </p>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-[10px] text-gray-400">
                Admin access requires wallet approval
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}