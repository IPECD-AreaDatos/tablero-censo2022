'use client';

import { useState, useEffect } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { Building2, ChevronLeft, BarChart2, Table as TableIcon, Loader2, Award } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface SectorItem {
  sector: string;
  valor: number;
  porcentaje: string;
  color: string;
}

export default function ActividadEconomicaPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/actividad-economica'));
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

  const sectores: SectorItem[] = data?.sectores || [];
  const totalOcupados: number = data?.totalOcupados || 0;
  const topSector: SectorItem = data?.topSector;

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>RAMA DE ACTIVIDAD ECONÓMICA DE LA POBLACIÓN OCUPADA</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022
          </p>
        </div>
      </div>

      {/* Tarjetas KPI Superiores dinámicas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">Población Ocupada Total Relevada</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {totalOcupados.toLocaleString('es-AR')}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Provincial Calculado</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #1e3a8a' }}>
          <span className="metricLabel">Principal Rama de Empleo</span>
          <span className="metricVal" style={{ fontSize: '1.2rem', marginTop: 4, color: '#1e3a8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {topSector ? topSector.sector : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {topSector ? `${topSector.valor.toLocaleString('es-AR')} personas (${topSector.porcentaje} %)` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">Comercio e Industria Combinados</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {sectores.length > 0 
              ? (
                  ((((sectores.find(s => s.sector.includes('Comercio'))?.valor || 0) + 
                    (sectores.find(s => s.sector.includes('Industria'))?.valor || 0)) / (totalOcupados || 1)) * 100
                  ).toFixed(1).replace('.', ',') + ' %'
                )
              : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Participación en el empleo provincial</span>
        </div>
      </div>

      {/* Gráfico / Tabla */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Distribución de Ocupados por Rama Económica</span>
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
              <span>Calculando ramas de actividad...</span>
            </div>
          ) : viewMode === 'grafico' ? (
            <div style={{ width: '100%', height: 550 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={sectores} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <XAxis type="number" tickFormatter={(v) => Number(v).toLocaleString('es-AR')} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="sector" width={220} stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [Number(val).toLocaleString('es-AR') + ' ocupados', 'Población']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, border: 'none', color: '#ffffff', fontSize: '0.78rem' }}
                  />
                  <Bar dataKey="valor" fill="#14203b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '8px 10px' }}>Rama de Actividad Económica</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Población Ocupada</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Participación (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {sectores.map((row, idx) => (
                    <tr key={row.sector} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{row.sector}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{row.valor.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#047857', fontWeight: 600 }}>{row.porcentaje} %</td>
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
