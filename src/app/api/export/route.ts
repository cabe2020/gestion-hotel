import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveHotelId } from "@/lib/rbac";

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return lines.join("\n");
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity") || "bookings";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const hotelId = await resolveHotelId(request.headers);
  if (!hotelId) {
    return NextResponse.json({ error: "No hotel" }, { status: 404 });
  }

  const dateFilter: Record<string, unknown> = {};
  if (from || to) {
    dateFilter.createdAt = {};
    if (from) (dateFilter.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (dateFilter.createdAt as Record<string, unknown>).lte = new Date(to + "T23:59:59");
  }

  let csv: string;
  let filename: string;

  switch (entity) {
    case "bookings": {
      const bookings = await prisma.booking.findMany({
        where: { hotelId, ...dateFilter },
        include: { guest: true, room: { include: { roomType: true } } },
        orderBy: { createdAt: "desc" },
      });
      csv = toCsv(
        ["Codigo", "Huesped", "Habitacion", "Tipo", "Check-in", "Check-out", "Noches", "Tarifa", "Total", "Pagado", "Estado", "Origen"],
        bookings.map((b) => [
          b.code,
          `${b.guest?.firstName ?? ""} ${b.guest?.lastName ?? ""}`.trim(),
          b.room?.number ?? "",
          b.room?.roomType?.name ?? "",
          fmtDate(b.checkIn),
          fmtDate(b.checkOut),
          String(b.totalNights),
          String(b.roomRate),
          String(b.totalAmount),
          String(b.paidAmount),
          b.status,
          b.source,
        ])
      );
      filename = "reservas";
      break;
    }
    case "guests": {
      const guests = await prisma.guest.findMany({
        where: { hotelId, ...dateFilter },
        include: { tags: { include: { tag: true } } },
        orderBy: { lastName: "asc" },
      });
      csv = toCsv(
        ["Nombre", "Apellido", "Email", "Telefono", "Documento", "Nacionalidad", "VIP", "Etiquetas"],
        guests.map((g) => [
          g.firstName,
          g.lastName,
          g.email,
          g.phone,
          g.idNumber,
          g.nationality,
          g.vip ? "Si" : "No",
          g.tags.map((t) => t.tag?.name).filter(Boolean).join("; "),
        ])
      );
      filename = "huespedes";
      break;
    }
    case "payments": {
      const payments = await prisma.payment.findMany({
        where: { booking: { hotelId } },
        include: { booking: { include: { guest: true } } },
        orderBy: { createdAt: "desc" },
      });
      const pf: Record<string, unknown> = {};
      if (from || to) {
        pf.createdAt = dateFilter.createdAt;
      }
      csv = toCsv(
        ["Fecha", "Reserva", "Huesped", "Monto", "Metodo", "Referencia"],
        payments.map((p) => [
          fmtDate(p.createdAt),
          p.booking?.code ?? "",
          `${p.booking?.guest?.firstName ?? ""} ${p.booking?.guest?.lastName ?? ""}`.trim(),
          String(p.amount),
          p.method,
          p.reference,
        ])
      );
      filename = "pagos";
      break;
    }
    case "cash-moves": {
      const moves = await prisma.cashMove.findMany({
        where: { hotelId, ...dateFilter },
        orderBy: { createdAt: "desc" },
      });
      csv = toCsv(
        ["Fecha", "Tipo", "Categoria", "Concepto", "Monto", "Metodo", "Referencia"],
        moves.map((m) => [
          fmtDate(m.createdAt),
          m.type === "income" ? "Ingreso" : "Gasto",
          m.category,
          m.concept,
          String(m.amount),
          m.method,
          m.reference,
        ])
      );
      filename = "movimientos-caja";
      break;
    }
    case "invoices": {
      const invoices = await prisma.invoice.findMany({
        where: { hotelId, ...dateFilter },
        include: { booking: { include: { guest: true, room: true } } },
        orderBy: { createdAt: "desc" },
      });
      csv = toCsv(
        ["Numero", "Fecha", "Huesped", "Habitacion", "Subtotal", "Impuestos", "Total", "Estado"],
        invoices.map((inv) => [
          inv.number,
          fmtDate(inv.date),
          `${inv.booking?.guest?.firstName ?? ""} ${inv.booking?.guest?.lastName ?? ""}`.trim(),
          inv.booking?.room?.number ?? "",
          String(inv.total - inv.taxAmount),
          String(inv.taxAmount),
          String(inv.total),
          inv.status,
        ])
      );
      filename = "facturas";
      break;
    }
    default:
      return NextResponse.json({ error: "Entidad no valida" }, { status: 400 });
  }

  const now = new Date().toISOString().split("T")[0];
  const disposition = `attachment; filename="${filename}-${now}.csv"`;

  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": disposition,
    },
  });
}
