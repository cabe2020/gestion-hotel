'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';

const shortcuts = [
  { keys: 'Ctrl+K', action: 'Buscar' },
  { keys: 'N', action: 'Nueva reserva', pages: ['/dashboard', '/bookings'] },
  { keys: 'G', action: 'Nuevo huésped', pages: ['/guests'] },
  { keys: 'R', action: 'Nueva habitación', pages: ['/rooms'] },
  { keys: 'Esc', action: 'Cerrar' },
];

const actionMap: Record<string, (() => void) | null> = {
  newBooking: null,
  newGuest: null,
  newRoom: null,
};

export function registerShortcutAction(
  action: 'newBooking' | 'newGuest' | 'newRoom',
  fn: (() => void) | null
) {
  actionMap[action] = fn;
}

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const pathname = usePathname();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'n' || e.key === 'N') {
        if (pathname === '/dashboard' || pathname === '/bookings') {
          e.preventDefault();
          actionMap.newBooking?.();
        }
      }
      if (e.key === 'g' || e.key === 'G') {
        if (pathname === '/guests') {
          e.preventDefault();
          actionMap.newGuest?.();
        }
      }
      if (e.key === 'r' || e.key === 'R') {
        if (pathname === '/rooms') {
          e.preventDefault();
          actionMap.newRoom?.();
        }
      }
      if (e.key === '?') {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      }
    },
    [pathname]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showHelp]);

  const availableShortcuts = shortcuts.filter(
    (s) => !s.pages || s.pages.some((p) => pathname === p || pathname?.startsWith(p + '/'))
  );

  return (
    <>
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 left-4 z-50 p-2 rounded-full card shadow-md border border-[var(--color-card-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:shadow-lg transition-all"
        title="Atajos de teclado"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {showHelp && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center"
          onClick={() => setShowHelp(false)}
        >
          <div className="fixed inset-0 bg-black/40" />
          <div
            className="relative card shadow-2xl border border-[var(--color-card-border)] w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--color-card-border)]">
              <h3 className="text-base font-semibold text-[var(--color-card-foreground)]">
                Atajos de Teclado
              </h3>
            </div>
            <div className="px-5 py-3 space-y-2">
              {availableShortcuts.map((s) => (
                <div key={s.keys} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-[var(--color-foreground)]">{s.action}</span>
                  <kbd className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-mono text-[var(--color-muted-foreground)] bg-[var(--color-secondary)] border border-[var(--color-border)] rounded">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-[var(--color-card-border)] text-xs text-[var(--color-muted-foreground)] text-center">
              Presiona{' '}
              <kbd className="px-1 py-0.5 bg-[var(--color-secondary)] border border-[var(--color-border)] rounded font-mono">
                ?
              </kbd>{' '}
              para abrir/cerrar
            </div>
          </div>
        </div>
      )}
    </>
  );
}
