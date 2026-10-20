'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { assetPath } from '@/lib/api';

export default function AppShell({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`main-shell ${collapsed ? 'is-sidebar-collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
        aria-expanded={!collapsed}
        aria-controls="dashboard-sidebar"
        title={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
      <Sidebar collapsed={collapsed} />
      <div className="main-content-wrapper">
        <div className="dashboard-brandbar">
          <div className="dashboard-brand">
            <Image
              src={assetPath('/logo_pluma_blanca.png')}
              alt="Instituto de Modernización e Innovación — Corrientes"
              width={170}
              height={55}
              className="dashboard-brand-logo"
              priority
            />
          </div>
        </div>
        <main className="main-content">{children}</main>
        {footer}
      </div>
    </div>
  );
}
