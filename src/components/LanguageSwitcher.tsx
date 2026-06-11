"use client";

import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "./I18nProvider";
import { type Locale } from "@/lib/i18n";

const languages: { code: Locale; flag: string; label: string }[] = [
  { code: "es", flag: "\u{1F1EA}\u{1F1F8}", label: "Español" },
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", label: "English" },
  { code: "pt", flag: "\u{1F1E7}\u{1F1F7}", label: "Português" },
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
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
        aria-label="Cambiar idioma"
      >
        <Globe className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        <span className="text-sm">{current.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                locale === l.code ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-200"
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
