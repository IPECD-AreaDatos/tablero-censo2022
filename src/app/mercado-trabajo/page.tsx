'use client';

import { useState, useEffect } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { Briefcase, ChevronLeft, Table as TableIcon, BarChart2, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface DeptoTrabajo {
  departamento: string;
  poblacion: number;
  actividad: number;
  empleo: number;
  desocupacion: number;
  empleado_obrero: number;
  cuenta_propia: number;
  patron_empleador: number;
  servicio_domestico: number;
}

export default function MercadoTrabajoPage() {
  const [data, setData] = useState<DeptoTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricKey, setMetricKey] = useState<'actividad' | 'empleo' | 'desocupacion'>('actividad');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/mercado-trabajo'));
        const json = await res.json();
        setData(json.departamentos || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const metricTitle = {
    actividad: 'Tasa de Actividad (%)',
    empleo: 'Tasa de Empleo (%)',
    desocupacion: 'Tasa de Desocupación (%)',
  }[metricKey];

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>PRINCIPALES TASAS DE MERCADO DE TRABAJO</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 por Departamentos
          </p>
        </div>
      </div>

      {/* Tarjetas KPI Provinciales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #1e3a8a' }}>
          <span className="metricLabel">Tasa de Actividad Provincial</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>55,3 %</span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Provincia de Corrientes</span>
        </div>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">Tasa de Empleo Provincial</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>51,0 %</span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Provincia de Corrientes</span>
        </div>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #dc2626' }}>
          <span className="metricLabel">Tasa de Desocupación Provincial</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b91c1c' }}>7,9 %</span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Provincia de Corrientes</span>
        </div>
      </div>

      {/* Selector de Indicador de Tasa */}
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
          INDICADOR A VISUALIZAR:
        </span>
        {(['actividad', 'empleo', 'desocupacion'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setMetricKey(key)}
            style={{
              border: '1px solid',
              borderColor: metricKey === key ? '#10b981' : '#cbd5e1',
              backgroundColor: metricKey === key ? '#14203b' : '#f8fafc',
              color: metricKey === key ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: metricKey === key ? 700 : 500,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            Tasa de {key}
          </button>
        ))}
      </div>

      {/* Contenedor Gráfico / Tabla */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span>{metricTitle} por Departamento</span>
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
              <span>Cargando datos de mercado laboral...</span>
            </div>
          ) : viewMode === 'grafico' ? (
            <div style={{ width: '100%', height: 600 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={data}
                  margin={{ top: 10, right: 30, left: 40, bottom: 20 }}
                >
                  <XAxis
                    type="number"
                    unit="%"
                    stroke="#94a3b8"
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="departamento"
                    width={130}
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toFixed(1).replace('.', ',')} %`, metricTitle]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: 8,
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                    }}
                  />
                  <Bar 
                    dataKey={metricKey} 
                    fill={metricKey === 'desocupacion' ? '#dc2626' : '#059669'} 
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
                    <th style={{ padding: '8px 10px' }}>Departamento</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tasa Actividad</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tasa Empleo</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tasa Desocupación</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Empleados / Obreros</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cuenta Propia</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr
                      key={row.departamento}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.departamento}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{row.actividad.toFixed(1).replace('.', ',')} %</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#047857', fontWeight: 600 }}>{row.empleo.toFixed(1).replace('.', ',')} %</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b91c1c', fontWeight: 600 }}>{row.desocupacion.toFixed(1).replace('.', ',')} %</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.empleado_obrero.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.cuenta_propia.toLocaleString('es-AR')}</td>
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
