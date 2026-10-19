import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Tablero Censo 2022 - Provincia de Corrientes',
  description: 'Portal estadístico interactivo IPECD Censo 2022',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}