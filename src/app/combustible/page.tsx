'use client';

import { useState, useEffect } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { Flame, ChevronLeft, BarChart2, Table as TableIcon, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type TipoCombustible = 'gas_garrafa' | 'gas_tubo' | 'electricidad' | 'lena_carbon';

export default function CombustiblePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCombustible, setSelectedCombustible] = useState<TipoCombustible>('gas_garrafa');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/combustible'));
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

  const detalle = data?.detalle || [];
  const totales = data?.totalesProvincia;

  const labelsCombustible: Record<TipoCombustible, string> = {
    gas_garrafa: 'Gas en Garrafa',
    gas_tubo: 'Gas en Tubo o Zepelín',
    electricidad: 'Electricidad',
    lena_carbon: 'Leña o Carbón',
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>COMBUSTIBLE UTILIZADO PRINCIPALMENTE PARA COCINAR</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022
          </p>
        </div>
      </div>

      {/* Tarjetas KPI Superiores dinámicas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">Gas en Garrafa</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {totales ? `${totales.pctGarrafa} %` : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {totales ? `${totales.sumGarrafa.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <span className="metricLabel">Gas en Tubo / Zepelín</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {totales ? `${totales.pctTubo} %` : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {totales ? `${totales.sumTubo.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <span className="metricLabel">Electricidad</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b45309' }}>
            {totales ? `${totales.pctElectricidad} %` : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {totales ? `${totales.sumElectricidad.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #dc2626' }}>
          <span className="metricLabel">Leña o Carbón</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b91c1c' }}>
            {totales ? `${totales.pctLena} %` : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {totales ? `${totales.sumLena.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>
      </div>

      {/* Selector de Combustible */}
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
          COMBUSTIBLE A VISUALIZAR:
        </span>
        {(['gas_garrafa', 'gas_tubo', 'electricidad', 'lena_carbon'] as TipoCombustible[]).map((t) => (
          <button
            key={t}
            onClick={() => setSelectedCombustible(t)}
            style={{
              border: '1px solid',
              borderColor: selectedCombustible === t ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedCombustible === t ? '#14203b' : '#f8fafc',
              color: selectedCombustible === t ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedCombustible === t ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {labelsCombustible[t]}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <Flame className="w-4 h-4 text-emerald-400" />
            <span>Distribución de {labelsCombustible[selectedCombustible]}</span>
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
              <span>Calculando combustible utilizado...</span>
            </div>
          ) : viewMode === 'grafico' ? (
            <div style={{ width: '100%', height: 600 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={detalle.slice(0, 25)} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <XAxis type="number" tickFormatter={(v) => Number(v).toLocaleString('es-AR')} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="nombre" width={140} stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [Number(val).toLocaleString('es-AR') + ' viviendas', labelsCombustible[selectedCombustible]]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, border: 'none', color: '#ffffff', fontSize: '0.78rem' }}
                  />
                  <Bar 
                    dataKey={selectedCombustible} 
                    fill={selectedCombustible === 'gas_garrafa' ? '#047857' : selectedCombustible === 'gas_tubo' ? '#2563eb' : selectedCombustible === 'electricidad' ? '#d97706' : '#dc2626'} 
                    radius={[0, 4, 4, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '8px 10px' }}>Territorio / Área</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Viviendas</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>{labelsCombustible[selectedCombustible]}</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>% Incidencia</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.map((row: any, idx: number) => (
                    <tr key={row.codigo || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.nombre}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.total_viviendas.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{row[selectedCombustible].toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{row[`pct_${selectedCombustible}`] || '0'} %</td>
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
