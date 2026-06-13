'use client';

import { useEffect } from 'react';
import { RefreshCw, BedDouble, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from '@/components/I18nProvider';

export default function RoomsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslations();

  useEffect(() => {
    console.error('Rooms error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('error.roomsError')}
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('error.roomsLoadFailed')}</p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              {t('error.tryAgain')}
            </button>
            <Link
              href="/rooms"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <BedDouble className="h-4 w-4" />
              {t('error.refreshRooms')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
