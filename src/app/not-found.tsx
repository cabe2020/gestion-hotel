'use client';

import Link from 'next/link';
import { Home, Search, AlertCircle } from 'lucide-react';
import { useTranslations } from '@/components/I18nProvider';

export default function NotFound() {
  const { t } = useTranslations();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-gray-500 dark:text-gray-400" />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">404</h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">{t('error.pageNotFound')}</p>

          <p className="text-gray-500 dark:text-gray-500 mb-6">{t('error.pageNotFoundDesc')}</p>

          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="h-4 w-4" />
              {t('error.goHome')}
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Search className="h-4 w-4" />
              {t('error.goDashboard')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
