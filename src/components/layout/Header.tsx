import React, { useState } from 'react';
import { Menu, RotateCcw } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { NAV_ITEMS } from './Sidebar';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileNav }) => {
  const { activeSection, resetDemoData } = useCRM();
  const [confirmReset, setConfirmReset] = useState(false);

  const currentItem = NAV_ITEMS.find((n) => n.id === activeSection);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0 text-sm">
            <span className="hidden sm:inline text-slate-500 whitespace-nowrap">
              FibreSales CRM
            </span>
            <span className="hidden sm:inline text-slate-300" aria-hidden="true">
              /
            </span>
            <h1 className="text-base font-semibold text-slate-900 truncate">
              {currentItem?.label ?? 'Dashboard'}
            </h1>
          </div>
        </div>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Demo</span>
          </button>
        </div>
      </header>

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetDemoData}
        title="Reset demonstration data?"
        message="This will erase any edits made in this browser and restore the original fictional dataset."
        confirmLabel="Reset Data"
        variant="danger"
      />
    </>
  );
};
