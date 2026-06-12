'use client';

import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Contrast, Check } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useTranslations } from './I18nProvider';

export default function ThemeToggle() {
  const { theme, highContrast, setTheme, setHighContrast } = useTheme();
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const themeOptions = [
    { value: 'light' as const, label: t('theme.light'), icon: Sun },
    { value: 'dark' as const, label: t('theme.dark'), icon: Moon },
    { value: 'system' as const, label: t('theme.system'), icon: Monitor },
  ];

  const currentTheme = themeOptions.find((o) => o.value === theme) || themeOptions[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-[var(--color-accent)] transition-colors text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        aria-label={t('theme.change')}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {currentTheme?.icon && <currentTheme.icon className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 popover rounded-lg shadow-lg z-50 py-1" role="listbox">
          <div className="px-3 py-2 border-b border-[var(--color-popover-border)]">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase">{t('theme.theme')}</p>
          </div>
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setTheme(opt.value);
                setOpen(false);
              }}
              role="option"
              aria-selected={theme === opt.value}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--color-accent)] transition-colors ${
                theme === opt.value ? 'bg-[var(--color-primary-light)]/50 text-[var(--color-primary)]' : 'text-[var(--color-foreground)]'
              }`}
            >
              <opt.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{opt.label}</span>
              {theme === opt.value && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}

          <div className="border-t border-[var(--color-popover-border)] my-1" />
          <div className="px-3 py-2 border-b border-[var(--color-popover-border)]">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase">{t('theme.accessibility')}</p>
          </div>
          <button
            onClick={() => setHighContrast(!highContrast)}
            role="menuitemcheckbox"
            aria-checked={highContrast}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--color-accent)] transition-colors ${
              highContrast ? 'bg-[var(--color-primary-light)]/50 text-[var(--color-primary)]' : 'text-[var(--color-foreground)]'
            }`}
          >
            <Contrast className="h-4 w-4 shrink-0" />
            <span className="flex-1">{t('theme.highContrast')}</span>
            {highContrast && <Check className="h-4 w-4 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
}