"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Header from "@/components/Header";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Calendar,
  Clock,
  Plus,
} from "lucide-react";
import { formatCurrency, bookingStatuses } from "@/lib/utils";
import Link from "next/link";

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
  roomType: { name: string; basePrice: number };
  bookings: Booking[];
}

type ViewMode = "month" | "week" | "day";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAYS_FULL = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const statusColors: Record<string, string> = {
  confirmed: "bg-blue-500",
  "checked-in": "bg-green-500",
  "checked-out": "bg-gray-400",
  cancelled: "bg-red-400",
  "no-show": "bg-yellow-500",
};

const statusLightColors: Record<string, string> = {
  confirmed: "bg-blue-100 border-blue-300 text-blue-800",
  "checked-in": "bg-green-100 border-green-300 text-green-800",
  "checked-out": "bg-gray-100 border-gray-300 text-gray-600",
  cancelled: "bg-red-100 border-red-300 text-red-800",
  "no-show": "bg-yellow-100 border-yellow-300 text-yellow-800",
};

const statusBorderColors: Record<string, string> = {
  confirmed: "border-l-blue-500",
  "checked-in": "border-l-green-500",
  "checked-out": "border-l-gray-400",
  cancelled: "border-l-red-400",
  "no-show": "border-l-yellow-500",
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getWeekStart(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function bookingDuration(b: Booking) {
  const ci = new Date(b.checkIn);
  const co = new Date(b.checkOut);
  return Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / 86400000));
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface ContextMenuState {
  x: number;
  y: number;
  booking: Booking;
}

export default function CalendarPage() {
  const [rooms, setRooms] = useState<RoomWithBookings[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragBookingId, setDragBookingId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const fetchRooms = useCallback(() => {
    fetch("/api/rooms").then((r) => r.json()).then(setRooms);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const totalCells = startOffset + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length < rows * 7) days.push(null);
    return days;
  }, [daysInMonth, startOffset, rows]);

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const dayDate = useMemo(() => {
    const d = new Date(currentDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const getBookingsForDay = (room: RoomWithBookings, day: Date) => {
    const dateStr = toDateString(day);
    return room.bookings.filter((b) => {
      const ci = new Date(b.checkIn).toISOString().split("T")[0];
      const co = new Date(b.checkOut).toISOString().split("T")[0];
      return dateStr >= ci && dateStr < co && b.status !== "cancelled";
    });
  };

  const getBookingsForMonthDay = (room: RoomWithBookings, day: number) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return room.bookings.filter((b) => {
      const ci = new Date(b.checkIn).toISOString().split("T")[0];
      const co = new Date(b.checkOut).toISOString().split("T")[0];
      return dateStr >= ci && dateStr < co && b.status !== "cancelled";
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day &&
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const isDateToday = (d: Date) => sameDay(d, new Date());

  const prev = () => {
    if (viewMode === "month")
      setCurrentDate(new Date(year, month - 1, 1));
    else if (viewMode === "week")
      setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };
  const next = () => {
    if (viewMode === "month")
      setCurrentDate(new Date(year, month + 1, 1));
    else if (viewMode === "week")
      setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const getHeaderText = () => {
    if (viewMode === "month")
      return `${MONTHS[month]} ${year}`;
    if (viewMode === "week") {
      const ws = weekStart;
      const we = addDays(ws, 6);
      return `${ws.getDate()} ${MONTHS[ws.getMonth()]} - ${we.getDate()} ${MONTHS[we.getMonth()]} ${we.getFullYear()}`;
    }
    return `${DAYS_FULL[dayDate.getDay() === 0 ? 6 : dayDate.getDay() - 1]} ${dayDate.getDate()} ${MONTHS[dayDate.getMonth()]} ${year}`;
  };

  const handleDragStart = (e: React.DragEvent, bookingId: string) => {
    const booking = rooms
      .flatMap((r) => r.bookings)
      .find((b) => b.id === bookingId);
    if (!booking || !["confirmed", "checked-in"].includes(booking.status)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("bookingId", bookingId);
    e.dataTransfer.effectAllowed = "move";
    setDragBookingId(bookingId);
  };

  const handleDragEnd = () => {
    setDragBookingId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (
    e: React.DragEvent,
    roomId: string,
    targetDate: Date
  ) => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData("bookingId");
    if (!bookingId) return;

    const booking = rooms
      .flatMap((r) => r.bookings)
      .find((b) => b.id === bookingId);
    if (!booking) return;

    const duration = bookingDuration(booking);
    const newCheckIn = new Date(targetDate);
    newCheckIn.setHours(0, 0, 0, 0);
    const newCheckOut = addDays(newCheckIn, duration);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn: newCheckIn.toISOString(),
          checkOut: newCheckOut.toISOString(),
          roomId,
        }),
      });
      if (res.ok) {
        fetchRooms();
      }
    } catch {
      // silently fail
    }
    setDragBookingId(null);
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    booking: Booking
  ) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, booking });
  };

  const handleContextAction = async (
    action: string,
    booking: Booking
  ) => {
    setContextMenu(null);
    switch (action) {
      case "edit":
        setSelectedBooking(booking);
        setShowDetail(true);
        break;
      case "checkin":
        try {
          const res = await fetch(`/api/bookings/${booking.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "checked-in" }),
          });
          if (res.ok) fetchRooms();
        } catch {}
        break;
      case "checkout":
        try {
          const res = await fetch(`/api/bookings/${booking.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "checked-out" }),
          });
          if (res.ok) fetchRooms();
        } catch {}
        break;
      case "cancel":
        try {
          const res = await fetch(`/api/bookings/${booking.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "cancelled" }),
          });
          if (res.ok) fetchRooms();
        } catch {}
        break;
      case "view":
        setSelectedBooking(booking);
        setShowDetail(true);
        break;
    }
  };

  const availableRoomsByDate = useMemo(() => {
    const dates =
      viewMode === "month"
        ? Array.from({ length: daysInMonth }, (_, i) =>
            new Date(year, month, i + 1)
          )
        : viewMode === "week"
        ? weekDays
        : [dayDate];

    return dates.map((d) => {
      const occupied = rooms.filter((r) => {
        const dateStr = toDateString(d);
        return r.bookings.some((b) => {
          if (b.status === "cancelled") return false;
          const ci = new Date(b.checkIn).toISOString().split("T")[0];
          const co = new Date(b.checkOut).toISOString().split("T")[0];
          return dateStr >= ci && dateStr < co;
        });
      }).length;
      return { date: d, available: rooms.length - occupied, total: rooms.length };
    });
  }, [rooms, viewMode, year, month, daysInMonth, weekDays, dayDate]);

  const dayWidth = `${100 / 7}%`;

  const renderLegend = () => (
    <div className="flex gap-2 flex-wrap text-xs">
      {bookingStatuses.map((s) => (
        <div key={s.value} className="flex items-center gap-1.5">
          <div className={`h-3 w-3 rounded ${statusColors[s.value]}`} />
          <span className="text-gray-600">{s.label}</span>
        </div>
      ))}
    </div>
  );

  const renderAvailabilityRow = (dates: Date[]) => (
    <div className="flex border-b border-gray-200 bg-green-50/50">
      <div className="w-32 shrink-0 px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase border-r border-gray-100">
        Disponibles
      </div>
      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${dates.length}, 1fr)` }}>
        {dates.map((d, i) => {
          const info = availableRoomsByDate.find((a) => sameDay(a.date, d));
          const avail = info?.available ?? 0;
          const total = info?.total ?? 0;
          const pct = total > 0 ? (avail / total) * 100 : 100;
          const color =
            pct > 50
              ? "text-green-700 bg-green-100"
              : pct > 20
              ? "text-yellow-700 bg-yellow-100"
              : "text-red-700 bg-red-100";
          return (
            <div
              key={i}
              className={`px-1 py-1 text-center text-[10px] font-bold ${color} ${isDateToday(d) ? "ring-1 ring-blue-400" : ""}`}
            >
              {avail}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMonthView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-32 shrink-0 px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
            Habitación
          </div>
          {calendarDays.slice(0, 7).map((_, i) => (
            <div
              key={i}
              className="px-1 py-2 text-center text-xs font-semibold text-gray-500 uppercase"
              style={{ width: dayWidth }}
            >
              {DAYS[i]}
            </div>
          ))}
        </div>
        {renderAvailabilityRow(
          Array.from(
            { length: daysInMonth },
            (_, i) => new Date(year, month, i + 1)
          ).concat(
            Array(startOffset).fill(null),
            Array(rows * 7 - totalCells).fill(null)
          ).filter(Boolean) as Date[]
        )}
        {rooms.map((room) => (
          <div
            key={room.id}
            className="flex border-b border-gray-50 last:border-0"
          >
            <div className="w-32 shrink-0 px-3 py-2 flex flex-col justify-center border-r border-gray-100">
              <span className="text-sm font-bold text-gray-900">
                Hab. {room.number}
              </span>
              <span className="text-xs text-gray-500">
                {room.roomType?.name}
              </span>
            </div>
            <div className="flex-1 grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const bookings = day
                  ? getBookingsForMonthDay(room, day)
                  : [];
                const isFirstDay = (booking: Booking) => {
                  if (!day) return false;
                  const ci = new Date(booking.checkIn);
                  return (
                    ci.getFullYear() === year &&
                    ci.getMonth() === month &&
                    ci.getDate() === day
                  );
                };
                const isLastDay = (booking: Booking) => {
                  if (!day) return false;
                  const co = new Date(booking.checkOut);
                  const prevDay = new Date(co);
                  prevDay.setDate(prevDay.getDate() - 1);
                  return (
                    prevDay.getFullYear() === year &&
                    prevDay.getMonth() === month &&
                    prevDay.getDate() === day
                  );
                };
                const today = day ? isToday(day) : false;
                const dayDate = day
                  ? new Date(year, month, day)
                  : null;
                return (
                  <div
                    key={idx}
                    className={`px-0.5 py-1 min-h-[48px] border-r border-gray-50 last:border-r-0 relative ${today ? "bg-blue-50" : ""} ${!day ? "bg-gray-25" : ""}`}
                    style={{ width: "100%" }}
                    onDragOver={day ? handleDragOver : undefined}
                    onDrop={
                      day && dayDate
                        ? (e) => handleDrop(e, room.id, dayDate)
                        : undefined
                    }
                    onClick={() => {
                      if (day) {
                        setSelectedBooking(null);
                      }
                    }}
                  >
                    {day && (
                      <span
                        className={`text-[10px] ${today ? "font-bold text-blue-600" : "text-gray-400"}`}
                      >
                        {day}
                      </span>
                    )}
                    <div className="space-y-0.5 mt-0.5">
                      {bookings.map((booking) => {
                        const first = isFirstDay(booking);
                        const last = isLastDay(booking);
                        const status = booking.status;
                        const draggable = [
                          "confirmed",
                          "checked-in",
                        ].includes(status);
                        return (
                          <div
                            key={booking.id}
                            draggable={draggable}
                            onDragStart={(e) =>
                              handleDragStart(e, booking.id)
                            }
                            onDragEnd={handleDragEnd}
                            onContextMenu={(e) =>
                              handleContextMenu(e, booking)
                            }
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDetail(true);
                            }}
                            className={`${statusColors[status]} text-white text-[9px] leading-tight px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity truncate ${first ? "rounded-l-md" : ""} ${last ? "rounded-r-md" : ""} ${dragBookingId === booking.id ? "opacity-50" : ""}`}
                            title={`${booking.guest?.firstName} ${booking.guest?.lastName} - ${booking.code}`}
                          >
                            {first && (
                              <span className="font-medium">
                                {booking.guest?.firstName?.charAt(0)}
                                {booking.guest?.lastName?.charAt(0)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-32 shrink-0 px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
            Habitación
          </div>
          {weekDays.map((d, i) => (
            <div
              key={i}
              className={`px-2 py-2 text-center text-xs font-semibold uppercase ${isDateToday(d) ? "bg-blue-50 text-blue-600" : "text-gray-500"}`}
              style={{ width: dayWidth }}
            >
              {DAYS[i]} {d.getDate()}
            </div>
          ))}
        </div>
        {renderAvailabilityRow(weekDays)}
        {rooms.map((room) => (
          <div
            key={room.id}
            className="flex border-b border-gray-50 last:border-0"
          >
            <div className="w-32 shrink-0 px-3 py-2 flex flex-col justify-center border-r border-gray-100">
              <span className="text-sm font-bold text-gray-900">
                Hab. {room.number}
              </span>
              <span className="text-xs text-gray-500">
                {room.roomType?.name}
              </span>
            </div>
            <div className="flex-1 grid grid-cols-7">
              {weekDays.map((d, i) => {
                const bookings = getBookingsForDay(room, d);
                const today = isDateToday(d);
                const startsOnDay = (b: Booking) => sameDay(new Date(b.checkIn), d);
                return (
                  <div
                    key={i}
                    className={`px-1 py-1 min-h-[80px] border-r border-gray-50 last:border-r-0 relative ${today ? "bg-blue-50" : ""}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, room.id, d)}
                  >
                    <div className="space-y-1">
                      {bookings.map((booking) => {
                        const starts = startsOnDay(booking);
                        const duration = bookingDuration(booking);
                        const draggable = ["confirmed", "checked-in"].includes(booking.status);
                        return (
                          <div
                            key={booking.id}
                            draggable={draggable}
                            onDragStart={(e) => handleDragStart(e, booking.id)}
                            onDragEnd={handleDragEnd}
                            onContextMenu={(e) => handleContextMenu(e, booking)}
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDetail(true);
                            }}
                            className={`${statusLightColors[booking.status] || "bg-gray-100 border-gray-300 text-gray-800"} border-l-3 ${statusBorderColors[booking.status] || "border-l-gray-400"} text-[10px] leading-tight px-1.5 py-1 rounded-r cursor-pointer hover:opacity-80 transition-opacity ${dragBookingId === booking.id ? "opacity-50" : ""}`}
                            title={`${booking.guest?.firstName} ${booking.guest?.lastName} - ${booking.code}`}
                          >
                            <p className="font-semibold truncate">
                              {booking.guest?.firstName} {booking.guest?.lastName?.charAt(0)}.
                            </p>
                            {starts && (
                              <p className="text-[9px] opacity-75">
                                {duration}n - {formatCurrency(booking.totalAmount)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDayView = () => {
    const filteredRooms = rooms.length > 0 ? rooms : [];
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            <div className="w-24 shrink-0 px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
              Hora
            </div>
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="flex-1 px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase border-l border-gray-100"
              >
                Hab. {room.number}
              </div>
            ))}
          </div>
          {HOURS.map((hour) => {
            const hourDate = new Date(dayDate);
            hourDate.setHours(hour, 0, 0, 0);
            return (
              <div
                key={hour}
                className="flex border-b border-gray-50 last:border-0"
              >
                <div className="w-24 shrink-0 px-3 py-2 text-xs text-gray-400 border-r border-gray-100 flex items-start">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {filteredRooms.map((room) => {
                  const bookings = getBookingsForDay(room, dayDate);
                  const isCheckInHour = (b: Booking) => {
                    const ci = new Date(b.checkIn);
                    return sameDay(ci, dayDate) && ci.getHours() === hour;
                  };
                  const isCheckOutHour = (b: Booking) => {
                    const co = new Date(b.checkOut);
                    return sameDay(co, dayDate) && co.getHours() === hour;
                  };
                  const relevantBookings = bookings.filter(
                    (b) => isCheckInHour(b) || isCheckOutHour(b)
                  );
                  const allDayBookings =
                    hour === 0
                      ? bookings.filter(
                          (b) => !isCheckInHour(b) && !isCheckOutHour(b)
                        )
                      : [];
                  return (
                    <div
                      key={room.id}
                      className="flex-1 px-1 py-1 min-h-[40px] border-l border-gray-50 relative"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, room.id, dayDate)}
                    >
                      {relevantBookings.map((booking) => {
                        const isCheckin = isCheckInHour(booking);
                        const draggable = ["confirmed", "checked-in"].includes(booking.status);
                        return (
                          <div
                            key={booking.id}
                            draggable={draggable}
                            onDragStart={(e) => handleDragStart(e, booking.id)}
                            onDragEnd={handleDragEnd}
                            onContextMenu={(e) => handleContextMenu(e, booking)}
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDetail(true);
                            }}
                            className={`${statusLightColors[booking.status] || "bg-gray-100 border-gray-300 text-gray-800"} border-l-3 ${statusBorderColors[booking.status] || "border-l-gray-400"} text-[10px] leading-tight px-1.5 py-1 rounded-r cursor-pointer hover:opacity-80 transition-opacity mb-0.5 ${dragBookingId === booking.id ? "opacity-50" : ""}`}
                          >
                            <p className="font-semibold truncate">
                              {booking.guest?.firstName} {booking.guest?.lastName}
                            </p>
                            <p className="text-[9px] opacity-75">
                              {isCheckin ? "Check-in" : "Check-out"} - Hab. {booking.room?.number}
                            </p>
                          </div>
                        );
                      })}
                      {allDayBookings.map((booking) => {
                        const draggable = ["confirmed", "checked-in"].includes(booking.status);
                        return (
                          <div
                            key={booking.id}
                            draggable={draggable}
                            onDragStart={(e) => handleDragStart(e, booking.id)}
                            onDragEnd={handleDragEnd}
                            onContextMenu={(e) => handleContextMenu(e, booking)}
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDetail(true);
                            }}
                            className={`${statusLightColors[booking.status] || "bg-gray-100 border-gray-300 text-gray-800"} border-l-3 ${statusBorderColors[booking.status] || "border-l-gray-400"} text-[10px] leading-tight px-1.5 py-1 rounded-r cursor-pointer hover:opacity-80 transition-opacity mb-0.5 ${dragBookingId === booking.id ? "opacity-50" : ""}`}
                          >
                            <p className="font-semibold truncate">
                              {booking.guest?.firstName} {booking.guest?.lastName}
                            </p>
                            <p className="text-[9px] opacity-75">
                              Estancia - {formatCurrency(booking.totalAmount)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    const booking = contextMenu.booking;
    const items = [
      { label: "Ver Detalles", action: "view" },
      { label: "Editar", action: "edit" },
    ];
    if (booking.status === "confirmed") {
      items.push({ label: "Check-in", action: "checkin" });
    }
    if (booking.status === "checked-in") {
      items.push({ label: "Check-out", action: "checkout" });
    }
    if (["confirmed", "checked-in"].includes(booking.status)) {
      items.push({ label: "Cancelar", action: "cancel" });
    }

    return (
      <div
        ref={contextMenuRef}
        className="fixed z-[60] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
        style={{
          left: Math.min(contextMenu.x, window.innerWidth - 180),
          top: Math.min(contextMenu.y, window.innerHeight - 200),
        }}
      >
        {items.map((item) => (
          <button
            key={item.action}
            onClick={() => handleContextAction(item.action, booking)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
              item.action === "cancel" ? "text-red-600 hover:bg-red-50" : "text-gray-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div>
      <Header />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            Calendario de Reservas
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("month")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "month"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Mes
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "week"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                Semana
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "day"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                Día
              </button>
            </div>

            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-1.5">
              <button
                onClick={prev}
                className="p-1 rounded hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToday}
                className="text-sm font-semibold text-gray-900 min-w-[180px] text-center"
              >
                {getHeaderText()}
              </button>
              <button
                onClick={next}
                className="p-1 rounded hover:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button onClick={goToday} className="btn-secondary text-xs">
              Hoy
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {renderLegend()}
          <Link
            href="/bookings?action=new"
            className="btn-primary text-xs flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear Reserva
          </Link>
        </div>

        {viewMode === "month" && renderMonthView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "day" && renderDayView()}

        {renderContextMenu()}

        <Modal
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          title={`Reserva ${selectedBooking?.code || ""}`}
        >
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-xs text-gray-500">Huésped</p>
                  <p className="text-sm font-medium">
                    {selectedBooking.guest?.firstName}{" "}
                    {selectedBooking.guest?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Habitación</p>
                  <p className="text-sm font-medium">
                    Hab. {selectedBooking.room?.number} (
                    {selectedBooking.room?.roomType?.name})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Check-in</p>
                  <p className="text-sm font-medium">
                    {new Date(
                      selectedBooking.checkIn
                    ).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Check-out</p>
                  <p className="text-sm font-medium">
                    {new Date(
                      selectedBooking.checkOut
                    ).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(selectedBooking.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Estado</p>
                  {(() => {
                    const s = bookingStatuses.find(
                      (st) => st.value === selectedBooking.status
                    );
                    return s ? (
                      <StatusBadge label={s.label} color={s.color} />
                    ) : (
                      <span>{selectedBooking.status}</span>
                    );
                  })()}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {selectedBooking.status === "confirmed" && (
                  <button
                    onClick={async () => {
                      await fetch(`/api/bookings/${selectedBooking.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "checked-in" }),
                      });
                      fetchRooms();
                      setShowDetail(false);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Check-in
                  </button>
                )}
                {selectedBooking.status === "checked-in" && (
                  <button
                    onClick={async () => {
                      await fetch(`/api/bookings/${selectedBooking.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "checked-out" }),
                      });
                      fetchRooms();
                      setShowDetail(false);
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                  >
                    Check-out
                  </button>
                )}
                <a
                  href="/bookings"
                  className="btn-secondary text-sm"
                >
                  Ver todas las reservas
                </a>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
