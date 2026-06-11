"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Habitaciones", href: "/rooms", icon: Bed },
  { name: "Reservas", href: "/bookings", icon: CalendarCheck },
  { name: "Calendario", href: "/calendar", icon: Calendar },
  { name: "Canales", href: "/channel-manager", icon: Globe },
  { name: "Huéspedes", href: "/guests", icon: Users },
  { name: "Caja", href: "/cash", icon: DollarSign },
  { name: "Facturas", href: "/invoices", icon: FileText },
  { name: "Usuarios", href: "/users", icon: UserCog },
  { name: "Check-in", href: "/checkin", icon: LogIn },
  { name: "Check-out", href: "/checkout", icon: LogOut },
  { name: "Housekeeping", href: "/housekeeping", icon: Sparkles },
  { name: "Reportes", href: "/reports", icon: BarChart3 },
  { name: "Configuración", href: "/settings", icon: Settings },
  { name: "Auditoría", href: "/audit-logs", icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
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
          <Hotel className="h-6 w-6 text-blue-400" />
          <span className="text-lg font-bold">GestHotel</span>
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
          "bg-slate-900 text-white flex flex-col transition-all duration-300 h-screen",
          "fixed md:sticky top-0 z-50 md:z-auto",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
          collapsed ? "w-64 md:w-16" : "w-64"
        )}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
          <Hotel className="h-8 w-8 text-blue-400 shrink-0" />
          {(!collapsed || mobileOpen) && (
            <span className="text-lg font-bold whitespace-nowrap">
              GestHotel
            </span>
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
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {(!collapsed || mobileOpen) && <span>{item.name}</span>}
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
                <p className="text-sm font-medium truncate">
                  {session.user.name || "Usuario"}
                </p>
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center py-3 border-t border-slate-700 hover:bg-slate-800 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </aside>
    </>
  );
}
