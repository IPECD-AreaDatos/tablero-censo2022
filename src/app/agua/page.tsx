'use client';

import { useState, useEffect } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { Droplets, ChevronLeft, BarChart2, Table as TableIcon, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type TipoAgua = 'red_publica' | 'bomba_motor' | 'pozo_sin_bomba' | 'cisterna_acequia';

export default function AguaPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<TipoAgua>('red_publica');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/agua'));
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

  const labelsAgua: Record<TipoAgua, string> = {
    red_publica: 'Red Pública (Agua Corriente)',
    bomba_motor: 'Perforación con Bomba a Motor',
    pozo_sin_bomba: 'Pozo o Bomba Manual',
    cisterna_acequia: 'Cisterna, Canal o Acequia',
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>AGUA PARA BEBER O COCINAR EN VIVIENDAS PARTICULARES</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022
          </p>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">Total Viviendas Evaluadas</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {totales ? totales.totalViviendas.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Provincial Calculado</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">Por Red Pública</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {totales ? `${totales.pctRedPublica} %` : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {totales ? `${totales.sumRedPublica.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <span className="metricLabel">Perforación con Bomba Motor</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {totales ? `${totales.pctBombaMotor} %` : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {totales ? `${totales.sumBombaMotor.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #d97706' }}>
          <span className="metricLabel">Pozo o Bomba Manual</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b45309' }}>
            {totales ? `${totales.pctPozo} %` : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {totales ? `${totales.sumPozo.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>
      </div>

      {/* Selector de Procedencia de Agua */}
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
          PROCEDENCIA DEL AGUA:
        </span>
        {(['red_publica', 'bomba_motor', 'pozo_sin_bomba', 'cisterna_acequia'] as TipoAgua[]).map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTipo(t)}
            style={{
              border: '1px solid',
              borderColor: selectedTipo === t ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedTipo === t ? '#14203b' : '#f8fafc',
              color: selectedTipo === t ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedTipo === t ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {labelsAgua[t].split(' (')[0]}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <Droplets className="w-4 h-4 text-emerald-400" />
            <span>Distribución de {labelsAgua[selectedTipo]}</span>
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
              <span>Calculando procedencia de agua...</span>
            </div>
          ) : viewMode === 'grafico' ? (
            <div style={{ width: '100%', height: 600 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={detalle.slice(0, 25)} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <XAxis type="number" tickFormatter={(v) => Number(v).toLocaleString('es-AR')} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="nombre" width={140} stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [Number(val).toLocaleString('es-AR') + ' viviendas', labelsAgua[selectedTipo]]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, border: 'none', color: '#ffffff', fontSize: '0.78rem' }}
                  />
                  <Bar 
                    dataKey={selectedTipo} 
                    fill={selectedTipo === 'red_publica' ? '#047857' : selectedTipo === 'bomba_motor' ? '#2563eb' : '#d97706'} 
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
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>{labelsAgua[selectedTipo].split(' (')[0]}</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>% Incidencia</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.map((row: any, idx: number) => (
                    <tr key={row.codigo || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.nombre}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.total_viviendas.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>{row[selectedTipo].toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{row[`pct_${selectedTipo}`] || '0'} %</td>
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
