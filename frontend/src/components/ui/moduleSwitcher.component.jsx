import React from 'react';
import { FileText, IndianRupee, Plane } from 'lucide-react';

export const MODULES = [
  { id: 'change_request', label: 'Change Request', icon: FileText, desc: 'IT & Infra Changes' },
  { id: 'prespend', label: 'Pre-Spend Request', icon: IndianRupee, desc: 'Budget & Purchases' },
  { id: 'travel', label: 'Travel Desk', icon: Plane, desc: 'Flights & Stays' }
];

export default function ModuleSwitcher({
  activeModule = 'change_request',
  onModuleChange,
  counts = {},
  pendingCounts = {},
  allowedModules = null // array of module IDs, or null for all
}) {
  const visibleModules = allowedModules
    ? MODULES.filter(m => allowedModules.includes(m.id))
    : MODULES;

  return (
    <div
      role="tablist"
      className="inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-[10px] border border-border bg-input p-1"
    >
      {visibleModules.map(m => {
        const Icon = m.icon;
        const isSelected = activeModule === m.id;
        const count = counts[m.id];

        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onModuleChange?.(m.id)}
            className={`inline-flex items-center gap-[0.45rem] whitespace-nowrap rounded-[7px] px-[0.95rem] py-[0.45rem] text-[0.825rem] transition-all duration-150 ${
              isSelected
                ? 'border border-border bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                : 'border border-transparent bg-transparent font-medium text-muted-foreground shadow-none'
            } cursor-pointer`}
          >
            <Icon
              size={15}
              className={`shrink-0 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}
            />
            <span className="relative inline-flex items-center gap-[0.35rem]">
              {m.label}
              {Boolean(pendingCounts && pendingCounts[m.id] > 0) && (
                <span
                  title={`${pendingCounts[m.id]} pending request${pendingCounts[m.id] > 1 ? 's' : ''}`}
                  className="inline-block h-[6.5px] w-[6.5px] shrink-0 rounded-full bg-[#D97706]"
                />
              )}
            </span>
            {count !== undefined && count !== null && (
              <span
                className={`rounded-full px-[0.4rem] py-[0.05rem] text-[0.7rem] font-semibold ${
                  isSelected ? 'bg-input text-foreground' : 'bg-black/[0.06] text-muted-foreground'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
