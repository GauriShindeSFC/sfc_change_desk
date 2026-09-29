import React, { useEffect } from 'react';
import { Loader2, X, ChevronLeft, ChevronRight, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';

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
    className={`block mb-[0.4rem] text-[0.825rem] font-medium text-[var(--text-primary)] ${className}`}
    style={style}
    {...props}
  >
    {children}
    {required && (
      <span className="ml-[3px] text-[var(--error-color,_#DC2626)]">*</span>
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
  <div className={`flex flex-col ${className}`} style={style} {...props}>
    {label && (
      <FormLabel required={required}>
        {label}
      </FormLabel>
    )}
    {children}
    {error ? (
      <span className="mt-1 flex items-center gap-1 text-[0.75rem] font-medium text-[var(--error-color,_#DC2626)]">
        <span>⚠</span> {error}
      </span>
    ) : helperText ? (
      <span className="mt-1 text-[0.75rem] text-[var(--text-secondary)]">
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
        className={`inline-flex items-center gap-[0.45rem] rounded-[10px] border border-[#E2E8F0] bg-white px-[0.95rem] py-[0.45rem] text-[0.85rem] font-semibold text-[var(--text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] [transition:all_0.15s_ease] hover:border-slate-300 hover:bg-slate-50/80 active:bg-slate-100 ${
          isExporting ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100'
        }`}
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
        className={`inline-flex items-center gap-[0.45rem] rounded-[10px] border border-[#E2E8F0] bg-white px-[0.95rem] py-[0.45rem] text-[0.85rem] font-semibold text-[var(--text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] [transition:all_0.15s_ease] hover:border-slate-300 hover:bg-slate-50/80 active:bg-slate-100 ${
          isExporting ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100'
        }`}
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
      className={`inline-block box-border rounded-full border-solid border-[rgba(0,164,239,0.18)] animate-spin ${className}`}
      style={{
        width: selectedSize.dim,
        height: selectedSize.dim,
        borderWidth: selectedSize.border,
        borderTopColor: color,
        borderRightColor: color
      }}
      role="status"
      aria-label="loading"
    />
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
        {spinner}
        {message && (
          <p className="mt-[0.85rem] text-sm font-medium text-[var(--text-secondary)]">
            {message}
          </p>
        )}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[inherit] bg-white/75 backdrop-blur-[2px]">
        {spinner}
        {message && (
          <p className="mt-2 text-[0.8rem] font-medium text-[var(--text-secondary)]">
            {message}
          </p>
        )}
      </div>
    );
  }

  if (center) {
    return (
      <div className="flex w-full flex-col items-center justify-center px-4 py-10">
        {spinner}
        {message && (
          <p className="mt-3 text-[0.85rem] font-medium text-[var(--text-secondary)]">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {spinner}
      {message && <span className="text-[0.825rem] text-[var(--text-secondary)]">{message}</span>}
    </span>
  );
};

/* ── Centered Loading Popup Modal ────────────────────────────── */
export const LoadingPopupModal = ({
  isOpen = false,
  title = 'Processing Request...',
  subtitle = 'Please wait while records are updated and notifications are dispatched.'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-[5px] [animation:fadeIn_0.15s_ease]">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-9 py-8 text-center shadow-2xl">
        <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-teal-100 bg-teal-50">
          <div
            className="h-8 w-8 animate-spin rounded-full border-[3px] border-teal-100 border-t-teal-600 border-r-teal-600"
          />
        </div>

        <div>
          <h3 className="m-0 mb-[0.4rem] text-[1.1rem] font-bold leading-[1.3] text-slate-900">
            {title}
          </h3>
          <p className="m-0 text-[0.85rem] leading-normal text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

/* ── Decision Comment / Note Popup Modal ────────────────────── */
export const CommentPopupModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const isApproved = data.action === 'Approved';
  const isRejected = data.action === 'Rejected';
  const isImplemented = data.action === 'Implemented';

  const badgeBg = isRejected ? '#FEF2F2' : isApproved ? '#F5F3FF' : isImplemented ? '#ECFDF5' : '#FEF3C7';
  const badgeColor = isRejected ? '#DC2626' : isApproved ? '#7C3AED' : isImplemented ? '#059669' : '#D97706';
  const badgeBorder = isRejected ? '#FECACA' : isApproved ? '#DDD6FE' : isImplemented ? '#A7F3D0' : '#FDE68A';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-[var(--border-color,_#E2E8F0)] bg-[var(--card-bg,_#FFFFFF)] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] [animation:fadeIn_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color,_#E2E8F0)] px-6 py-5">
          <div className="flex items-center gap-[0.65rem]">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: badgeBg, color: badgeColor }}
            >
              {isRejected ? (
                <XCircle size={18} />
              ) : isApproved ? (
                <CheckCircle size={18} />
              ) : isImplemented ? (
                <Clock size={18} />
              ) : (
                <MessageSquare size={18} />
              )}
            </div>
            <div>
              <h3 className="m-0 text-base font-semibold text-[var(--text-primary,_#0F172A)]">
                {data.title || 'Decision Note'}
              </h3>
              <span
                className="mt-[0.2rem] inline-block rounded-xl border px-[0.45rem] py-[0.1rem] text-[0.725rem] font-semibold"
                style={{ color: badgeColor, backgroundColor: badgeBg, borderColor: badgeBorder }}
              >
                {data.action}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border-none bg-transparent p-1 text-[var(--text-secondary,_#64748B)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-6">
          {/* Author Info */}
          <div className="flex items-center justify-between text-[0.8rem]">
            <div>
              <span className="text-[var(--text-secondary,_#64748B)]">By: </span>
              <strong className="text-[var(--text-primary,_#0F172A)]">{data.authorName || 'Approver'}</strong>
              {data.authorEmail && (
                <span className="ml-[0.35rem] text-[var(--text-secondary,_#64748B)] [font-family:var(--font-mono)]">
                  ({data.authorEmail})
                </span>
              )}
            </div>
            <div className="text-[0.75rem] text-[var(--text-secondary,_#64748B)]">
              {data.date || ''}
            </div>
          </div>

          {/* Comment Box */}
          <div className="max-h-[220px] overflow-y-auto whitespace-pre-wrap break-words rounded-[10px] border border-[var(--border-color,_#E2E8F0)] bg-[var(--input-bg,_#F8FAFC)] p-4 text-sm leading-normal text-[var(--text-primary,_#0F172A)]">
            {data.comment || 'No remark or comment recorded.'}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-[var(--border-color,_#E2E8F0)] bg-[var(--input-bg,_#F8FAFC)] px-6 py-[0.85rem]">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-[var(--border-color,_#CBD5E1)] bg-[var(--card-bg,_#FFFFFF)] px-5 py-2 text-[0.825rem] font-semibold text-[var(--text-primary,_#0F172A)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};



