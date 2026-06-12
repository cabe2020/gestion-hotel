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
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <form onSubmit={handleSearch} className="flex items-center gap-3 flex-1 max-w-md">
        <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder={t('header.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent"
        />
        <button
          type="button"
          onClick={() => openSearchCommand()}
          className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded font-mono hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
          >
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('header.notifications')}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    {t('header.markAllRead')}
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {latestNotifications.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                    {t('header.noNotifications')}
                  </p>
                ) : (
                  latestNotifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 ${
                        !n.read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      {typeIcon(n.type)}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${!n.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {n.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2">
          <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {initials}
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {session?.user?.name || 'Usuario'}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="text-xs text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors ml-1"
          >
            {t('header.exit')}
          </button>
        </div>
      </div>
    </header>
  );
}
