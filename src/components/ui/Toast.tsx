import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useCRM();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
          ) : (
            <Info className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
          );

        return (
          <div
            key={toast.id}
            className="flex items-start gap-2.5 p-3.5 bg-white border border-slate-200 rounded-lg shadow-lg"
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-slate-500 mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
