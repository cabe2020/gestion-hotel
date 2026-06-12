'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type Locale, type TranslationKey, getDictionary } from '@/lib/i18n';

interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'es',
  t: (key) => key,
  setLocale: () => {},
});

export function useTranslations() {
  return useContext(I18nContext);
}

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');

  useEffect(() => {
    const stored = document.cookie
      .split('; ')
      .find((row) => row.startsWith('locale='))
      ?.split('=')[1] as Locale | undefined;
    if (stored && ['es', 'en', 'pt'].includes(stored)) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `locale=${l};path=/;max-age=31536000`;
  }, []);

  const t = useCallback(
    (key: TranslationKey) => {
      const dict = getDictionary(locale);
      return dict[key] || key;
    },
    [locale]
  );

  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>;
}
