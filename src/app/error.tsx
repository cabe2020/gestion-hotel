'use client';

import { useEffect } from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from '@/components/I18nProvider';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslations();

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('error.somethingWentWrong')}
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('error.unexpectedError')}</p>

          {error.digest && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded">
              {error.digest}
            </p>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              {t('error.tryAgain')}
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Home className="h-4 w-4" />
              {t('error.goHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
