'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import InvoicePrint from '@/app/print/InvoicePrint';

export default function PrintInvoiceContent() {
  const params = useParams();
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<any>(null);
  const [hotel, setHotel] = useState<{
    name: string;
    address: string;
    email: string;
    phone: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/invoices/${id}`).then((r) => r.json()),
      fetch('/api/hotels').then((r) => r.json()),
    ])
      .then(([inv, h]) => {
        setInvoice(inv);
        if (h) setHotel({ name: h.name, address: h.address, email: h.email, phone: h.phone });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (invoice && hotel) {
      const timeout = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timeout);
    }
  }, [invoice, hotel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!invoice || !hotel) {
    return <div className="p-8 text-center text-gray-500">Factura no encontrada</div>;
  }

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
      <InvoicePrint invoice={invoice} hotel={hotel} />
    </div>
  );
}
