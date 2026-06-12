import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateOccupancyReportPDF(
  data: {
    date: string;
    totalRooms: number;
    occupiedRooms: number;
    occupancyRate: number;
    avgRate: number;
    revenue: number;
  }[],
  hotel: { name: string; currency: string }
): jsPDF {
  const doc = new jsPDF();
  const currency = hotel.currency || 'USD';

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(hotel.name, 14, 20);

  doc.setFontSize(14);
  doc.text('Reporte de Ocupacion', 14, 30);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es')}`, 14, 38);

  const avgOccupancy =
    data.length > 0 ? Math.round(data.reduce((s, d) => s + d.occupancyRate, 0) / data.length) : 0;
  const maxOccupancy = data.length > 0 ? Math.max(...data.map((d) => d.occupancyRate)) : 0;
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const avgRate =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.avgRate, 0) / data.length) * 100) / 100
      : 0;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Ocupacion Media: ${avgOccupancy}%`, 14, 48);
  doc.text(`Ocupacion Maxima: ${maxOccupancy}%`, 80, 48);
  doc.text(`Ingresos Totales: ${currency} ${totalRevenue.toFixed(2)}`, 14, 54);
  doc.text(`Tarifa Media: ${currency} ${avgRate}`, 80, 54);

  const tableData = data.map((d) => [
    d.date,
    String(d.totalRooms),
    String(d.occupiedRooms),
    `${d.occupancyRate}%`,
    `${currency} ${d.avgRate.toFixed(2)}`,
    `${currency} ${d.revenue.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 62,
    head: [['Fecha', 'Total Hab.', 'Ocupadas', 'Ocupacion', 'Tarifa Media', 'Ingresos']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    styles: { fontSize: 8 },
  });

  doc.setFontSize(8);
  doc.text('Generado por Hosterix', 14, 285);

  return doc;
}

export function generateRevenueReportPDF(
  data: {
    date: string;
    roomRevenue: number;
    folioRevenue: number;
    totalRevenue: number;
    payments: number;
  }[],
  hotel: { name: string; currency: string }
): jsPDF {
  const doc = new jsPDF();
  const currency = hotel.currency || 'USD';

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(hotel.name, 14, 20);

  doc.setFontSize(14);
  doc.text('Reporte de Ingresos', 14, 30);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleDateString('es')}`, 14, 38);

  const totalRoom = data.reduce((s, d) => s + d.roomRevenue, 0);
  const totalFolio = data.reduce((s, d) => s + d.folioRevenue, 0);
  const totalRev = data.reduce((s, d) => s + d.totalRevenue, 0);
  const totalPayments = data.reduce((s, d) => s + d.payments, 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Ingresos Hab.: ${currency} ${totalRoom.toFixed(2)}`, 14, 48);
  doc.text(`Folio: ${currency} ${totalFolio.toFixed(2)}`, 80, 48);
  doc.text(`Total: ${currency} ${totalRev.toFixed(2)}`, 14, 54);
  doc.text(`Pagos: ${currency} ${totalPayments.toFixed(2)}`, 80, 54);

  const tableData = data.map((d) => [
    d.date,
    `${currency} ${d.roomRevenue.toFixed(2)}`,
    `${currency} ${d.folioRevenue.toFixed(2)}`,
    `${currency} ${d.totalRevenue.toFixed(2)}`,
    `${currency} ${d.payments.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 62,
    head: [['Fecha', 'Hab.', 'Folio', 'Total', 'Pagos']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    styles: { fontSize: 8 },
  });

  doc.setFontSize(8);
  doc.text('Generado por Hosterix', 14, 285);

  return doc;
}
