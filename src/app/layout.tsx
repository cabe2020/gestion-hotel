import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import AuthProvider from '@/components/AuthProvider';
import ThemeProvider from '@/components/ThemeProvider';
import I18nProvider from '@/components/I18nProvider';
import PWARegister from '@/components/PWARegister';
import ToastProvider from '@/components/Toast';
import SearchCommand from '@/components/SearchCommand';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';

export const metadata: Metadata = {
  title: 'Hosterix - Sistema de Gestion Hotelera',
  description: 'Sistema completo de gestion hotelera: reservas, habitaciones, caja y mas',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme:dark)');var isDark=t==='dark'||(!t&&m.matches)||(t==='system'&&m.matches);if(isDark){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light')}else{document.documentElement.classList.add('light');document.documentElement.classList.remove('dark')}}catch(e){}})();`,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="theme-transition">
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <ToastProvider>
                <SearchCommand />
                <KeyboardShortcuts />
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1 bg-[var(--color-background)] overflow-auto md:w-auto w-full pt-14 md:pt-0">
                    {children}
                  </main>
                </div>
                <PWARegister />
              </ToastProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}