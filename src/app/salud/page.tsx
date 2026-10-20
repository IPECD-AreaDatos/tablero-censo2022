'use client';

import { useState, useEffect } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { HeartPulse, ChevronLeft, BarChart2, Table as TableIcon, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export default function SaludPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/salud'));
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const deptos = data?.departamentos || [];
  const totales = data?.totalesProvincia;

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>COBERTURA DE SALUD EN VIVIENDAS PARTICULARES</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 por Departamentos
          </p>
        </div>
      </div>

      {/* KPIs Calculados Dinámicamente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">Población Total Evaluada</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {totales ? totales.totalPoblacion.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Censo 2022</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">Obra Social o Prepaga (Inc. PAMI)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {totales ? `${totales.pctObraSocial} %` : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            Porcentaje de la población
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6' }}>
          <span className="metricLabel">Programas Estatales de Salud</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {totales ? `${totales.pctProgramas} %` : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            Porcentaje de la población
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #dc2626' }}>
          <span className="metricLabel">Sin Obra Social ni Cobertura</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b91c1c' }}>
            {totales ? `${totales.pctSinCobertura} %` : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            Porcentaje de la población
          </span>
        </div>
      </div>

      {/* Gráfico / Tabla por Departamento */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <HeartPulse className="w-4 h-4 text-emerald-400" />
            <span>Distribución de Cobertura por Departamento</span>
          </div>

          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.08)', padding: 3, borderRadius: 8 }}>
            <button
              onClick={() => setViewMode('grafico')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: viewMode === 'grafico' ? '#10b981' : 'transparent',
                color: '#ffffff',
              }}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Gráfico
            </button>
            <button
              onClick={() => setViewMode('tabla')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: viewMode === 'tabla' ? '#10b981' : 'transparent',
                color: '#ffffff',
              }}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Tabla
            </button>
          </div>
        </div>

        <div className="cardBody" style={{ minHeight: 520, padding: 18 }}>
          {loading ? (
            <div style={{ display: 'flex', height: 450, alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b' }}>
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Calculando coberturas desde la base...</span>
            </div>
          ) : viewMode === 'grafico' ? (
            <div style={{ width: '100%', height: 600 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={deptos} margin={{ top: 10, right: 30, left: 40, bottom: 20 }}>
                <XAxis type="number" domain={[0, 100]} allowDataOverflow tickFormatter={(v) => `${v}%`} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="departamento" width={130} stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${Number(val).toLocaleString('es-AR', { maximumFractionDigits: 1 })} %`,
                      name === 'obra_social_pct' ? 'Obra Social / PAMI' : name === 'programas_pct' ? 'Programas Estatales' : 'Sin Cobertura'
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, border: 'none', color: '#ffffff', fontSize: '0.78rem' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="center"
                    height={36}
                    formatter={(val) => (val === 'obra_social_pct' ? 'Obra Social / Prepaga / PAMI' : val === 'programas_pct' ? 'Programas Estatales' : 'Sin Cobertura')}
                  />
                  <Bar dataKey="obra_social_pct" stackId="salud" fill="#059669" />
                  <Bar dataKey="programas_pct" stackId="salud" fill="#2563eb" />
                  <Bar dataKey="sin_cobertura_pct" stackId="salud" fill="#dc2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '8px 10px' }}>Departamento</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Población Total</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>% Obra Social / PAMI</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>% Programas Estatales</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>% Sin Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  {deptos.map((row: any, idx: number) => (
                    <tr key={row.departamento} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.departamento}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.poblacion.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.poblacion.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#047857', fontWeight: 600 }}>{row.obra_social_pct.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#1d4ed8' }}>{row.programas_pct.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b91c1c', fontWeight: 600 }}>{row.sin_cobertura_pct.toLocaleString('es-AR', { maximumFractionDigits: 1 })} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
