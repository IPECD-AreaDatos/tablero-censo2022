import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Tablero Censo 2022 - Provincia de Corrientes',
  description: 'Portal interactivo oficial IPECD - Censo 2022',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="main-shell">
          <Sidebar />
          <div className="main-content-wrapper">
            <main className="main-content">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}