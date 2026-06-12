'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      setInstallPrompt(null);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 popover p-4 z-50 flex items-center gap-3">
      <div className="bg-[var(--color-primary-light)]/50 dark:bg-[var(--color-primary-light)]/20 p-2 rounded-lg shrink-0">
        <Download className="h-5 w-5 text-[var(--color-primary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-popover-foreground)]">Instalar Hosterix</p>
        <p className="text-xs text-[var(--color-muted-foreground)]">Usar como app en tu dispositivo</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleInstall}
          className="text-xs font-medium btn-primary px-3 py-1.5"
        >
          Instalar
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1 rounded hover:bg-[var(--color-accent)] transition-colors text-[var(--color-muted-foreground)]"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}