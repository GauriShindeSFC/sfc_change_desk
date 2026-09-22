import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', message, duration = 4500 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast = { id, type, message, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (message, duration) => addToast({ type: 'success', message, duration }),
    error: (message, duration) => addToast({ type: 'error', message, duration }),
    warning: (message, duration) => addToast({ type: 'warning', message, duration }),
    info: (message, duration) => addToast({ type: 'info', message, duration })
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Render Container */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '380px',
        width: 'calc(100% - 40px)',
        pointerEvents: 'none'
      }}>
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';
          const isWarning = t.type === 'warning';

          const bg = isError ? '#FEF2F2' : isSuccess ? '#F0FDF4' : isWarning ? '#FFFBEB' : '#F0F9FF';
          const border = isError ? '#FECACA' : isSuccess ? '#BBF7D0' : isWarning ? '#FDE68A' : '#BAE6FD';
          const text = isError ? '#991B1B' : isSuccess ? '#166534' : isWarning ? '#92400E' : '#075985';
          const iconColor = isError ? '#DC2626' : isSuccess ? '#16A34A' : isWarning ? '#D97706' : '#0284C7';

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: bg,
                border: `1px solid ${border}`,
                borderRadius: '10px',
                boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.1)',
                color: text,
                fontSize: '0.85rem',
                fontWeight: 500,
                lineHeight: 1.4,
                animation: 'slideIn 0.25s ease-out'
              }}
            >
              <div style={{ flexShrink: 0, marginTop: '1px', color: iconColor }}>
                {isError && <AlertCircle size={18} />}
                {isSuccess && <CheckCircle2 size={18} />}
                {isWarning && <AlertTriangle size={18} />}
                {!isError && !isSuccess && !isWarning && <Info size={18} />}
              </div>
              <div style={{ flex: 1, wordBreak: 'break-word' }}>
                {t.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: text,
                  opacity: 0.65,
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider so it never crashes
    return {
      success: (msg) => console.log('[Toast Success]', msg),
      error: (msg) => console.error('[Toast Error]', msg),
      warning: (msg) => console.warn('[Toast Warning]', msg),
      info: (msg) => console.info('[Toast Info]', msg)
    };
  }
  return context;
};
