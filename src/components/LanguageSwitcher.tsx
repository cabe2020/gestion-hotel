'use client';

import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslations } from './I18nProvider';
import { type Locale } from '@/lib/i18n';

const languages: { code: Locale; flag: string; label: string }[] = [
  { code: 'es', flag: '\u{1F1EA}\u{1F1F8}', label: 'Español' },
  { code: 'en', flag: '\u{1F1EC}\u{1F1E7}', label: 'English' },
  { code: 'pt', flag: '\u{1F1E7}\u{1F1F7}', label: 'Português' },
];

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const { locale, setLocale } = useTranslations();
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

  const current = languages.find((l) => l.code === locale) || languages[0];

  const handleSelect = (code: Locale) => {
    setLocale(code);
    setOpen(false);
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-[var(--color-accent)] transition-colors flex items-center gap-1"
        aria-label="Cambiar idioma"
      >
        <Globe className="h-5 w-5 text-[var(--color-muted-foreground)]" />
        <span className="text-sm">{current.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-44 popover overflow-hidden z-50">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-[var(--color-accent)] transition-colors ${
                locale === l.code
                  ? 'bg-[var(--color-primary-light)]/50 dark:bg-[var(--color-primary-light)]/20 text-[var(--color-primary)] font-medium'
                  : 'text-[var(--color-foreground)]'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
