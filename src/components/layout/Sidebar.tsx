import React from 'react';
import {
  BarChart3,
  ClipboardCheck,
  GitBranch,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  UserCheck,
  Wallet,
  Wifi,
  X
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { NavSection } from '../../types/crm';

export const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'pipeline', label: 'Sales Pipeline', icon: GitBranch },
  { id: 'agents', label: 'Agents', icon: UserCheck },
  { id: 'products', label: 'Products & Providers', icon: Package },
  { id: 'qa', label: 'Quality Assurance', icon: ClipboardCheck },
  { id: 'commissions', label: 'Commissions', icon: Wallet },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeSection, setActiveSection } = useCRM();

  const handleSelect = (section: NavSection) => {
    setActiveSection(section);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 select-none">
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-blue-700 flex items-center justify-center text-white shrink-0">
            <Wifi className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-white tracking-tight block leading-none whitespace-nowrap">
              FibreSales CRM
            </span>
            <span className="text-xs text-slate-400 block mt-1 whitespace-nowrap">
              Sales Operations
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 -mr-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-blue-400' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-3.5 border-t border-slate-800 text-xs text-slate-400">
        <p className="font-medium text-slate-200">Sales Manager Workspace</p>
        <p className="mt-1 leading-snug text-slate-400">
          Browser demo storage active. Fictional records only.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 border-r border-slate-800">
        {navContent}
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 flex">{navContent}</div>
        </div>
      )}
    </>
  );
};
