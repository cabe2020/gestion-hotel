import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hosterix - Acceso",
  description: "Inicia sesión o crea tu cuenta de hotel",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      {children}
    </div>
  );
}
