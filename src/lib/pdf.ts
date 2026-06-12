import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateInvoicePDF(data: {
  hotel: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId: string;
    currency: string;
    taxRate: number;
  };
  invoice: {
    number: string;
    date: string;
    status: string;
    taxAmount: number;
    total: number;
    cancelled: boolean;
    cancelReason: string;
  };
  booking: {
    code: string;
    checkIn: string;
    checkOut: string;
    totalNights: number;
    roomRate: number;
    totalAmount: number;
    paidAmount: number;
    specialRequests: string;
  };
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    idNumber: string;
    address: string;
  };
  room: {
    number: string;
    roomType: { name: string };
  };
  folioItems: {
    concept: string;
    amount: number;
    category: string;
    date: string;
  }[];
}): jsPDF {
  const doc = new jsPDF();
  const { hotel, invoice, booking, guest, room, folioItems } = data;
  const currency = hotel.currency || 'USD';

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(hotel.name, 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(hotel.address, 14, 26);
  doc.text(`Tel: ${hotel.phone} | Email: ${hotel.email}`, 14, 31);
  if (hotel.taxId) doc.text(`NIF/RFC: ${hotel.taxId}`, 14, 36);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const titleY = 45;
  doc.text(invoice.cancelled ? 'FACTURA ANULADA' : 'FACTURA', 14, titleY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`No: ${invoice.number}`, 140, titleY);
  doc.text(`Fecha: ${invoice.date}`, 140, titleY + 5);
  doc.text(
    `Estado: ${invoice.cancelled ? 'ANULADA' : invoice.status === 'paid' ? 'PAGADA' : 'PENDIENTE'}`,
    140,
    titleY + 10
  );

  if (invoice.cancelled) {
    doc.saveGraphicsState();
    doc.setFontSize(72);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 0, 0);
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.text('ANULADA', 105, 150, { align: 'center', angle: 35 });
    doc.restoreGraphicsState();
    doc.setTextColor(255, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA ANULADA', 14, titleY + 2);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (invoice.cancelReason) {
      doc.text(`Motivo: ${invoice.cancelReason}`, 14, titleY + 8);
    }
    doc.setTextColor(0, 0, 0);
  }

  const guestY = titleY + (invoice.cancelled ? 20 : 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL HUESPED', 14, guestY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${guest.firstName} ${guest.lastName}`, 14, guestY + 5);
  if (guest.idNumber) doc.text(`ID: ${guest.idNumber}`, 14, guestY + 10);
  if (guest.email) doc.text(`Email: ${guest.email}`, 14, guestY + 15);
  if (guest.phone) doc.text(`Tel: ${guest.phone}`, 14, guestY + 20);

  const tableY = guestY + 28;
  const roomTotal = (booking.roomRate * booking.totalNights).toFixed(2);
  const tableItems =
    folioItems.length > 0
      ? folioItems.map((item) => [
          item.concept,
          item.category,
          `${currency} ${item.amount.toFixed(2)}`,
        ])
      : [
          [
            `Hab. ${room.number} - ${room.roomType.name} (${booking.totalNights} noches)`,
            'Habitacion',
            `${currency} ${roomTotal}`,
          ],
        ];

  autoTable(doc, {
    startY: tableY,
    head: [['Concepto', 'Categoria', 'Monto']],
    body: tableItems,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    styles: { fontSize: 9 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const subtotal = invoice.total / (1 + hotel.taxRate / 100);
  doc.setFontSize(10);
  doc.text(`Subtotal: ${currency} ${subtotal.toFixed(2)}`, 140, finalY);
  doc.text(`IVA (${hotel.taxRate}%): ${currency} ${invoice.taxAmount.toFixed(2)}`, 140, finalY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL: ${currency} ${invoice.total.toFixed(2)}`, 140, finalY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Pagado: ${currency} ${booking.paidAmount.toFixed(2)}`, 140, finalY + 22);
  doc.text(
    `Pendiente: ${currency} ${(invoice.total - booking.paidAmount).toFixed(2)}`,
    140,
    finalY + 27
  );

  doc.setFontSize(8);
  doc.text('Generado por Hosterix', 14, 285);

  return doc;
}

export function generateReceiptPDF(data: {
  hotel: { name: string; currency: string };
  payment: {
    amount: number;
    method: string;
    reference: string;
    createdAt: string;
  };
  booking: { code: string; guest: { firstName: string; lastName: string } };
}): jsPDF {
  const doc = new jsPDF();
  const { hotel, payment, booking } = data;
  const currency = hotel.currency || 'USD';

  const methods: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    other: 'Otro',
    refund: 'Reembolso',
  };

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(hotel.name, 14, 20);

  doc.setFontSize(14);
  doc.text('RECIBO DE PAGO', 14, 30);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reserva: ${booking.code}`, 14, 40);
  doc.text(`Huesped: ${booking.guest.firstName} ${booking.guest.lastName}`, 14, 46);
  doc.text(`Monto: ${currency} ${payment.amount.toFixed(2)}`, 14, 54);
  doc.text(`Metodo: ${methods[payment.method] || payment.method}`, 14, 60);
  if (payment.reference) doc.text(`Referencia: ${payment.reference}`, 14, 66);
  doc.text(`Fecha: ${new Date(payment.createdAt).toLocaleDateString('es')}`, 14, 72);

  doc.setFontSize(8);
  doc.text('Generado por Hosterix', 14, 285);

  return doc;
}
