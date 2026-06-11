"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface FolioItem {
  id: string;
  concept: string;
  amount: number;
  category: string;
  date: string;
}

interface InvoicePrintProps {
  invoice: {
    id: string;
    number: string;
    date: string;
    taxAmount: number;
    total: number;
    status: string;
    cancelled: boolean;
    cancelReason: string;
    booking: {
      code: string;
      checkIn: string;
      checkOut: string;
      totalNights: number;
      roomRate: number;
      totalAmount: number;
      paidAmount: number;
      guest: { firstName: string; lastName: string; idNumber: string; address: string; email: string; phone: string };
      room: { number: string; roomType: { name: string } };
      folioItems: FolioItem[];
    };
  };
  hotel: { name: string; address: string; email: string; phone: string };
}

const categoryLabels: Record<string, string> = {
  room: "Habitacion",
  minibar: "Minibar",
  restaurant: "Restaurante",
  spa: "Spa",
  laundry: "Lavanderia",
  parking: "Estacionamiento",
  other: "Otro",
};

export default function InvoicePrint({ invoice, hotel }: InvoicePrintProps) {
  const b = invoice.booking;
  const folioItems = b.folioItems || [];

  return (
    <div className="print-container">
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {invoice.cancelled ? "FACTURA ANULADA" : "FACTURA"}
          </h2>
          <p className="text-sm text-gray-600">N° {invoice.number}</p>
          <p className="text-sm text-gray-600">Fecha: {formatDate(invoice.date)}</p>
          {invoice.cancelled && invoice.cancelReason && (
            <p className="text-sm text-red-600 font-medium mt-1">Motivo: {invoice.cancelReason}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{hotel.name}</p>
          <p className="text-sm text-gray-600">{hotel.address}</p>
          <p className="text-sm text-gray-600">{hotel.email}</p>
          <p className="text-sm text-gray-600">{hotel.phone}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Datos del Huesped</h3>
        <p className="text-sm">{b.guest.firstName} {b.guest.lastName}</p>
        <p className="text-sm text-gray-600">Doc: {b.guest.idNumber || "-"}</p>
        <p className="text-sm text-gray-600">{b.guest.address || "-"}</p>
      </div>

      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left py-2 font-semibold">Concepto</th>
            <th className="text-center py-2 font-semibold">Categoria</th>
            <th className="text-right py-2 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {folioItems.length > 0 ? (
            folioItems.map((fi) => (
              <tr key={fi.id} className="border-b border-gray-100">
                <td className="py-2">{fi.concept}</td>
                <td className="text-center py-2 text-gray-600">{categoryLabels[fi.category] || fi.category}</td>
                <td className="text-right py-2 font-medium">{formatCurrency(fi.amount)}</td>
              </tr>
            ))
          ) : (
            <tr className="border-b border-gray-100">
              <td className="py-2">Hab. {b.room.number} ({b.room.roomType.name}) - {b.totalNights} noches</td>
              <td className="text-center py-2 text-gray-600">Habitacion</td>
              <td className="text-right py-2 font-medium">{formatCurrency(b.totalAmount)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-300">
            <td colSpan={2} className="text-right py-2 text-gray-600">Subtotal</td>
            <td className="text-right py-2">{formatCurrency(invoice.total - invoice.taxAmount)}</td>
          </tr>
          <tr>
            <td colSpan={2} className="text-right py-2 text-gray-600">Impuestos</td>
            <td className="text-right py-2">{formatCurrency(invoice.taxAmount)}</td>
          </tr>
          <tr className="border-t-2 border-gray-900">
            <td colSpan={2} className="text-right py-2 font-bold text-lg">TOTAL</td>
            <td className="text-right py-2 font-bold text-lg">{formatCurrency(invoice.total)}</td>
          </tr>
          <tr>
            <td colSpan={2} className="text-right py-2 text-gray-600">Pagado</td>
            <td className="text-right py-2">{formatCurrency(b.paidAmount)}</td>
          </tr>
          <tr>
            <td colSpan={2} className="text-right py-2 text-gray-600">Pendiente</td>
            <td className="text-right py-2">{formatCurrency(invoice.total - b.paidAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
