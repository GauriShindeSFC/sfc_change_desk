import React from 'react';
import { Calendar } from 'lucide-react';

const DATE_OPTIONS = [
  { value: 'overall', label: 'Overall' },
  { value: 'last_7_days', label: '7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
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
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: tabs?.length && showDate ? align : tabs?.length ? 'flex-start' : 'flex-end',
        borderBottom: variant === 'row' ? '1px solid var(--border-color)' : 'none',
        paddingBottom: variant === 'row' ? '0.75rem' : 0,
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}
    >
      {Boolean(tabs?.length) && (
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            flexWrap: 'nowrap',
            overflowX: 'auto',
            maxWidth: '100%',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            alignItems: 'center',
            paddingBottom: '2px'
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                style={{
                  padding: '0.4rem 0.75rem',
                  backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  border: isActive ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {tab.label}
                {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
              </button>
            );
          })}
        </div>
      )}

      {showDate && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.4rem 0.75rem'
            }}
          >
            <Calendar size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <select
              value={dateValue}
              onChange={(e) => onDateChange(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
                padding: '0.1rem 0'
              }}
            >
              {DATE_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {dateValue === 'custom' && onStartDateChange && onEndDateChange && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="date"
                  value={startDate || ''}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: `1px solid ${customError ? '#DC2626' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.775rem',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>to</span>
                <input
                  type="date"
                  value={endDate || ''}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    border: `1px solid ${customError ? '#DC2626' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.775rem',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
              {customError && (
                <span style={{ fontSize: '0.725rem', color: '#DC2626', fontWeight: 500 }}>
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
