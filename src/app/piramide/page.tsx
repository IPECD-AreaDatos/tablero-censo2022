'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { 
  Users, 
  ChevronLeft, 
  BarChart2, 
  Table as TableIcon, 
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

type SortField = 'grupo_edad' | 'hombres' | 'mujeres' | 'total';
type SortOrder = 'asc' | 'desc';

const ANIOS_DISPONIBLES = ['1980', '1991', '2001', '2010', '2022'];

export default function PiramidePage() {
  const [selectedYear, setSelectedYear] = useState('2022');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  // Estados de ordenamiento exclusivos de la tabla
  const [sortField, setSortField] = useState<SortField>('grupo_edad');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath(`/api/piramide?year=${selectedYear}`));
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedYear]);

  const piramideOriginal = data?.data || [];

  // Datos fijos para el gráfico: preserva el orden etario original (0-4 hasta 100 y más)
  const datosGrafico = useMemo(() => {
    return [...piramideOriginal];
  }, [piramideOriginal]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, opacity: 0.4 }}>
          <ArrowUpDown size={12} color="#94a3b8" />
        </span>
      );
    }
    return sortOrder === 'asc' ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
        <ArrowUp size={12} color="#059669" strokeWidth={2.5} />
      </span>
    ) : (
      <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
        <ArrowDown size={12} color="#059669" strokeWidth={2.5} />
      </span>
    );
  };

  // Datos ordenados exclusivamente para la tabla
  const detalleTablaOrdenado = useMemo(() => {
    if (!piramideOriginal.length) return [];
    return [...piramideOriginal].sort((a: any, b: any) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'grupo_edad') {
        const parseEdad = (str: string) => {
          const m = (str || '').match(/\d+/);
          return m ? parseInt(m[0], 10) : 999;
        };
        aVal = parseEdad(a.grupo_edad);
        bVal = parseEdad(b.grupo_edad);
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      aVal = Number(a[sortField]) || 0;
      bVal = Number(b[sortField]) || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [piramideOriginal, sortField, sortOrder]);

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>EVOLUCIÓN DE LA PIRÁMIDE POBLACIONAL</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censos 1980 a 2022
          </p>
        </div>
      </div>

      {/* Selector de Año Censal */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: '#ffffff',
          padding: '10px 16px',
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14203b', marginRight: 8 }}>
          CENSO / AÑO:
        </span>
        {ANIOS_DISPONIBLES.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            style={{
              border: '1px solid',
              borderColor: selectedYear === year ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedYear === year ? '#14203b' : '#f8fafc',
              color: selectedYear === year ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedYear === year ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            Censo {year}
          </button>
        ))}
      </div>

      {/* Tarjetas KPI Superiores Dinámicas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">Población Total ({selectedYear})</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {data ? data.totalGeneral.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Provincial Relevado</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #1e3a8a' }}>
          <span className="metricLabel">Varones ({data?.pctHombres || '0'} %)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1e3a8a' }}>
            {data ? data.totalHombres.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Población Masculina</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">Mujeres ({data?.pctMujeres || '0'} %)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {data ? data.totalMujeres.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Población Femenina</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <span className="metricLabel">Índice de Masculinidad</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {data ? data.indiceMasculinidad : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Varones cada 100 mujeres</span>
        </div>
      </div>

      {/* Gráfico / Tabla */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Pirámide Poblacional — Censo {selectedYear}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Fuente: IMI en base a censos históricos
            </span>

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
        </div>

        <div className="cardBody" style={{ minHeight: 520, padding: 18 }}>
          {loading ? (
            <div style={{ display: 'flex', height: 450, alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b' }}>
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Calculando estructura poblacional...</span>
            </div>
          ) : viewMode === 'grafico' ? (
            <div style={{ width: '100%', height: 620 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={datosGrafico}
                  stackOffset="sign"
                  margin={{ top: 20, right: 40, left: 20, bottom: 35 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) => Math.abs(Number(v)).toLocaleString('es-AR')}
                    stroke="#94a3b8"
                    fontSize={11}
                    label={{
                      value: 'Población (Varones a la izquierda | Mujeres a la derecha)',
                      position: 'insideBottom',
                      offset: -18,
                      fill: '#64748b',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="grupo_edad"
                    width={90}
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    label={{
                      value: 'Grupo de Edad',
                      angle: -90,
                      position: 'insideLeft',
                      offset: -10,
                      fill: '#64748b',
                      fontSize: 12,
                      fontWeight: 600,
                      style: { textAnchor: 'middle' },
                    }}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${Math.abs(Number(val)).toLocaleString('es-AR')} personas`,
                      name === 'hombresGrafico' ? 'Varones' : 'Mujeres',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: 8,
                      border: '1px solid #334155',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      padding: '8px 12px',
                    }}
                    labelStyle={{
                      color: '#ffffff',
                      fontWeight: 600,
                      marginBottom: 4,
                      fontSize: '0.8rem',
                    }}
                    itemStyle={{
                      color: '#34d399',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="center"
                    height={36}
                    formatter={(val) => (val === 'hombresGrafico' ? 'Varones' : 'Mujeres')}
                  />
                  <Bar dataKey="hombresGrafico" stackId="piramide" fill="#1e3a8a" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="mujeres" stackId="piramide" fill="#047857" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              style={{
                maxHeight: '480px',
                overflowY: 'auto',
                overflowX: 'auto',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead
                  style={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#ffffff',
                    zIndex: 2,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}
                >
                  <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                    <th 
                      onClick={() => handleSort('grupo_edad')}
                      style={{ padding: '10px 12px', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span>Grupo de Edad</span>
                        {renderSortIcon('grupo_edad')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('hombres')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Varones</span>
                        {renderSortIcon('hombres')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('mujeres')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Mujeres</span>
                        {renderSortIcon('mujeres')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('total')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Población Total</span>
                        {renderSortIcon('total')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detalleTablaOrdenado.map((row: any, idx: number) => (
                    <tr
                      key={row.grupo_edad || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.grupo_edad}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#1e3a8a' }}>
                        {row.hombres.toLocaleString('es-AR')}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#047857' }}>
                        {row.mujeres.toLocaleString('es-AR')}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                        {row.total.toLocaleString('es-AR')}
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