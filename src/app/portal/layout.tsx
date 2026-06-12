import './portal.css';

export const metadata = {
  title: 'Check-in Digital - Portal de Huespedes',
  description: 'Complete su check-in digital antes de llegar al hotel',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {children}
    </div>
  );
}
