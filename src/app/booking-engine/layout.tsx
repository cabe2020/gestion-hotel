import './booking-engine.css';

export const metadata = {
  title: 'Reservar - Motor de Reservas',
  description: 'Reserve su habitacion online',
};

export default function BookingEngineLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {children}
    </div>
  );
}
