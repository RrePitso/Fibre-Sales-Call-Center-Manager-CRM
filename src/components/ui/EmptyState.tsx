import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-slate-200 rounded-lg">
    <div className="p-3 rounded-lg bg-slate-100 text-slate-500 mb-3">
      <Inbox className="w-5 h-5" aria-hidden="true" />
    </div>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);
