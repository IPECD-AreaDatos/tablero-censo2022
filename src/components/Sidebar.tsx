'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { assetPath } from '@/lib/api';
import { 
  Users, 
  Home, 
  Briefcase, 
  GraduationCap, 
  HeartPulse, 
  Droplets, 
  Flame, 
  Wifi, 
  Layers, 
  BarChart3,
  Building2,
  ChevronRight
} from 'lucide-react';

const menuItems = [
  {
    category: 'GENERAL',
    items: [
      { name: 'Resumen Principal', href: '/', icon: BarChart3 },
    ]
  },
  {
    category: 'INDICADORES INDIVIDUALES',
    items: [
      { name: 'Población y Municipios', href: '/poblacion', icon: Users },
      { name: 'Pirámide Poblacional', href: '/piramide', icon: Layers },
      { name: 'Mercado de Trabajo', href: '/mercado-trabajo', icon: Briefcase },
      { name: 'Nivel Educativo (+25)', href: '/educacion', icon: GraduationCap },
      { name: 'Cobertura de Salud', href: '/salud', icon: HeartPulse },
      { name: 'Actividad Económica', href: '/actividad-economica', icon: Building2 },
    ]
  },
  {
    category: 'INDICADORES POR HOGAR',
    items: [
      { name: 'Clima Educativo Hogar', href: '/clima-educativo', icon: GraduationCap },
      { name: 'NBI (Básicas Insatisfechas)', href: '/nbi', icon: Home },
      { name: 'Materiales Vivienda (INMAT)', href: '/inmat', icon: Home },
      { name: 'Agua para Beber/Cocinar', href: '/agua', icon: Droplets },
      { name: 'Combustible p/ Cocinar', href: '/combustible', icon: Flame },
      { name: 'Acceso a Internet', href: '/internet', icon: Wifi },
    ]
  }
];

export default function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();

  return (
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`} id="dashboard-sidebar">
      {/* Header con logo blanco */}
      <div className="sidebar-header">
        <div className="sidebar-logo-container">
          <Image
            src={assetPath('/logo_pluma_blanca.png')}
            alt="IPECD - IMI"
            width={170}
            height={55}
            className="sidebar-logo-img"
            priority
          />
        </div>
        <div className="sidebar-title-group">
          <h1 className="sidebar-title">Censo 2022</h1>
          <p className="sidebar-subtitle">Provincia de Corrientes</p>
        </div>
      </div>

      {/* Navegación por grupos */}
      <nav className="sidebar-nav" aria-label="Secciones del tablero">
        {menuItems.map((group, idx) => (
          <div key={idx}>
            <p className="nav-group-title">{group.category}</p>
            <div className="nav-group-items">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.name : undefined}
                  >
                    <div className="sidebar-link-content">
                      <Icon className="sidebar-link-icon" />
                      <span className="sidebar-link-label">{item.name}</span>
                    </div>
                    {isActive && <ChevronRight className="sidebar-link-arrow" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      </aside>
  );
}
