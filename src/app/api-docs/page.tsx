'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    import('@/lib/openapi').then((module) => {
      setSpec(module.openApiSpec);
    });

    const style = document.createElement('style');
    style.textContent = `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { color: #2563eb; }
      .swagger-ui .scheme-container { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .swagger-ui .opblock-tag { cursor: pointer; }
      .swagger-ui .opblock-tag:hover .view-url { opacity: 1; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">API Documentation</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Interactive API documentation powered by Swagger UI
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            {spec && SwaggerUI ? (
              <SwaggerUI
                spec={spec}
                deepLinking={true}
                displayRequestDuration={true}
                filter={true}
                showExtensions={true}
                showCommonExtensions={true}
                tryItOutEnabled={true}
                persistAuthorization={true}
                layout="BaseLayout"
                docExpansion="list"
                defaultModelsExpandDepth={1}
                defaultModelExpandDepth={1}
                defaultModelRendering="example"
                displayOperationId={false}
                syntaxHighlight={true}
                syntaxHighlightTheme="monokai"
              />
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Cargando documentación...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
