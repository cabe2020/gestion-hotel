'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  BedDouble,
  LogIn,
  LogOut,
  XCircle,
  Eye,
  Pencil,
} from 'lucide-react';
import { formatCurrency, bookingStatuses } from '@/lib/utils';
import Link from 'next/link';

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
}

interface Room {
  id: string;
  number: string;
  roomType: { name: string; basePrice: number };
}

interface Booking {
  id: string;
  code: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  adults: number;
  children: number;
  source: string;
  guest: Guest;
  room: Room;
}

interface RoomWithBookings {
  id: string;
  number: string;
  status?: string;
  roomType: { name: string; basePrice: number };
  bookings: Booking[];
}

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const CELL_WIDTH = 40;
const ROOM_COL_WIDTH = 140;
const DEFAULT_RANGE = 21;

const statusBarColors: Record<string, { bg: string; text: string; dot: string; hover: string }> = {
  confirmed: {
    bg: 'bg-blue-500',
    text: 'text-white',
    dot: 'bg-blue-300',
    hover: 'hover:bg-blue-600',
  },
  'checked-in': {
    bg: 'bg-emerald-500',
    text: 'text-white',
    dot: 'bg-emerald-300',
    hover: 'hover:bg-emerald-600',
  },
  'checked-out': {
    bg: 'bg-slate-400',
    text: 'text-white',
    dot: 'bg-slate-300',
    hover: 'hover:bg-slate-500',
  },
  cancelled: {
    bg: 'bg-red-400',
    text: 'text-white',
    dot: 'bg-red-200',
    hover: 'hover:bg-red-500',
  },
  'no-show': {
    bg: 'bg-amber-500',
    text: 'text-white',
    dot: 'bg-amber-300',
    hover: 'hover:bg-amber-600',
  },
};

const roomStatusIcons: Record<string, { icon: string; color: string }> = {
  available: { icon: '', color: '' },
  occupied: { icon: '', color: '' },
  maintenance: { icon: '🔧', color: 'bg-yellow-50' },
  'out-of-order': { icon: '🚫', color: 'bg-red-50' },
  cleaning: { icon: '🧹', color: 'bg-purple-50' },
};

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function daysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

function getDayIndex(d: Date) {
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

interface ContextMenuState {
  x: number;
  y: number;
  booking: Booking;
}

interface TooltipState {
  booking: Booking;
  x: number;
  y: number;
}

export default function CalendarPage() {
  const [rooms, setRooms] = useState<RoomWithBookings[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return addDays(today, -3);
  });
  const [numDays, setNumDays] = useState(DEFAULT_RANGE);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [dragBookingId, setDragBookingId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [showCancelled, setShowCancelled] = useState(true);
  const [groupByType, setGroupByType] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const fetchRooms = useCallback(() => {
    fetch('/api/rooms')
      .then((r) => r.json())
      .then(setRooms);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  useEffect(() => {
    if (todayRef.current && gridRef.current) {
      const container = gridRef.current;
      const todayEl = todayRef.current;
      const scrollLeft = todayEl.offsetLeft - container.clientWidth / 2 + CELL_WIDTH;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }
  }, [rooms]);

  const dates = useMemo(() => {
    return Array.from({ length: numDays }, (_, i) => addDays(startDate, i));
  }, [startDate, numDays]);

  const filteredRooms = useMemo(() => {
    let result = [...rooms];
    if (filterText) {
      const q = filterText.toLowerCase();
      result = result.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.roomType?.name.toLowerCase().includes(q) ||
          r.bookings.some(
            (b) =>
              b.guest?.firstName?.toLowerCase().includes(q) ||
              b.guest?.lastName?.toLowerCase().includes(q)
          )
      );
    }
    if (!showCancelled) {
      result = result.map((r) => ({
        ...r,
        bookings: r.bookings.filter((b) => b.status !== 'cancelled'),
      }));
    }
    return result;
  }, [rooms, filterText, showCancelled]);

  const roomGroups = useMemo(() => {
    if (!groupByType) return [{ name: '', rooms: filteredRooms }];
    const groups: { name: string; rooms: RoomWithBookings[] }[] = [];
    const map = new Map<string, RoomWithBookings[]>();
    filteredRooms.forEach((r) => {
      const typeName = r.roomType?.name || 'Sin tipo';
      if (!map.has(typeName)) map.set(typeName, []);
      map.get(typeName)!.push(r);
    });
    map.forEach((rms, name) => groups.push({ name, rooms: rms }));
    return groups;
  }, [filteredRooms, groupByType]);

  const prev = () => setStartDate((d) => addDays(d, -7));
  const next = () => setStartDate((d) => addDays(d, 7));
  const goToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setStartDate(addDays(today, -3));
  };
  const zoomIn = () => setNumDays((n) => Math.max(7, n - 7));
  const zoomOut = () => setNumDays((n) => Math.min(60, n + 7));

  const getHeaderText = () => {
    const first = dates[0];
    const last = dates[dates.length - 1];
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} - ${last.getDate()} ${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
    }
    if (first.getFullYear() === last.getFullYear()) {
      return `${first.getDate()} ${MONTHS[first.getMonth()].slice(0, 3)} - ${last.getDate()} ${MONTHS[last.getMonth()].slice(0, 3)} ${first.getFullYear()}`;
    }
    return `${first.getDate()}/${first.getMonth() + 1}/${first.getFullYear()} - ${last.getDate()}/${last.getMonth() + 1}/${last.getFullYear()}`;
  };

  const getBookingStyle = (booking: Booking) => {
    const ci = new Date(booking.checkIn);
    ci.setHours(0, 0, 0, 0);
    const co = new Date(booking.checkOut);
    co.setHours(0, 0, 0, 0);

    let startIdx = daysBetween(startDate, ci);
    if (startIdx < 0) startIdx = 0;
    const endOffset = daysBetween(startDate, co);
    const span = Math.min(endOffset, numDays) - startIdx;
    if (span <= 0 && startIdx >= numDays) return null;
    const visibleSpan = Math.max(1, span);

    return {
      left: startIdx * CELL_WIDTH,
      width: visibleSpan * CELL_WIDTH - 2,
    };
  };

  const handleDragStart = (e: React.DragEvent, bookingId: string) => {
    const booking = rooms.flatMap((r) => r.bookings).find((b) => b.id === bookingId);
    if (!booking || !['confirmed', 'checked-in'].includes(booking.status)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('bookingId', bookingId);
    e.dataTransfer.effectAllowed = 'move';
    setDragBookingId(bookingId);
  };

  const handleDragEnd = () => setDragBookingId(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, roomId: string, targetDate: Date) => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData('bookingId');
    if (!bookingId) return;

    const booking = rooms.flatMap((r) => r.bookings).find((b) => b.id === bookingId);
    if (!booking) return;

    const ci = new Date(booking.checkIn);
    const co = new Date(booking.checkOut);
    const duration = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / 86400000));
    const newCheckIn = new Date(targetDate);
    newCheckIn.setHours(0, 0, 0, 0);
    const newCheckOut = addDays(newCheckIn, duration);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: newCheckIn.toISOString(),
          checkOut: newCheckOut.toISOString(),
          roomId,
        }),
      });
      if (res.ok) fetchRooms();
    } catch {}
    setDragBookingId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, booking: Booking) => {
    e.preventDefault();
    setTooltip(null);
    setContextMenu({ x: e.clientX, y: e.clientY, booking });
  };

  const handleBookingClick = (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    setSelectedBooking(booking);
    setShowDetail(true);
  };

  const handleBookingHover = (booking: Booking, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      booking,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 4,
    });
  };

  const handleContextAction = async (action: string, booking: Booking) => {
    setContextMenu(null);
    switch (action) {
      case 'edit':
        setSelectedBooking(booking);
        setShowDetail(true);
        break;
      case 'checkin':
        try {
          const res = await fetch(`/api/bookings/${booking.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'checked-in' }),
          });
          if (res.ok) fetchRooms();
        } catch {}
        break;
      case 'checkout':
        try {
          const res = await fetch(`/api/bookings/${booking.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'checked-out' }),
          });
          if (res.ok) fetchRooms();
        } catch {}
        break;
      case 'cancel':
        try {
          const res = await fetch(`/api/bookings/${booking.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' }),
          });
          if (res.ok) fetchRooms();
        } catch {}
        break;
      case 'view':
        setSelectedBooking(booking);
        setShowDetail(true);
        break;
    }
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateString(today);
    let occupied = 0;
    let arriving = 0;
    let departing = 0;
    rooms.forEach((r) => {
      const hasOccupancy = r.bookings.some((b) => {
        if (b.status === 'cancelled') return false;
        const ci = new Date(b.checkIn).toISOString().split('T')[0];
        const co = new Date(b.checkOut).toISOString().split('T')[0];
        return todayStr >= ci && todayStr < co;
      });
      if (hasOccupancy) occupied++;
      r.bookings.forEach((b) => {
        if (b.status === 'cancelled') return;
        const ci = new Date(b.checkIn).toISOString().split('T')[0];
        const co = new Date(b.checkOut).toISOString().split('T')[0];
        if (ci === todayStr) arriving++;
        if (co === todayStr) departing++;
      });
    });
    return {
      total: rooms.length,
      occupied,
      available: rooms.length - occupied,
      occupancy: rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0,
      arriving,
      departing,
    };
  }, [rooms]);

  const renderDayHeaders = () => (
    <div className="flex sticky top-0 z-20 bg-white border-b border-gray-200">
      <div
        className="shrink-0 border-r border-gray-200 bg-slate-50"
        style={{ width: ROOM_COL_WIDTH }}
      />
      <div className="flex" style={{ width: numDays * CELL_WIDTH }}>
        {dates.map((d, i) => {
          const isToday = sameDay(d, new Date());
          const isWeekend = getDayIndex(d) >= 5;
          return (
            <div
              key={i}
              ref={isToday ? todayRef : undefined}
              className={`text-center border-r border-gray-100 py-1.5 ${
                isToday
                  ? 'bg-blue-50 border-l-2 border-l-blue-500'
                  : isWeekend
                    ? 'bg-slate-50/70'
                    : 'bg-slate-50/30'
              }`}
              style={{ width: CELL_WIDTH }}
            >
              <div
                className={`text-[9px] font-medium uppercase tracking-wide ${isToday ? 'text-blue-600' : 'text-gray-400'}`}
              >
                {DAYS_SHORT[getDayIndex(d)]}
              </div>
              <div
                className={`text-sm font-semibold leading-tight ${isToday ? 'text-blue-700 bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto' : 'text-gray-700'}`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMonthRow = () => (
    <div className="flex border-b border-gray-100">
      <div
        className="shrink-0 border-r border-gray-200 bg-slate-50"
        style={{ width: ROOM_COL_WIDTH }}
      />
      <div className="flex" style={{ width: numDays * CELL_WIDTH }}>
        {dates.map((d, i) => {
          const isMonthStart = d.getDate() === 1;
          const isToday = sameDay(d, new Date());
          if (!isMonthStart && i > 0) return null;
          let span = 1;
          for (let j = i + 1; j < dates.length && dates[j].getDate() !== 1; j++) span++;
          if (i + span > dates.length) span = dates.length - i;
          return (
            <div
              key={i}
              className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-l ${
                isToday ? 'border-l-blue-500' : 'border-l-gray-200'
              } ${isMonthStart && i > 0 ? 'bg-slate-100' : 'bg-transparent'}`}
              style={{ width: span * CELL_WIDTH }}
            >
              {isMonthStart || i === 0 ? MONTHS[d.getMonth()].slice(0, 3).toUpperCase() : ''}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAvailabilityRow = () => (
    <div className="flex border-b border-gray-100">
      <div
        className="shrink-0 border-r border-gray-200 bg-slate-50 flex items-center px-3"
        style={{ width: ROOM_COL_WIDTH }}
      >
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Disponibles
        </span>
      </div>
      <div className="flex" style={{ width: numDays * CELL_WIDTH }}>
        {dates.map((d, i) => {
          const dateStr = toDateString(d);
          const occupied = rooms.filter((r) =>
            r.bookings.some((b) => {
              if (b.status === 'cancelled') return false;
              const ci = new Date(b.checkIn).toISOString().split('T')[0];
              const co = new Date(b.checkOut).toISOString().split('T')[0];
              return dateStr >= ci && dateStr < co;
            })
          ).length;
          const avail = rooms.length - occupied;
          const pct = rooms.length > 0 ? (avail / rooms.length) * 100 : 100;
          const isToday = sameDay(d, new Date());
          const isWeekend = getDayIndex(d) >= 5;
          let bgColor = 'bg-emerald-500';
          let textColor = 'text-white';
          if (pct <= 0) {
            bgColor = 'bg-red-500';
          } else if (pct <= 20) {
            bgColor = 'bg-red-400';
          } else if (pct <= 50) {
            bgColor = 'bg-amber-400';
            textColor = 'text-gray-900';
          } else if (pct <= 80) {
            bgColor = 'bg-emerald-400';
          }
          return (
            <div
              key={i}
              className={`flex items-center justify-center border-r border-gray-100 ${isWeekend ? 'bg-slate-50/50' : ''}`}
              style={{ width: CELL_WIDTH }}
            >
              <span
                className={`${bgColor} ${textColor} text-[9px] font-bold rounded px-1 py-0.5 min-w-[20px] text-center leading-none ${isToday ? 'ring-1 ring-blue-500' : ''}`}
              >
                {avail}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderRoomRow = (room: RoomWithBookings) => {
    return (
      <div className="flex border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
        <div
          className="shrink-0 border-r border-gray-200 px-3 py-2 flex flex-col justify-center bg-white group-hover:bg-gray-50/50 transition-colors"
          style={{ width: ROOM_COL_WIDTH }}
        >
          <div className="flex items-center gap-1.5">
            {roomStatusIcons[room.status || 'available']?.icon && (
              <span className="text-xs">{roomStatusIcons[room.status || 'available'].icon}</span>
            )}
            <span className="text-sm font-bold text-gray-900">{room.number}</span>
          </div>
          <span className="text-[10px] text-gray-400 truncate">{room.roomType?.name}</span>
        </div>
        <div
          className="relative flex-1"
          style={{ width: numDays * CELL_WIDTH }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, room.id, startDate)}
        >
          {dates.map((d, i) => {
            const isToday = sameDay(d, new Date());
            const isWeekend = getDayIndex(d) >= 5;
            const dateStr = toDateString(d);
            const hasCheckIn = room.bookings.some(
              (b) =>
                new Date(b.checkIn).toISOString().split('T')[0] === dateStr &&
                b.status !== 'cancelled'
            );
            const hasCheckOut = room.bookings.some(
              (b) =>
                new Date(b.checkOut).toISOString().split('T')[0] === dateStr &&
                b.status !== 'cancelled'
            );
            return (
              <div
                key={i}
                className={`absolute top-0 bottom-0 border-r border-gray-50 ${
                  isWeekend ? 'bg-slate-50/40' : ''
                }`}
                style={{
                  left: i * CELL_WIDTH,
                  width: CELL_WIDTH,
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, room.id, d)}
              >
                {isToday && (
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-blue-400/30 z-[1]" />
                )}
                {hasCheckIn && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-[2]">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm" />
                  </div>
                )}
                {hasCheckOut && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 z-[2]">
                    <div className="w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white shadow-sm" />
                  </div>
                )}
              </div>
            );
          })}
          {room.bookings.map((booking) => {
            const style = getBookingStyle(booking);
            if (!style) return null;
            const colors = statusBarColors[booking.status] || statusBarColors.confirmed;
            const isDragging = dragBookingId === booking.id;
            const isCancelled = booking.status === 'cancelled';
            const draggable = ['confirmed', 'checked-in'].includes(booking.status);
            const ci = new Date(booking.checkIn);
            const co = new Date(booking.checkOut);
            const nights = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / 86400000));
            const guestName =
              `${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`.trim();
            const showName = style.width > 50;
            const showNights = style.width > 90;
            const showCode = style.width > 140;
            return (
              <div
                key={booking.id}
                draggable={draggable}
                onDragStart={(e) => handleDragStart(e, booking.id)}
                onDragEnd={handleDragEnd}
                onContextMenu={(e) => handleContextMenu(e, booking)}
                onClick={(e) => handleBookingClick(booking, e)}
                onMouseEnter={(e) => handleBookingHover(booking, e)}
                onMouseLeave={() => setTooltip(null)}
                className={`absolute top-[3px] bottom-[3px] z-[5] ${colors.bg} ${colors.text} ${colors.hover} rounded-md cursor-pointer transition-all flex items-center px-1.5 gap-1 shadow-sm ${
                  isDragging ? 'opacity-40 scale-95' : ''
                } ${isCancelled ? 'opacity-60 line-through' : ''}`}
                style={{
                  left: style.left,
                  width: style.width,
                }}
              >
                {showName && (
                  <span className="text-[10px] font-semibold truncate leading-none">
                    {guestName}
                  </span>
                )}
                {showNights && (
                  <span className="text-[9px] opacity-80 shrink-0 leading-none">{nights}n</span>
                )}
                {showCode && (
                  <span className="text-[8px] opacity-60 truncate leading-none">
                    {booking.code}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRoomGroup = (group: { name: string; rooms: RoomWithBookings[] }, idx: number) => (
    <div key={idx}>
      {groupByType && group.name && (
        <div className="flex border-b border-gray-200 bg-slate-100/80">
          <div
            className="shrink-0 border-r border-gray-200 px-3 py-1.5 flex items-center gap-2"
            style={{ width: ROOM_COL_WIDTH }}
          >
            <BedDouble className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider truncate">
              {group.name}
            </span>
            <span className="text-[10px] text-gray-400 ml-auto">{group.rooms.length}</span>
          </div>
          <div className="flex items-center px-2" style={{ width: numDays * CELL_WIDTH }}>
            <span className="text-[10px] text-gray-400">
              {group.rooms.length} habitacion{group.rooms.length !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
      )}
      {group.rooms.map((room) => renderRoomRow(room))}
    </div>
  );

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    const booking = contextMenu.booking;
    const items = [
      { label: 'Ver Detalles', action: 'view', icon: Eye },
      { label: 'Editar', action: 'edit', icon: Pencil },
    ];
    if (booking.status === 'confirmed') {
      items.push({ label: 'Check-in', action: 'checkin', icon: LogIn });
    }
    if (booking.status === 'checked-in') {
      items.push({ label: 'Check-out', action: 'checkout', icon: LogOut });
    }
    if (['confirmed', 'checked-in'].includes(booking.status)) {
      items.push({ label: 'Cancelar', action: 'cancel', icon: XCircle });
    }

    return (
      <div
        ref={contextMenuRef}
        className="fixed z-[60] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px] overflow-hidden"
        style={{
          left: Math.min(contextMenu.x, window.innerWidth - 200),
          top: Math.min(contextMenu.y, window.innerHeight - 250),
        }}
      >
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-900 truncate">
            {booking.guest?.firstName} {booking.guest?.lastName}
          </p>
          <p className="text-[10px] text-gray-500">{booking.code}</p>
        </div>
        {items.map((item) => (
          <button
            key={item.action}
            onClick={() => handleContextAction(item.action, booking)}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
              item.action === 'cancel'
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>
    );
  };

  const renderTooltip = () => {
    if (!tooltip) return null;
    const b = tooltip.booking;
    const ci = new Date(b.checkIn);
    const co = new Date(b.checkOut);
    const nights = Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / 86400000));
    const colors = statusBarColors[b.status] || statusBarColors.confirmed;
    return (
      <div
        className="fixed z-[55] bg-gray-900 text-white rounded-lg shadow-xl px-3 py-2 text-xs pointer-events-none max-w-[250px]"
        style={{
          left: Math.min(tooltip.x, window.innerWidth - 270),
          top: tooltip.y,
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
          <span className="font-semibold">
            {b.guest?.firstName} {b.guest?.lastName}
          </span>
        </div>
        <div className="text-gray-300 space-y-0.5">
          <p>
            {ci.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} →{' '}
            {co.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} ({nights}n)
          </p>
          <p>
            Hab. {b.room?.number} · {formatCurrency(b.totalAmount)}
          </p>
          <p className="text-gray-400">{b.code}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <Header />
      <div className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-gray-900">Calendario</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar habitación o huésped..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                />
              </div>
              <Link
                href="/bookings?action=new"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva Reserva
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setGroupByType(true)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    groupByType
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Agrupado
                </button>
                <button
                  onClick={() => setGroupByType(false)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    !groupByType
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Lista
                </button>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCancelled}
                  onChange={(e) => setShowCancelled(e.target.checked)}
                  className="rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                />
                Canceladas
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={zoomIn}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                title="Acercar"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                onClick={zoomOut}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                title="Alejar"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14" />
                </svg>
              </button>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <button
                onClick={prev}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-w-[200px] text-center"
              >
                {getHeaderText()}
              </button>
              <button
                onClick={next}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={goToday}
                className="px-2.5 py-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Hoy
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-gray-500">Disponible: {stats.available}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] text-gray-500">Ocupado: {stats.occupied}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white shadow" />
                <span className="text-[10px] text-gray-500">Check-in: {stats.arriving}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white shadow" />
                <span className="text-[10px] text-gray-500">Check-out: {stats.departing}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-700 bg-gray-100 rounded px-2 py-0.5">
                {stats.occupancy}% occ
              </span>
            </div>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {bookingStatuses.map((s) => {
              const bar = statusBarColors[s.value];
              return (
                <div key={s.value} className="flex items-center gap-1">
                  <div
                    className={`h-4 px-1.5 rounded ${bar?.bg || 'bg-gray-400'} ${bar?.text || 'text-white'} text-[9px] font-medium flex items-center`}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto" ref={gridRef}>
          <div className="min-w-fit">
            {renderMonthRow()}
            {renderDayHeaders()}
            {renderAvailabilityRow()}
            {roomGroups.map((group, idx) => renderRoomGroup(group, idx))}
            {filteredRooms.length === 0 && (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <p className="text-sm">No se encontraron habitaciones</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {renderContextMenu()}
      {renderTooltip()}

      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={`Reserva ${selectedBooking?.code || ''}`}
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4">
              <div>
                <p className="text-xs text-gray-500">Huésped</p>
                <p className="text-sm font-medium">
                  {selectedBooking.guest?.firstName} {selectedBooking.guest?.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Habitación</p>
                <p className="text-sm font-medium">
                  Hab. {selectedBooking.room?.number} ({selectedBooking.room?.roomType?.name})
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Check-in</p>
                <p className="text-sm font-medium">
                  {new Date(selectedBooking.checkIn).toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Check-out</p>
                <p className="text-sm font-medium">
                  {new Date(selectedBooking.checkOut).toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Noches</p>
                <p className="text-sm font-medium">
                  {Math.max(
                    1,
                    Math.ceil(
                      (new Date(selectedBooking.checkOut).getTime() -
                        new Date(selectedBooking.checkIn).getTime()) /
                        86400000
                    )
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-sm font-medium">{formatCurrency(selectedBooking.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Adultos</p>
                <p className="text-sm font-medium">{selectedBooking.adults}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Niños</p>
                <p className="text-sm font-medium">{selectedBooking.children}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fuente</p>
                <p className="text-sm font-medium capitalize">{selectedBooking.source || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Estado</p>
                {(() => {
                  const s = bookingStatuses.find((st) => st.value === selectedBooking.status);
                  return s ? (
                    <StatusBadge label={s.label} color={s.color} />
                  ) : (
                    <span>{selectedBooking.status}</span>
                  );
                })()}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {selectedBooking.status === 'confirmed' && (
                <button
                  onClick={async () => {
                    await fetch(`/api/bookings/${selectedBooking.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'checked-in' }),
                    });
                    fetchRooms();
                    setShowDetail(false);
                  }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Check-in
                </button>
              )}
              {selectedBooking.status === 'checked-in' && (
                <button
                  onClick={async () => {
                    await fetch(`/api/bookings/${selectedBooking.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'checked-out' }),
                    });
                    fetchRooms();
                    setShowDetail(false);
                  }}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Check-out
                </button>
              )}
              <a
                href="/bookings"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                Ver todas las reservas
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
