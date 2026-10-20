import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
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
        <AppShell footer={<Footer />}>{children}</AppShell>
      </body>
    </html>
  );
}
