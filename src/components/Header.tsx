'use client';

import { Bell, Search, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { openSearchCommand } from './SearchCommand';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslations } from './I18nProvider';
import HotelSelector from './HotelSelector';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function typeIcon(type: string) {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    default:
      return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
  }
}

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslations();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    fetchNotifications();
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/mark-all-read', { method: 'PUT' });
    fetchNotifications();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/guests?q=${encodeURIComponent(q)}`);
  };

  const initials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const latestNotifications = notifications.slice(0, 10);

  return (
    <header className="bg-[var(--color-card)] border-b border-[var(--color-card-border)] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <form onSubmit={handleSearch} className="flex items-center gap-3 flex-1 max-w-md">
        <Search className="h-5 w-5 text-[var(--color-muted-foreground)]" />
        <input
          type="text"
          placeholder={t('header.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full outline-none text-sm text-[var(--color-foreground)] placeholder-[var(--color-input-placeholder)] bg-transparent"
        />
        <button
          type="button"
          onClick={() => openSearchCommand()}
          className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-[var(--color-muted-foreground)] bg-[var(--color-secondary)] border border-[var(--color-border)] rounded font-mono hover:bg-[var(--color-secondary-hover)] transition-colors"
          title="Buscar (Ctrl+K)"
        >
          Ctrl+K
        </button>
      </form>

      <div className="flex items-center gap-2">
        <HotelSelector />
        <ThemeToggle />
        <LanguageSwitcher />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-[var(--color-accent)] transition-colors"
            aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
          >
            <Bell className="h-5 w-5 text-[var(--color-muted-foreground)]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-[var(--color-destructive)] rounded-full flex items-center justify-center text-[var(--color-destructive-foreground)] text-xs font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 popover overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-popover-border)]">
                <h3 className="text-sm font-semibold text-[var(--color-popover-foreground)]">
                  {t('header.notifications')}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
                  >
                    {t('header.markAllRead')}
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {latestNotifications.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted-foreground)] text-center py-6">
                    {t('header.noNotifications')}
                  </p>
                ) : (
                  latestNotifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--color-accent)] transition-colors border-b border-[var(--color-popover-border)] ${
                        !n.read
                          ? 'bg-[var(--color-primary-light)]/50 dark:bg-[var(--color-primary-light)]/20'
                          : ''
                      }`}
                    >
                      {typeIcon(n.type)}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${!n.read ? 'font-semibold text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                          {n.message}
                        </p>
                        <p className="text-xs text-[var(--color-input-placeholder)] mt-0.5">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="h-2 w-2 bg-[var(--color-primary)] rounded-full mt-1.5 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2">
          <div className="h-8 w-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[var(--color-primary-foreground)] text-sm font-semibold">
            {initials}
          </div>
          <span className="text-sm font-medium text-[var(--color-foreground)]">
            {session?.user?.name || 'Usuario'}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] transition-colors ml-1"
          >
            {t('header.exit')}
          </button>
        </div>
      </div>
    </header>
  );
}
