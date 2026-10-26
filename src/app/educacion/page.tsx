'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { 
  GraduationCap, 
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

type SortField = 'departamento' | 'poblacion_2022' | 'asiste' | 'asistio' | 'nunca_asistio';
type SortOrder = 'asc' | 'desc';

export default function EducacionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  // Estados de ordenamiento exclusivos de la tabla
  const [sortField, setSortField] = useState<SortField>('poblacion_2022');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/educacion'));
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

  const kpis = data?.kpisProvincia;
  const deptosOriginal = data?.departamentos || [];

  // Datos fijos para el gráfico: ordenados por población descendente
  const datosGrafico = useMemo(() => {
    return [...deptosOriginal].sort((a: any, b: any) => (Number(b.poblacion_2022) || 0) - (Number(a.poblacion_2022) || 0));
  }, [deptosOriginal]);

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
  const deptosTablaOrdenados = useMemo(() => {
    if (!deptosOriginal.length) return [];
    return [...deptosOriginal].sort((a: any, b: any) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'departamento') {
        aVal = (a.departamento || '').toLowerCase();
        bVal = (b.departamento || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      aVal = Number(a[sortField]) || 0;
      bVal = Number(b[sortField]) || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [deptosOriginal, sortField, sortOrder]);

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

      {/* Tarjetas KPI Superiores dinámicas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">Total Mayores de 25 Años</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {kpis?.totalMayores25 || '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Provincia de Corrientes</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">% Secundaria Completa (Provincia)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {kpis?.pctSecundariaCompletaProv || '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Corrientes</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <span className="metricLabel">% Secundaria Completa (País)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {kpis?.pctSecundariaCompletaPais || '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Nacional</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <span className="metricLabel">% Secundaria Completa (NEA)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b45309' }}>
            {kpis?.pctSecundariaCompletaNea || '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Región NEA</span>
        </div>
      </div>

      {/* Gráfico / Tabla */}
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
              <span>Calculando indicadores educativos...</span>
            </div>
          ) : viewMode === 'grafico' ? (
            <div style={{ width: '100%', height: 620 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={datosGrafico}
                  margin={{ top: 20, right: 40, left: 20, bottom: 35 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    stroke="#94a3b8"
                    fontSize={11}
                    label={{
                      value: 'Distribución porcentual de asistencia educativa (%)',
                      position: 'insideBottom',
                      offset: -18,
                      fill: '#64748b',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="departamento"
                    width={140}
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    label={{
                      value: 'Departamento',
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
                      `${Number(val).toLocaleString('es-AR')} personas`,
                      name === 'asiste' ? 'Asiste Actualmente' : name === 'asistio' ? 'Asistió' : 'Nunca Asistió',
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
                    formatter={(val) => (val === 'asiste' ? 'Asiste Actualmente' : val === 'asistio' ? 'Asistió' : 'Nunca Asistió')}
                  />
                  <Bar dataKey="asiste" stackId="asistencia" fill="#047857" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="asistio" stackId="asistencia" fill="#1e3a8a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="nunca_asistio" stackId="asistencia" fill="#94a3b8" radius={[0, 4, 4, 0]} />
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
                      onClick={() => handleSort('departamento')}
                      style={{ padding: '10px 12px', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span>Departamento</span>
                        {renderSortIcon('departamento')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('poblacion_2022')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Población 2022</span>
                        {renderSortIcon('poblacion_2022')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('asiste')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Asiste Actualmente</span>
                        {renderSortIcon('asiste')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('asistio')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Asistió</span>
                        {renderSortIcon('asistio')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('nunca_asistio')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Nunca Asistió</span>
                        {renderSortIcon('nunca_asistio')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deptosTablaOrdenados.map((row: any, idx: number) => (
                    <tr
                      key={row.departamento || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.departamento}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.poblacion_2022.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                        {row.asiste.toLocaleString('es-AR')} <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>({row.pct_asiste}%)</span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#1e3a8a' }}>
                        {row.asistio.toLocaleString('es-AR')} <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>({row.pct_asistio}%)</span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>
                        {row.nunca_asistio.toLocaleString('es-AR')} <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({row.pct_nunca_asistio}%)</span>
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