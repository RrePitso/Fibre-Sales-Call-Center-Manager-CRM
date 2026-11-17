import React from 'react';
import { Calendar } from 'lucide-react';
import { DateFilterState, DateRangePreset } from '../../types/crm';

interface DateRangeFilterProps {
  value: DateFilterState;
  onChange: (next: DateFilterState) => void;
}

const PRESETS: Array<{ id: DateRangePreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'this_month', label: 'This month' },
  { id: 'custom', label: 'Custom' }
];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
  const handlePresetClick = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      const today = new Date().toISOString().slice(0, 10);
      const thirtyAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      onChange({
        preset: 'custom',
        customStart: value.customStart || thirtyAgo,
        customEnd: value.customEnd || today
      });
    } else {
      onChange({ preset });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Date range filter"
        className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg"
      >
        {PRESETS.map((p) => {
          const active = value.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetClick(p.id)}
              aria-pressed={active}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {value.preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>From</span>
            <input
              type="date"
              value={value.customStart || ''}
              onChange={(e) =>
                onChange({ ...value, preset: 'custom', customStart: e.target.value })
              }
              className="text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>To</span>
            <input
              type="date"
              value={value.customEnd || ''}
              onChange={(e) =>
                onChange({ ...value, preset: 'custom', customEnd: e.target.value })
              }
              className="text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded px-2 py-1"
            />
          </label>
        </div>
      )}
    </div>
  );
};
