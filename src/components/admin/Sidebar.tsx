import { useTranslation } from 'react-i18next';
import { LayoutDashboard, FileText, Settings, Home, Shield } from 'lucide-react';

type SidebarTab = 'overview' | 'contracts' | 'settings';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

interface NavItem {
  id: SidebarTab;
  labelKey: string;
  icon: React.ReactNode;
  descriptionKey: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();

  const navItems: NavItem[] = [
    {
      id: 'overview',
      labelKey: 'admin.nav.overview',
      icon: <LayoutDashboard size={20} />,
      descriptionKey: 'admin.nav.overviewDesc',
    },
    {
      id: 'contracts',
      labelKey: 'admin.nav.contracts',
      icon: <FileText size={20} />,
      descriptionKey: 'admin.nav.contractsDesc',
    },
    {
      id: 'settings',
      labelKey: 'admin.nav.settings',
      icon: <Settings size={20} />,
      descriptionKey: 'admin.nav.settingsDesc',
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white shadow-xl z-50">
      {/* Logo / Brand */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('admin.brand')}</h1>
            <p className="text-xs text-gray-400">{t('admin.panel')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === item.id
                ? 'bg-green-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span className={activeTab === item.id ? 'text-white' : 'text-gray-400'}>
              {item.icon}
            </span>
            <div className="text-left">
              <p className="font-semibold">{t(item.labelKey)}</p>
              <p className="text-xs opacity-75">{t(item.descriptionKey)}</p>
            </div>
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className="border-t border-gray-700 mx-4 my-4" />

      {/* Secondary Actions */}
      <div className="p-4">
        <a
          href="/"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition"
        >
          <Home size={20} />
          <span className="font-semibold">{t('admin.nav.backToHome')}</span>
        </a>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          v1.0.0 &bull; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;