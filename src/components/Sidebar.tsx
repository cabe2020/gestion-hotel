'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bed,
  CalendarCheck,
  Calendar,
  FileText,
  Users,
  UserCog,
  DollarSign,
  LogIn,
  LogOut,
  Settings,
  Hotel,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Globe,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import { useTranslations } from './I18nProvider';
import { type TranslationKey } from '@/lib/i18n';

type NavItem = {
  i18nKey: TranslationKey;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const navigation: NavItem[] = [
  { i18nKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { i18nKey: 'nav.rooms', href: '/rooms', icon: Bed },
  { i18nKey: 'nav.bookings', href: '/bookings', icon: CalendarCheck },
  { i18nKey: 'nav.calendar', href: '/calendar', icon: Calendar },
  { i18nKey: 'nav.guests', href: '/guests', icon: Users },
  { i18nKey: 'nav.checkin', href: '/checkin', icon: LogIn },
  { i18nKey: 'nav.checkout', href: '/checkout', icon: LogOut },
  { i18nKey: 'nav.housekeeping', href: '/housekeeping', icon: Sparkles },
  { i18nKey: 'nav.invoices', href: '/invoices', icon: FileText },
  { i18nKey: 'nav.channels', href: '/channel-manager', icon: Globe, adminOnly: true },
  { i18nKey: 'nav.cash', href: '/cash', icon: DollarSign, adminOnly: true },
  { i18nKey: 'nav.users', href: '/users', icon: UserCog, adminOnly: true },
  { i18nKey: 'nav.reports', href: '/reports', icon: BarChart3, adminOnly: true },
  { i18nKey: 'nav.settings', href: '/settings', icon: Settings, adminOnly: true },
  { i18nKey: 'nav.audit', href: '/audit-logs', icon: Shield, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const { t } = useTranslations();

  const initials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 text-white flex items-center justify-between px-4 h-14">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src="/logos/logo-sidebar.svg" alt="Hosterix" className="h-7 w-auto" />
        </div>
        <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
          {initials}
        </div>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          'bg-slate-900 dark:bg-slate-950 text-white flex flex-col transition-all duration-300 h-screen',
          'fixed md:sticky top-0 z-50 md:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'w-64 md:w-16' : 'w-64'
        )}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
          <img
            src="/logos/logo-sidebar.svg"
            alt="Hosterix"
            className={cn('h-8 w-auto shrink-0', collapsed && '!h-7')}
          />
          {(!collapsed || mobileOpen) && (
            <span className="text-lg font-bold whitespace-nowrap">Hosterix</span>
          )}
          <button
            onClick={closeMobile}
            className="md:hidden ml-auto p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navigation
            .filter((item) => !item.adminOnly || session?.user?.role === 'admin')
            .map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.i18nKey}
                  href={item.href}
                  onClick={closeMobile}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800/50 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {(!collapsed || mobileOpen) && <span>{t(item.i18nKey)}</span>}
                </Link>
              );
            })}
        </nav>

        {session?.user && (
          <div className="px-4 py-3 border-t border-slate-700 flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
              {initials}
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.user.name || 'Usuario'}</p>
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  {t('btn.signOut')}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center py-3 border-t border-slate-700 hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </aside>
    </>
  );
}
