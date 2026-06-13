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
  success: <CheckCircle className="h-5 w-5 text-[var(--color-success)] shrink-0" />,
  error: <XCircle className="h-5 w-5 text-[var(--color-destructive)] shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] shrink-0" />,
  info: <Info className="h-5 w-5 text-[var(--color-primary)] shrink-0" />,
};

const classMap: Record<ToastType, string> = {
  success: 'border-[var(--color-success)] bg-[var(--color-success-light)] text-[var(--color-success)] dark:border-[var(--color-success)] dark:bg-[var(--color-success-light)] dark:text-[var(--color-success)]',
  error: 'border-[var(--color-destructive)] bg-[var(--color-destructive-light)] text-[var(--color-destructive)] dark:border-[var(--color-destructive)] dark:bg-[var(--color-destructive-light)] dark:text-[var(--color-destructive)]',
  warning: 'border-[var(--color-warning)] bg-[var(--color-warning-light)] text-[var(--color-warning)] dark:border-[var(--color-warning)] dark:bg-[var(--color-warning-light)] dark:text-[var(--color-warning)]',
  info: 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:border-[var(--color-primary)] dark:bg-[var(--color-primary-light)] dark:text-[var(--color-primary)]',
};

let toastCounter = 0;

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const confirmResolvers = useRef<Map<string, (value: boolean) => void>>(new Map());
  const confirmTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    return () => {
      const timers = confirmTimers.current;
      const resolvers = confirmResolvers.current;
      for (const [, timer] of timers) {
        clearTimeout(timer);
      }
      for (const [, resolver] of resolvers) {
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
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 cursor-pointer ${classMap[toast.type]} ${toast.exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
            >
              {iconMap[toast.type]}
              <span className="text-sm font-medium flex-1">
                {toast.message}
              </span>
              {isConfirm ? (
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resolveConfirm(toast.id, true);
                    }}
                    className="btn-destructive px-2 py-1 text-xs"
                  >
                    {t('common.yes')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resolveConfirm(toast.id, false);
                    }}
                    className="btn-secondary px-2 py-1 text-xs"
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
                  className="p-0.5 rounded hover:bg-[var(--color-muted)] transition-colors"
                >
                  <X className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}