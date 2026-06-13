'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useTranslations } from './I18nProvider';

interface AutocompleteOption {
  [key: string]: unknown;
}

interface AutocompleteProps {
  endpoint: string;
  labelKey: string;
  valueKey: string;
  placeholder?: string;
  onSelect: (item: AutocompleteOption | null) => void;
  value?: string;
  displayValue?: string;
  onCreateNew?: () => void;
  onClear?: () => void;
  createNewLabel?: string;
}

export default function Autocomplete({
  endpoint,
  labelKey,
  valueKey,
  placeholder = 'Buscar...',
  onSelect,
  value: _value,
  displayValue,
  onCreateNew,
  onClear,
  createNewLabel,
}: AutocompleteProps) {
  const [query, setQuery] = useState(displayValue || '');
  const [results, setResults] = useState<AutocompleteOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslations();
  const resolvedCreateNewLabel = createNewLabel ?? t('autocomplete.createNew');

  useEffect(() => {
    if (displayValue !== undefined) {
      setQuery(displayValue);
    }
  }, [displayValue]);

  const fetchResults = useCallback(
    async (q: string) => {
      if (q.length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : data.data || []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [endpoint]
  );

  const handleInputChange = (val: string) => {
    setQuery(val);
    setShowDropdown(true);
    setHighlightIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(val);
    }, 300);
  };

  const handleSelect = (item: AutocompleteOption) => {
    const label = String(item[labelKey] || '');
    setQuery(label);
    setShowDropdown(false);
    onSelect(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) {
      if (e.key === 'ArrowDown' && query.length >= 1) {
        setShowDropdown(true);
        fetchResults(query);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1 + (onCreateNew ? 1 : 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      if (highlightIndex < results.length) {
        handleSelect(results[highlightIndex]);
      } else if (onCreateNew) {
        onCreateNew();
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearValue = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    if (onClear) {
      onClear();
    } else {
      onSelect(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (query.length >= 1) {
              setShowDropdown(true);
              fetchResults(query);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input-field pr-8"
          autoComplete="off"
        />
        {query ? (
          <button
            onClick={clearValue}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />
        )}
      </div>

      {showDropdown && (results.length > 0 || loading || onCreateNew) && (
        <div className="absolute z-50 w-full mt-1 popover rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">{t('search.searching')}</div>
          )}

          {!loading &&
            results.map((item, idx) => (
              <button
                key={String(item[valueKey] || idx)}
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-accent)] transition-colors ${
                  idx === highlightIndex ? 'bg-[var(--color-primary-light)]/50' : ''
                }`}
                type="button"
              >
                {String(item[labelKey] || '')}
              </button>
            ))}

          {!loading && results.length === 0 && query.length >= 1 && !onCreateNew && (
            <div className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">{t('search.noResults')}</div>
          )}

          {!loading && onCreateNew && query.length >= 1 && (
            <button
              onClick={() => {
                onCreateNew();
                setShowDropdown(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm text-[var(--color-primary)] font-medium hover:bg-[var(--color-accent)] border-t border-[var(--color-popover-border)] ${
                highlightIndex === results.length ? 'bg-[var(--color-primary-light)]/50' : ''
              }`}
              type="button"
            >
              + {resolvedCreateNewLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}