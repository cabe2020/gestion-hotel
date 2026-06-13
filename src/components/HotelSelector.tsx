'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import Image from 'next/image';

interface Hotel {
  id: string;
  name: string;
  logo: string;
}

function setCookie(name: string, value: string) {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value};path=/;expires=${expires};SameSite=Lax`;
}

function getCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

export default function HotelSelector() {
  const { data: session } = useSession();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchHotels = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me/hotels');
      if (res.ok) {
        const data = await res.json();
        setHotels(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  useEffect(() => {
    if (hotels.length === 0) return;
    const cookieValue = getCookie('selectedHotelId');
    if (cookieValue && hotels.some((h) => h.id === cookieValue)) {
      setSelectedHotelId(cookieValue);
    } else {
      const defaultId = session?.user?.hotelId || hotels[0]?.id;
      setSelectedHotelId(defaultId || null);
    }
  }, [hotels, session?.user?.hotelId]);

  useEffect(() => {
    if (!switching) return;
    setCookie('selectedHotelId', switching);
    window.location.reload();
  }, [switching]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentHotel = hotels.find((h) => h.id === selectedHotelId);

  if (hotels.length === 0) return null;

  if (hotels.length === 1) {
    const hotel = currentHotel || hotels[0];
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary-light)] border border-[var(--color-primary)] rounded-lg">
        {hotel.logo ? (
          <Image
            src={hotel.logo}
            alt={hotel.name}
            width={20}
            height={20}
            className="h-5 w-5 rounded object-cover"
          />
        ) : (
          <Building2 className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
        )}
        <span className="text-sm font-semibold text-[var(--color-primary)] truncate max-w-[160px]">
          {hotel.name}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary-light)] border border-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors"
      >
        {currentHotel?.logo ? (
          <Image
            src={currentHotel.logo}
            alt={currentHotel.name}
            width={20}
            height={20}
            className="h-5 w-5 rounded object-cover"
          />
        ) : (
          <Building2 className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
        )}
        <span className="text-sm font-semibold text-[var(--color-primary)] truncate max-w-[160px]">
          {currentHotel?.name || 'Seleccionar'}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--color-primary)] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 popover overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-[var(--color-popover-border)]">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase">
              Propiedades
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {hotels.map((hotel) => (
              <button
                key={hotel.id}
                onClick={() => {
                  setOpen(false);
                  setSwitching(hotel.id);
                }}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-[var(--color-accent)] transition-colors"
              >
                {hotel.logo ? (
                  <Image
                    src={hotel.logo}
                    alt={hotel.name}
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded object-cover shrink-0"
                  />
                ) : (
                  <Building2 className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />
                )}
                <span className="text-sm font-medium text-[var(--color-popover-foreground)] flex-1 truncate">
                  {hotel.name}
                </span>
                {hotel.id === selectedHotelId && (
                  <Check className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
