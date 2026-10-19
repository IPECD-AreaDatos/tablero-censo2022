'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Building2
} from 'lucide-react';
import { clsx } from 'clsx';

const menuItems = [
  {
    category: 'General',
    items: [
      { name: 'Portada / Resumen', href: '/', icon: BarChart3 },
    ]
  },
  {
    category: 'Indicadores Individuales',
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
    category: 'Indicadores por Hogar',
    items: [
      { name: 'Clima Educativo Hogar', href: '/clima-educativo', icon: GraduationCap },
      { name: 'NBI (Necesidades Básicas)', href: '/nbi', icon: Home },
      { name: 'Materiales Vivienda (INMAT)', href: '/inmat', icon: Home },
      { name: 'Agua para Beber/Cocinar', href: '/agua', icon: Droplets },
      { name: 'Combustible p/ Cocinar', href: '/combustible', icon: Flame },
      { name: 'Acceso a Internet', href: '/internet', icon: Wifi },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen flex flex-col border-r border-slate-800 shrink-0">
      {/* Encabezado Institucional */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
          C22
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-white leading-tight">IPECD Corrientes</h1>
          <p className="text-xs text-slate-400">Censo 2022 Digital</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {menuItems.map((group, idx) => (
          <div key={idx}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-3">
              {group.category}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      'flex items-center space-x-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Pie institucional */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        Fuente: IPECD en base a Censo 2022
      </div>
    </aside>
  );
}