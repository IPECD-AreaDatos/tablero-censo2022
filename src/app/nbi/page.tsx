'use client';

import { useState, useEffect } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { Home, ChevronLeft, BarChart2, Table as TableIcon, Loader2, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type DimensionNbi = 'si_nbi' | 'hacinamiento' | 'viv_inconveniente' | 'cond_sanitarias';

export default function NbiPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDimension, setSelectedDimension] = useState<DimensionNbi>('si_nbi');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/nbi'));
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

  const comparativa = data?.comparativa || [];
  const filaPais = comparativa.find((c: any) => c.division_geo?.toLowerCase().includes('país') || c.division_geo?.toLowerCase().includes('total'));
  const filaNea = comparativa.find((c: any) => c.division_geo?.toLowerCase().includes('nea'));
  const filaProv = comparativa.find((c: any) => c.division_geo?.toLowerCase().includes('corrientes'));

  const pctProv = filaProv ? Number(filaProv.si_nbi_total).toFixed(1).replace('.', ',') : (data?.pctNbiProv || '0');
  const pctPais = filaPais ? Number(filaPais.si_nbi_total).toFixed(1).replace('.', ',') : '...';
  const pctNea = filaNea ? Number(filaNea.si_nbi_total).toFixed(1).replace('.', ',') : '...';

  const detalle = data?.detalle || [];

  const labelsDimension: Record<DimensionNbi, string> = {
    si_nbi: 'Hogares con NBI (Total)',
    hacinamiento: 'Hacinamiento Crítico',
    viv_inconveniente: 'Vivienda Inconveniente',
    cond_sanitarias: 'Condiciones Sanitarias Deficitarias',
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>NECESIDADES BÁSICAS INSATISFECHAS (NBI)</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 y Comparativas Regionales
          </p>
        </div>
      </div>

      {/* Tarjetas KPI Superiores dinámicas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">Total Hogares Evaluados</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {data ? data.totalHogares.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Provincial Calculado</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #dc2626' }}>
          <span className="metricLabel">% Hogares con NBI (Corrientes)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b91c1c' }}>
            {pctProv} %
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {data ? `${data.sumNbi.toLocaleString('es-AR')} hogares` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <span className="metricLabel">% Hogares con NBI (Región NEA)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b45309' }}>
            {pctNea} %
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Región NEA</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6' }}>
          <span className="metricLabel">% Hogares con NBI (Total País)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {pctPais} %
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Nacional</span>
        </div>
      </div>

      {/* Selector de Indicador de NBI */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: '#ffffff',
          padding: '10px 16px',
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          alignItems: 'center',
          marginTop: 12,
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14203b', marginRight: 8 }}>
          COMPONENTE NBI:
        </span>
        {(['si_nbi', 'hacinamiento', 'viv_inconveniente', 'cond_sanitarias'] as DimensionNbi[]).map((dim) => (
          <button
            key={dim}
            onClick={() => setSelectedDimension(dim)}
            style={{
              border: '1px solid',
              borderColor: selectedDimension === dim ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedDimension === dim ? '#14203b' : '#f8fafc',
              color: selectedDimension === dim ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedDimension === dim ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {labelsDimension[dim]}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <AlertTriangle className="w-4 h-4 text-emerald-400" />
            <span>{labelsDimension[selectedDimension]} por Territorio</span>
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
              <span>Calculando dimensiones de NBI...</span>
            </div>
          ) : viewMode === 'grafico' ? (
            <div style={{ width: '100%', height: 600 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={detalle.slice(0, 25)} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <XAxis type="number" tickFormatter={(v) => Number(v).toLocaleString('es-AR')} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="nombre" width={140} stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [Number(val).toLocaleString('es-AR') + ' hogares', labelsDimension[selectedDimension]]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, border: 'none', color: '#ffffff', fontSize: '0.78rem' }}
                  />
                  <Bar dataKey={selectedDimension} fill="#b91c1c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '8px 10px' }}>Territorio / Área</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Hogares</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>{labelsDimension[selectedDimension]}</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>% Incidencia</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.map((row: any, idx: number) => (
                    <tr key={row.codigo || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.nombre}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.total_viviendas.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>{row[selectedDimension].toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                        {selectedDimension === 'si_nbi' ? row.pct_nbi : row[`pct_${selectedDimension}`]} %
                      </td>
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
