import React, { useEffect } from 'react';
import { Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';

/* ── Button ─────────────────────────────────────────────────── */
export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-[var(--ring-color)] disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const variants = {
    primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 active:opacity-95 shadow-sm',
    secondary: 'bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--accent)] border border-[var(--border)]',
    outline: 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)] bg-transparent',
    ghost: 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] bg-transparent',
    danger: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90 active:opacity-95 shadow-sm'
  };

  const sizes = {
    sm: 'text-xs h-8 px-3 gap-1.5',
    md: 'text-sm h-9 px-4 gap-2',
    lg: 'text-sm h-10 px-6 gap-2.5'
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

/* ── Badge ──────────────────────────────────────────────────── */
export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-md select-none border';

  const variants = {
    default: 'bg-[var(--secondary)] text-[var(--muted-foreground)] border-[var(--border)]',
    secondary: 'bg-[var(--secondary)] text-[var(--foreground)] border-[var(--border)]',
    outline: 'bg-transparent text-[var(--foreground)] border-[var(--border)]',
    success: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30',
    warning: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30',
    danger: 'bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/30',
    info: 'bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/30',
    purple: 'bg-[var(--purple)]/10 text-[var(--purple)] border-[var(--purple)]/30',
    teal: 'bg-[var(--teal)]/10 text-[var(--teal)] border-[var(--teal)]/30'
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2'
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
};

/* ── Input ──────────────────────────────────────────────────── */
export const Input = React.forwardRef(({
  className = '',
  error = false,
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      className={`w-full h-9 px-3 py-2 text-sm bg-[var(--input)] text-[var(--foreground)] border rounded-md transition-colors placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] ${
        error ? 'border-[var(--destructive)] focus:border-[var(--destructive)]' : 'border-[var(--border)] focus:border-[var(--primary)]'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
});

Input.displayName = 'Input';

/* ── Select ─────────────────────────────────────────────────── */
export const Select = React.forwardRef(({
  children,
  className = '',
  error = false,
  ...props
}, ref) => {
  return (
    <select
      ref={ref}
      className={`w-full h-9 px-3 py-2 text-sm bg-[var(--input)] text-[var(--foreground)] border rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--ring)] ${
        error ? 'border-[var(--destructive)] focus:border-[var(--destructive)]' : 'border-[var(--border)] focus:border-[var(--primary)]'
      } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';

/* ── Textarea ───────────────────────────────────────────────── */
export const Textarea = React.forwardRef(({
  className = '',
  error = false,
  rows = 3,
  ...props
}, ref) => {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`w-full px-3 py-2 text-sm bg-[var(--input)] text-[var(--foreground)] border rounded-md transition-colors placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] ${
        error ? 'border-[var(--destructive)] focus:border-[var(--destructive)]' : 'border-[var(--border)] focus:border-[var(--primary)]'
      } disabled:opacity-50 disabled:cursor-not-allowed resize-y ${className}`}
      {...props}
    />
  );
});

/* ── FormLabel & FormField ──────────────────────────────────── */
export const FormLabel = ({
  children,
  required = false,
  htmlFor,
  className = '',
  style = {},
  ...props
}) => (
  <label
    htmlFor={htmlFor}
    className={className}
    style={{
      display: 'block',
      fontSize: '0.825rem',
      fontWeight: 500,
      color: 'var(--text-primary)',
      marginBottom: '0.4rem',
      ...style
    }}
    {...props}
  >
    {children}
    {required && (
      <span style={{ color: 'var(--error-color, #DC2626)', marginLeft: '3px' }}>*</span>
    )}
  </label>
);

export const FormField = ({
  label,
  required = false,
  error,
  helperText,
  children,
  className = '',
  style = {},
  ...props
}) => (
  <div className={className} style={{ display: 'flex', flexDirection: 'column', ...style }} {...props}>
    {label && (
      <FormLabel required={required}>
        {label}
      </FormLabel>
    )}
    {children}
    {error ? (
      <span style={{ fontSize: '0.75rem', color: 'var(--error-color, #DC2626)', fontWeight: 500, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>⚠</span> {error}
      </span>
    ) : helperText ? (
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
        {helperText}
      </span>
    ) : null}
  </div>
);

/* ── Card ───────────────────────────────────────────────────── */
export const Card = ({ children, className = '', ...props }) => (
  <div className={`bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-card)] ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`p-5 pb-3 border-b border-[var(--border-color)]/60 flex flex-col gap-1 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`font-semibold text-base text-[var(--text-primary)] tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`text-xs text-[var(--text-secondary)] ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`p-5 pt-3 border-t border-[var(--border-color)]/60 flex items-center justify-end gap-2.5 ${className}`} {...props}>
    {children}
  </div>
);

/* ── Modal ──────────────────────────────────────────────────── */
export const Modal = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-lg',
  className = ''
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />
      {/* Modal Dialog Surface */}
      <div className={`relative z-10 w-full ${maxWidth} bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] transition-all animate-in zoom-in-95 duration-150 ${className}`}>
        {children}
      </div>
    </div>
  );
};

export const ModalHeader = ({ children, onClose, className = '' }) => (
  <div className={`flex items-center justify-between p-5 border-b border-[var(--border-color)] ${className}`}>
    <div className="flex flex-col gap-0.5">{children}</div>
    {onClose && (
      <button
        onClick={onClose}
        className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)] transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

export const ModalTitle = ({ children, className = '' }) => (
  <h2 className={`text-base font-semibold text-[var(--text-primary)] ${className}`}>
    {children}
  </h2>
);

export const ModalBody = ({ children, className = '' }) => (
  <div className={`p-5 overflow-y-auto flex-1 ${className}`}>
    {children}
  </div>
);

export const ModalFooter = ({ children, className = '' }) => (
  <div className={`flex items-center justify-end gap-2.5 p-4 border-t border-[var(--border-color)] bg-[var(--input-bg)]/40 ${className}`}>
    {children}
  </div>
);

/* ── Pagination ─────────────────────────────────────────────── */
export const Pagination = ({
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  pageSizeOptions = [10, 25, 50],
  onPageSizeChange,
  className = ''
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  if (totalItems <= 0) return null;

  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--card-bg)] text-xs text-[var(--text-secondary)] select-none ${className}`}
      style={{ borderTop: '1px solid var(--border-color)' }}
    >
      {/* Left: Summary & Per-Page selector */}
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="font-semibold text-[var(--text-primary)]">{startItem}</strong> to{' '}
          <strong className="font-semibold text-[var(--text-primary)]">{endItem}</strong> of{' '}
          <strong className="font-semibold text-[var(--text-primary)]">{totalItems}</strong> entries
        </span>

        {onPageSizeChange && pageSizeOptions && pageSizeOptions.length > 1 && (
          <div className="flex items-center gap-1.5 ml-2">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-color)] rounded px-1.5 py-0.5 text-xs outline-none cursor-pointer focus:border-[var(--brand-primary)]"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange && onPageChange(safeCurrentPage - 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-primary)] hover:bg-[var(--border-color)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1 text-[var(--text-secondary)]">
                  ...
                </span>
              );
            }
            const isActive = p === safeCurrentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange && onPageChange(p)}
                className={`min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--input-bg)]'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={safeCurrentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(safeCurrentPage + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-primary)] hover:bg-[var(--border-color)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
          aria-label="Next Page"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

/* ── Export Action Buttons ──────────────────────────────────── */
export const ExportButtonGroup = ({
  onExportCsv,
  onExportPdf,
  isExporting = false,
  csvLabel = 'Export CSV',
  pdfLabel = 'Export PDF',
  className = ''
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <button
        type="button"
        onClick={onExportCsv}
        disabled={isExporting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.45rem 0.95rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          opacity: isExporting ? 0.7 : 1,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.15s ease'
        }}
        className="hover:border-slate-300 hover:bg-slate-50/80 active:bg-slate-100"
        title="Export data as CSV spreadsheet"
      >
        {/* Clean green spreadsheet icon matching design */}
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#059669"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M8 13h2" />
          <path d="M8 17h2" />
          <path d="M14 13h2" />
          <path d="M14 17h2" />
        </svg>
        <span>{csvLabel}</span>
      </button>

      <button
        type="button"
        onClick={onExportPdf}
        disabled={isExporting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.45rem 0.95rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          opacity: isExporting ? 0.7 : 1,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.15s ease'
        }}
        className="hover:border-slate-300 hover:bg-slate-50/80 active:bg-slate-100"
        title="Export data as PDF document"
      >
        {/* Clean red PDF document icon matching design */}
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#DC2626"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        </svg>
        <span>{pdfLabel}</span>
      </button>
    </div>
  );
};

/* ── Circular Loading Spinner ───────────────────────────────── */
export const LoadingSpinner = ({
  size = 'md',
  message = '',
  center = true,
  className = '',
  fullPage = false,
  overlay = false,
  color = '#00A4EF'
}) => {
  const sizeMap = {
    xs: { dim: '14px', border: '2px' },
    sm: { dim: '18px', border: '2px' },
    md: { dim: '24px', border: '2.5px' },
    lg: { dim: '36px', border: '3px' },
    xl: { dim: '48px', border: '4px' }
  };

  const selectedSize = sizeMap[size] || sizeMap.md;

  const spinner = (
    <div
      className={`inline-block rounded-full animate-spin ${className}`}
      style={{
        width: selectedSize.dim,
        height: selectedSize.dim,
        borderWidth: selectedSize.border,
        borderStyle: 'solid',
        borderColor: 'rgba(0, 164, 239, 0.18)',
        borderTopColor: color,
        borderRightColor: color,
        boxSizing: 'border-box'
      }}
      role="status"
      aria-label="loading"
    />
  );

  if (fullPage) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(4px)'
      }}>
        {spinner}
        {message && (
          <p style={{ marginTop: '0.85rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {message}
          </p>
        )}
      </div>
    );
  }

  if (overlay) {
    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(2px)',
        borderRadius: 'inherit'
      }}>
        {spinner}
        {message && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {message}
          </p>
        )}
      </div>
    );
  }

  if (center) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '2.5rem 1rem' }}>
        {spinner}
        {message && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      {spinner}
      {message && <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{message}</span>}
    </span>
  );
};


