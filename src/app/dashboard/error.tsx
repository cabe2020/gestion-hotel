'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-md">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Algo salió mal
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Ocurrió un error al cargar esta página. Intenta de nuevo.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
