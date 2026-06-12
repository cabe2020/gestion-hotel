'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';

const shortcuts = [
  { keys: 'Ctrl+K', action: 'Buscar' },
  { keys: 'N', action: 'Nueva reserva', pages: ['/dashboard', '/bookings'] },
  { keys: 'G', action: 'Nuevo huesped', pages: ['/guests'] },
  { keys: 'R', action: 'Nueva habitacion', pages: ['/rooms'] },
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
        className="fixed bottom-4 left-4 z-50 p-2 rounded-full bg-white shadow-md border border-gray-200 text-gray-400 hover:text-gray-600 hover:shadow-lg transition-all"
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
            className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Atajos de Teclado</h3>
            </div>
            <div className="px-5 py-3 space-y-2">
              {availableShortcuts.map((s) => (
                <div key={s.keys} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-700">{s.action}</span>
                  <kbd className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-mono text-gray-600 bg-gray-100 border border-gray-200 rounded">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
              Presiona{' '}
              <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono">
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
