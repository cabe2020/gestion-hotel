'use client';

import { createContext, useCallback, useContext, useState, useRef, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useTranslations } from './I18nProvider';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />,
  error: <XCircle className="h-5 w-5 text-red-500 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />,
  info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
};

const bgMap: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  warning: 'border-yellow-200 bg-yellow-50',
  info: 'border-blue-200 bg-blue-50',
};

const textMap: Record<ToastType, string> = {
  success: 'text-green-800',
  error: 'text-red-800',
  warning: 'text-yellow-800',
  info: 'text-blue-800',
};

let toastCounter = 0;

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const confirmResolvers = useRef<Map<string, (value: boolean) => void>>(new Map());
  const confirmTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    return () => {
      for (const [, timer] of confirmTimers.current) {
        clearTimeout(timer);
      }
      for (const [, resolver] of confirmResolvers.current) {
        resolver(false);
      }
      confirmResolvers.current.clear();
      confirmTimers.current.clear();
    };
  }, []);
  const { t } = useTranslations();

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((item) => (item.id === id ? { ...item, exiting: true } : item)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 300);
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((item) => (item.id === id ? { ...item, exiting: true } : item)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 300);
  }, []);

  const resolveConfirm = useCallback(
    (id: string, value: boolean) => {
      const resolver = confirmResolvers.current.get(id);
      if (resolver) {
        resolver(value);
        confirmResolvers.current.delete(id);
      }
      const timer = confirmTimers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        confirmTimers.current.delete(id);
      }
      dismiss(id);
    },
    [dismiss]
  );

  const confirm = useCallback(
    (message: string): Promise<boolean> => {
      const id = `confirm-${++toastCounter}`;
      return new Promise<boolean>((resolve) => {
        confirmResolvers.current.set(id, resolve);
        const timer = setTimeout(() => {
          resolveConfirm(id, false);
        }, 30000);
        confirmTimers.current.set(id, timer);
        setToasts((prev) => [...prev, { id, message, type: 'warning' as ToastType }]);
      });
    },
    [resolveConfirm]
  );

  const value: ToastContextValue = {
    success: (m) => addToast(m, 'success'),
    error: (m) => addToast(m, 'error'),
    warning: (m) => addToast(m, 'warning'),
    info: (m) => addToast(m, 'info'),
    confirm,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          const isConfirm = toast.id.startsWith('confirm-');
          return (
            <div
              key={toast.id}
              onClick={() => !isConfirm && dismiss(toast.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 cursor-pointer ${
                bgMap[toast.type]
              } ${toast.exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
            >
              {iconMap[toast.type]}
              <span className={`text-sm font-medium flex-1 ${textMap[toast.type]}`}>
                {toast.message}
              </span>
              {isConfirm ? (
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resolveConfirm(toast.id, true);
                    }}
                    className="px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    {t('common.yes')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resolveConfirm(toast.id, false);
                    }}
                    className="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    {t('common.no')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(toast.id);
                  }}
                  className="p-0.5 rounded hover:bg-black/5 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
