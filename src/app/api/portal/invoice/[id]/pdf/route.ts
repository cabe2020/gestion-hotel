import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      hotel: true,
      invoice: true,
      payments: true,
      room: { include: { roomType: true } },
    },
  });

  if (!booking || !booking.invoice) {
    return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
  }

  const inv = booking.invoice;
  const nights = booking.totalNights;
  const currency = booking.hotel.currency;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Factura ${inv.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
      line-height: 1.5;
    }
    .container { max-width: 800px; margin: 40px auto; padding: 0 20px; }
    .btn-print {
      text-align: center; margin-bottom: 24px;
    }
    .btn-print button {
      padding: 10px 28px; background: #1e3a8a; color: #fff;
      border: none; border-radius: 6px; cursor: pointer;
      font-size: 14px; font-weight: 600;
    }
    .btn-print button:hover { background: #1e40af; }
    .header {
      text-align: center; padding-bottom: 24px;
      border-bottom: 3px solid #1e3a8a; margin-bottom: 24px;
    }
    .header h1 { color: #1e3a8a; font-size: 24px; margin-bottom: 4px; }
    .header h2 { color: #6b7280; font-size: 18px; font-weight: 400; }
    .header .date { color: #9ca3af; font-size: 13px; margin-top: 4px; }
    .section { margin-bottom: 24px; }
    .section h3 {
      color: #1e3a8a; font-size: 14px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
      border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px;
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
    .info-grid .label { color: #6b7280; font-size: 13px; }
    .info-grid .value { font-size: 13px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    td:last-child, th:last-child { text-align: right; }
    .grand-total td { font-weight: 700; font-size: 15px; border-top: 2px solid #1f2937; border-bottom: none; }
    .grand-total td:last-child { font-size: 16px; }
    .sub-row td { color: #6b7280; border-bottom: none; }
    .payment-row td:last-child { color: #059669; font-weight: 600; }
    .payments-table { margin-top: 8px; }
    .footer {
      margin-top: 32px; padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center; font-size: 11px; color: #9ca3af;
    }
    @media print {
      .btn-print { display: none; }
      body { padding: 0; }
      .container { margin: 0 auto; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="btn-print">
      <button onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>

    <div class="header">
      <h1>${booking.hotel.name}</h1>
      <h2>Factura ${inv.number}</h2>
      <p class="date">${new Date(inv.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="section">
      <h3>Huésped</h3>
      <div class="info-grid">
        <span class="label">Nombre</span>
        <span class="value">${booking.guest.firstName} ${booking.guest.lastName}</span>
        <span class="label">Email</span>
        <span class="value">${booking.guest.email || '-'}</span>
        <span class="label">Teléfono</span>
        <span class="value">${booking.guest.phone || '-'}</span>
      </div>
    </div>

    <div class="section">
      <h3>Reserva</h3>
      <table>
        <tr><th style="width:40%">Código</th><td>${booking.code}</td></tr>
        <tr><th>Habitación</th><td>${booking.room?.number || 'N/A'} ${booking.room?.roomType ? `- ${booking.room.roomType.name}` : ''}</td></tr>
        <tr><th>Check-in</th><td>${new Date(booking.checkIn).toLocaleDateString('es-ES')}</td></tr>
        <tr><th>Check-out</th><td>${new Date(booking.checkOut).toLocaleDateString('es-ES')}</td></tr>
        <tr><th>Noches</th><td>${nights}</td></tr>
      </table>
    </div>

    <div class="section">
      <h3>Detalle</h3>
      <table>
        <thead>
          <tr><th>Concepto</th><th>Monto</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Alojamiento (${nights} noche${nights !== 1 ? 's' : ''} x ${currency} ${booking.roomRate.toFixed(2)})</td>
            <td>${currency} ${(booking.roomRate * nights).toFixed(2)}</td>
          </tr>
          ${inv.taxAmount > 0 ? `<tr><td>Impuesto</td><td>${currency} ${inv.taxAmount.toFixed(2)}</td></tr>` : ''}
          <tr class="grand-total"><td>Total</td><td>${currency} ${inv.total.toFixed(2)}</td></tr>
          <tr class="sub-row"><td>Pagado</td><td>${currency} ${booking.paidAmount.toFixed(2)}</td></tr>
          <tr class="sub-row"><td>Pendiente</td><td>${currency} ${(inv.total - booking.paidAmount).toFixed(2)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3>Pagos</h3>
      <table class="payments-table">
        <thead>
          <tr><th>Método</th><th>Monto</th><th>Fecha</th></tr>
        </thead>
        <tbody>
          ${
            booking.payments.length > 0
              ? booking.payments
                  .map(
                    (p) =>
                      `<tr class="payment-row"><td>${p.method}</td><td>${currency} ${p.amount.toFixed(2)}</td><td>${new Date(p.createdAt).toLocaleDateString('es-ES')}</td></tr>`
                  )
                  .join('')
              : '<tr><td colspan="3" style="text-align:center;color:#9ca3af">Sin pagos registrados</td></tr>'
          }
        </tbody>
      </table>
    </div>

    <div class="footer">
      Generado por Hosterix &middot; Portal del Huésped
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
