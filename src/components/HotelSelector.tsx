"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Building2, ChevronDown, Check } from "lucide-react";

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
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
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
      const res = await fetch("/api/users/me/hotels");
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
    const cookieValue = getCookie("selectedHotelId");
    if (cookieValue && hotels.some((h) => h.id === cookieValue)) {
      setSelectedHotelId(cookieValue);
    } else {
      const defaultId = session?.user?.hotelId || hotels[0]?.id;
      setSelectedHotelId(defaultId || null);
    }
  }, [hotels, session?.user?.hotelId]);

  useEffect(() => {
    if (!switching) return;
    setCookie("selectedHotelId", switching);
    window.location.reload();
  }, [switching]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentHotel = hotels.find((h) => h.id === selectedHotelId);

  if (hotels.length === 0) return null;

  if (hotels.length === 1) {
    const hotel = currentHotel || hotels[0];
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
        {hotel.logo ? (
          <img src={hotel.logo} alt={hotel.name} className="h-5 w-5 rounded object-cover" />
        ) : (
          <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
        )}
        <span className="text-sm font-semibold text-blue-800 truncate max-w-[160px]">
          {hotel.name}
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
      >
        {currentHotel?.logo ? (
          <img src={currentHotel.logo} alt={currentHotel.name} className="h-5 w-5 rounded object-cover" />
        ) : (
          <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
        )}
        <span className="text-sm font-semibold text-blue-800 truncate max-w-[160px]">
          {currentHotel?.name || "Seleccionar"}
        </span>
        <ChevronDown className={`h-4 w-4 text-blue-600 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase">Propiedades</p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {hotels.map((hotel) => (
              <button
                key={hotel.id}
                onClick={() => { setOpen(false); setSwitching(hotel.id); }}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-blue-50 transition-colors"
              >
                {hotel.logo ? (
                  <img src={hotel.logo} alt={hotel.name} className="h-5 w-5 rounded object-cover shrink-0" />
                ) : (
                  <Building2 className="h-4 w-4 text-gray-500 shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{hotel.name}</span>
                {hotel.id === selectedHotelId && (
                  <Check className="h-4 w-4 text-blue-600 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
