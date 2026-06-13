'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  highContrast: boolean;
  setTheme: (theme: Theme) => void;
  setHighContrast: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  highContrast: false,
  setTheme: () => {},
  setHighContrast: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getSystemHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [highContrast, setHighContrastState] = useState(false);

  const applyTheme = useCallback((t: Theme) => {
    const resolved = t === 'system' ? getSystemTheme() : t;
    setResolvedTheme(resolved);
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, []);

  const applyHighContrast = useCallback((enabled: boolean) => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, []);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      localStorage.setItem('theme', t);
      applyTheme(t);
    },
    [applyTheme]
  );

  const setHighContrast = useCallback(
    (enabled: boolean) => {
      setHighContrastState(enabled);
      localStorage.setItem('highContrast', String(enabled));
      applyHighContrast(enabled);
    },
    [applyHighContrast]
  );

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const initial = stored || 'system';
    setThemeState(initial);
    applyTheme(initial);

    const storedHC = localStorage.getItem('highContrast');
    const initialHC = storedHC ? storedHC === 'true' : getSystemHighContrast();
    setHighContrastState(initialHC);
    applyHighContrast(initialHC);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const hcq = window.matchMedia('(prefers-contrast: more)');
    const handler = () => {
      const current = localStorage.getItem('theme') as Theme | null;
      if (!current || current === 'system') {
        applyTheme('system');
      }
    };
    const hcHandler = () => {
      const current = localStorage.getItem('highContrast');
      if (current === null) {
        applyHighContrast(getSystemHighContrast());
      }
    };
    mq.addEventListener('change', handler);
    hcq.addEventListener('change', hcHandler);
    return () => {
      mq.removeEventListener('change', handler);
      hcq.removeEventListener('change', hcHandler);
    };
  }, [applyTheme, applyHighContrast]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, highContrast, setTheme, setHighContrast }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
