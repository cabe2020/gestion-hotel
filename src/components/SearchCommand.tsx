'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Users, CalendarCheck, Bed } from 'lucide-react';
import { useTranslations } from './I18nProvider';

interface SearchResult {
  id: string;
  label: string;
  subtitle: string;
  href: string;
}

interface SearchResults {
  huespedes: SearchResult[];
  reservas: SearchResult[];
  habitaciones: SearchResult[];
}

const typeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  huespedes: {
    label: 'Huéspedes',
    icon: <Users className="h-4 w-4 text-[var(--color-primary)]" />,
  },
  reservas: {
    label: 'Reservas',
    icon: <CalendarCheck className="h-4 w-4 text-[var(--color-success)]" />,
  },
  habitaciones: {
    label: 'Habitaciones',
    icon: <Bed className="h-4 w-4 text-[var(--color-warning)]" />,
  },
};

const openFnRef: { current: ((focus?: boolean) => void) | null } = { current: null };

export function openSearchCommand() {
  openFnRef.current?.(true);
}

export default function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t } = useTranslations();

  useEffect(() => {
    openFnRef.current = (focus?: boolean) => {
      setOpen(true);
      if (focus) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    return () => {
      openFnRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setActiveIndex(-1);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setActiveIndex(0);
        }
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const allResults = useCallback((): SearchResult[] => {
    if (!results) return [];
    return [...results.huespedes, ...results.reservas, ...results.habitaciones];
  }, [results]);

  const handleSelect = useCallback(
    (item: SearchResult) => {
      setOpen(false);
      setQuery('');
      setResults(null);
      router.push(item.href);
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = allResults();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        handleSelect(items[activeIndex]);
      }
    },
    [allResults, activeIndex, handleSelect]
  );

  if (!open) return null;

  const flat = allResults();

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Búsqueda"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          setOpen(false);
          setQuery('');
        }}
      />
      <div className="relative w-full max-w-lg mx-4 card overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 px-4 border-b border-[var(--color-card-border)]">
          <Search className="h-5 w-5 text-[var(--color-muted-foreground)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder')}
            className="w-full py-4 text-sm outline-none placeholder-[var(--color-input-placeholder)] text-[var(--color-foreground)] bg-transparent"
            role="combobox"
            aria-controls="search-results-list"
            aria-expanded={open}
            aria-activedescendant={
              activeIndex >= 0 && flat[activeIndex] ? `search-result-${activeIndex}` : undefined
            }
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults(null);
                inputRef.current?.focus();
              }}
              className="p-1 rounded hover:bg-[var(--color-accent)] transition-colors"
            >
              <X className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-[var(--color-muted-foreground)] bg-[var(--color-secondary)] border border-[var(--color-border)] rounded font-mono">
            Esc
          </kbd>
        </div>

        <div id="search-results-list" className="max-h-80 overflow-y-auto py-2" role="listbox">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('search.searching')}
            </div>
          )}
          {!loading && query && !results && (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('search.typeToSearch')}
            </div>
          )}
          {!loading && results && flat.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('search.noResults')}
            </div>
          )}
          {results &&
            (['huespedes', 'reservas', 'habitaciones'] as const).map((type) => {
              const items = results[type];
              if (items.length === 0) return null;
              const meta = typeLabels[type];
              let runningIndex = 0;
              for (const cat of ['huespedes', 'reservas', 'habitaciones'] as const) {
                if (cat === type) break;
                runningIndex += results[cat].length;
              }
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wide">
                    {meta.icon}
                    {meta.label}
                  </div>
                  {items.map((item, i) => {
                    const globalIndex = runningIndex + i;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        role="option"
                        aria-selected={activeIndex === globalIndex}
                        id={`search-result-${globalIndex}`}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          activeIndex === globalIndex
                            ? 'bg-[var(--color-primary-light)]/50 text-[var(--color-primary)]'
                            : 'text-[var(--color-foreground)] hover:bg-[var(--color-accent)]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.label}</p>
                          <p className="text-xs text-[var(--color-muted-foreground)] truncate">{item.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
        </div>

        {!query && (
          <div className="px-4 py-6 text-center text-sm text-[var(--color-muted-foreground)]">{t('search.hint')}</div>
        )}
      </div>
    </div>
  );
}