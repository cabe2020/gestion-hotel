import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "GestHotel - Sistema de Gestion Hotelera",
  description: "Sistema completo de gestion hotelera: reservas, habitaciones, caja y mas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 bg-gray-50 overflow-auto md:w-auto w-full pt-14 md:pt-0">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
