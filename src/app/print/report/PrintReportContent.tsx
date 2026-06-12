'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ReportPrint from '../ReportPrint';

interface OccupancyData {
  date: string;
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  avgRate: number;
  revenue: number;
}

interface RevenueData {
  date: string;
  roomRevenue: number;
  folioRevenue: number;
  totalRevenue: number;
  payments: number;
}

type ReportData = OccupancyData | RevenueData;

export default function PrintReportContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'occupancy';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  const [data, setData] = useState<ReportData[]>([]);
  const [hotel, setHotel] = useState<{ name: string }>({ name: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hotels')
      .then((r) => r.json())
      .then((h) => {
        if (h) setHotel({ name: h.name });
      });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const endpoint =
      type === 'revenue'
        ? `/api/reports/revenue?period=daily&${params.toString()}`
        : `/api/reports/occupancy?${params.toString()}`;

    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [type, from, to]);

  useEffect(() => {
    if (!loading && data.length > 0) {
      const timeout = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timeout);
    }
  }, [loading, data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const occupancyColumns = [
    { key: 'date', label: 'Fecha' },
    { key: 'totalRooms', label: 'Total Hab.', align: 'center' as const },
    { key: 'occupiedRooms', label: 'Ocupadas', align: 'center' as const },
    { key: 'occupancyRate', label: 'Ocupacion', align: 'center' as const },
    { key: 'avgRate', label: 'Tarifa Media', align: 'right' as const },
    { key: 'revenue', label: 'Ingresos', align: 'right' as const },
  ];

  const revenueColumns = [
    { key: 'date', label: 'Fecha' },
    { key: 'roomRevenue', label: 'Hab.', align: 'right' as const },
    { key: 'folioRevenue', label: 'Folio', align: 'right' as const },
    { key: 'totalRevenue', label: 'Total', align: 'right' as const },
    { key: 'payments', label: 'Pagos', align: 'right' as const },
  ];

  const formatData = (raw: ReportData[]) => {
    if (type === 'occupancy') {
      return raw.map((d: OccupancyData) => ({
        ...d,
        occupancyRate: `${d.occupancyRate}%`,
        avgRate: `$${d.avgRate}`,
        revenue: `$${d.revenue}`,
      }));
    }
    return raw.map((d: RevenueData) => ({
      ...d,
      roomRevenue: `$${d.roomRevenue}`,
      folioRevenue: `$${d.folioRevenue}`,
      totalRevenue: `$${d.totalRevenue}`,
      payments: `$${d.payments}`,
    }));
  };

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-4 print:max-w-none">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-container { box-shadow: none; border: none; }
        }
      `}</style>
      <div className="no-print mb-4 flex gap-2">
        <button onClick={() => window.print()} className="btn-primary">
          Imprimir
        </button>
        <button onClick={() => window.close()} className="btn-secondary">
          Cerrar
        </button>
      </div>
      <ReportPrint
        title={type === 'revenue' ? 'Reporte de Ingresos' : 'Reporte de Ocupacion'}
        data={formatData(data)}
        columns={type === 'revenue' ? revenueColumns : occupancyColumns}
        hotel={hotel}
      />
    </div>
  );
}
