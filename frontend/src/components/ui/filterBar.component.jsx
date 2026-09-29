import React from 'react';
import { Calendar } from 'lucide-react';

const DATE_OPTIONS = [
  { value: 'overall', label: 'Lifetime' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'custom', label: 'Custom' }
];

export function validateCustomRange(startDate, endDate) {
  if (!startDate || !endDate) return 'Please select both start date and end date.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return 'Invalid date format. Expected YYYY-MM-DD.';
  }
  const s = new Date(`${startDate}T00:00:00Z`);
  const e = new Date(`${endDate}T00:00:00Z`);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    return 'Invalid calendar date selected.';
  }
  if (s > e) {
    return 'Start date cannot be later than end date.';
  }
  return null;
}

/**
 * Shared filter bar: a row of status/category pill-tabs on the left,
 * an optional date-range control on the right. Used the same way on
 * every list page (My Requests, My Worklist, Reports, Change Catalog,
 * Settings audit log) so filtering looks and behaves identically
 * across the app.
 */
export default function FilterBar({
  tabs,
  activeTab,
  onTabChange,
  dateValue,
  onDateChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  align = 'space-between',
  variant = 'row'
}) {
  const showDate = typeof dateValue !== 'undefined' && onDateChange;
  const customError = dateValue === 'custom' ? validateCustomRange(startDate, endDate) : null;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${
        variant === 'row' ? 'border-b border-border pb-3' : 'pb-0'
      }`}
      style={{ justifyContent: tabs?.length && showDate ? align : tabs?.length ? 'flex-start' : 'flex-end' }}
    >
      {Boolean(tabs?.length) && (
        <div className="flex max-w-full flex-nowrap items-center gap-[0.4rem] overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const hasPendingDot = tab.hasPending || (tab.id === 'Pending' && typeof tab.count === 'number' && tab.count > 0);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                className={`relative inline-flex shrink-0 cursor-pointer items-center gap-[0.4rem] whitespace-nowrap rounded-[var(--radius-lg)] border px-[0.75rem] py-[0.4rem] text-[0.8rem] font-medium [transition:all_0.15s_ease] ${
                  isActive ? 'border-primary bg-primary text-white' : 'border-border bg-transparent text-muted-foreground'
                }`}
              >
                {hasPendingDot && (
                  <span className="inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-amber-600 shadow-[0_0_0_1.5px_rgba(217,119,6,0.25)]" />
                )}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
              </button>
            );
          })}
        </div>
      )}

      {showDate && (
        <div className="flex flex-col items-end gap-[0.35rem]">
          <div className="inline-flex items-center gap-[0.4rem] rounded-[var(--radius-lg)] border border-border bg-card px-[0.75rem] py-[0.4rem]">
            <Calendar size={14} className="shrink-0 text-muted-foreground" />
            <select
              value={dateValue}
              onChange={(e) => onDateChange(e.target.value)}
              className="cursor-pointer border-none bg-transparent px-0 py-[0.1rem] text-[0.8rem] font-medium text-foreground outline-none"
            >
              {DATE_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-card text-foreground"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {dateValue === 'custom' && onStartDateChange && onEndDateChange && (
            <div className="flex flex-col items-end gap-1">
              <div className="inline-flex items-center gap-[0.4rem]">
                <input
                  type="date"
                  value={startDate || ''}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className={`rounded-[var(--radius-md)] border bg-card px-[0.6rem] py-[0.3rem] text-[0.775rem] text-foreground outline-none ${
                    customError ? 'border-[#DC2626]' : 'border-border'
                  }`}
                />
                <span className="text-[0.75rem] text-muted-foreground">to</span>
                <input
                  type="date"
                  value={endDate || ''}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className={`rounded-[var(--radius-md)] border bg-card px-[0.6rem] py-[0.3rem] text-[0.775rem] text-foreground outline-none ${
                    customError ? 'border-[#DC2626]' : 'border-border'
                  }`}
                />
              </div>
              {customError && (
                <span className="text-[0.725rem] font-medium text-[#DC2626]">
                  {customError}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function initCustomDateRange({ startDate, endDate, setStartDate, setEndDate }) {
  const formatDate = (d) =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  if (!startDate) {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    setStartDate(formatDate(d));
  }
  if (!endDate) {
    setEndDate(formatDate(new Date()));
  }
}
