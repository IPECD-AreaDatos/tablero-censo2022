'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, ChevronLeft, BarChart2, Table as TableIcon, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export default function EducacionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/educacion');
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

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>NIVEL EDUCATIVO EN MAYORES DE 25 AÑOS</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 y Comparativas Regionales
          </p>
        </div>
      </div>

      {/* KPIs Superiores comparativos idénticos al Power BI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">Total Mayores de 25 años</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {data?.kpisProvincia?.totalMayores25 || '710.991'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Provincia de Corrientes</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981' }}>
          <span className="metricLabel">% Secundaria Completa (Provincia)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {data?.kpisProvincia?.pctSecundariaCompletaProv || '31,3 %'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Corrientes</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6' }}>
          <span className="metricLabel">% Secundaria Completa (País)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {data?.kpisProvincia?.pctSecundariaCompletaPais || '34,7 %'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Nacional</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <span className="metricLabel">% Secundaria Completa (NEA)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b45309' }}>
            {data?.kpisProvincia?.pctSecundariaCompletaNea || '29,6 %'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Región NEA</span>
        </div>
      </div>

      {/* Gráfico / Tabla por Departamento */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Asistencia Educativa por Departamento</span>
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
              <span>Cargando datos educativos...</span>
            </div>
          ) : viewMode === 'grafico' ? (
            <div style={{ width: '100%', height: 600 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={deptos} margin={{ top: 10, right: 30, left: 40, bottom: 20 }}>
                  <XAxis type="number" tickFormatter={(v) => Number(v).toLocaleString('es-AR')} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="departamento" width={130} stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      Number(val).toLocaleString('es-AR') + ' personas',
                      name === 'asiste' ? 'Asiste actualmente' : name === 'asistio' ? 'Asistió anteriormente' : 'Nunca asistió'
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, border: 'none', color: '#ffffff', fontSize: '0.78rem' }}
                  />
                  <Bar dataKey="asistio" name="asistio" stackId="a" fill="#047857" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="asiste" name="asiste" stackId="a" fill="#1e3a8a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="nunca_asistio" name="nunca_asistio" stackId="a" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '8px 10px' }}>Departamento</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Población 2022</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Asiste Actualmente</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Asistió</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Nunca Asistió</th>
                  </tr>
                </thead>
                <tbody>
                  {deptos.map((row: any, idx: number) => (
                    <tr key={row.departamento} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.departamento}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(row.poblacion_2022).toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#1e3a8a', fontWeight: 600 }}>{Number(row.asiste).toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#047857', fontWeight: 600 }}>{Number(row.asistio).toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>{Number(row.nunca_asistio).toLocaleString('es-AR')}</td>
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