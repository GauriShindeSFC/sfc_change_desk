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
      <div className="pointer-events-none fixed top-5 right-5 z-[9999] flex w-[calc(100%-40px)] max-w-[380px] flex-col gap-2.5">
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
              className="pointer-events-auto flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-[0.85rem] font-medium leading-[1.4] shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] [animation:slideIn_0.25s_ease-out]"
              style={{ backgroundColor: bg, borderColor: border, color: text }}
            >
              <div className="mt-px shrink-0" style={{ color: iconColor }}>
                {isError && <AlertCircle size={18} />}
                {isSuccess && <CheckCircle2 size={18} />}
                {isWarning && <AlertTriangle size={18} />}
                {!isError && !isSuccess && !isWarning && <Info size={18} />}
              </div>
              <div className="flex-1 break-words">
                {t.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="ml-1 flex cursor-pointer items-center border-none bg-transparent p-0 opacity-[0.65]"
                style={{ color: text }}
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
