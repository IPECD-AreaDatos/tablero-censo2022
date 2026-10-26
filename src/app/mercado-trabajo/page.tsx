'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { 
  Briefcase, 
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
} from 'recharts';

type IndicadorTrabajo = 'actividad' | 'empleo' | 'desocupacion';
type SortField = 'departamento' | 'actividad' | 'empleo' | 'desocupacion' | 'empleado_obrero' | 'cuenta_propia';
type SortOrder = 'asc' | 'desc';

export default function MercadoTrabajoPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndicador, setSelectedIndicador] = useState<IndicadorTrabajo>('actividad');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  // Estados de ordenamiento exclusivos de la tabla
  const [sortField, setSortField] = useState<SortField>('actividad');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/mercado-trabajo'));
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

  const deptosOriginal = data?.departamentos || [];
  const totales = data?.totalesProvincia;

  const labelsIndicador: Record<IndicadorTrabajo, string> = {
    actividad: 'Tasa de Actividad (%)',
    empleo: 'Tasa de Empleo (%)',
    desocupacion: 'Tasa de Desocupación (%)',
  };

  // Datos fijos para el gráfico: siempre ordenados de mayor a menor por el indicador seleccionado
  const datosGrafico = useMemo(() => {
    if (!deptosOriginal.length) return [];
    return [...deptosOriginal]
      .sort((a: any, b: any) => (Number(b[selectedIndicador]) || 0) - (Number(a[selectedIndicador]) || 0));
  }, [deptosOriginal, selectedIndicador]);

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

  const getColorIndicador = (ind: IndicadorTrabajo) => {
    switch (ind) {
      case 'actividad':
        return '#047857';
      case 'empleo':
        return '#2563eb';
      case 'desocupacion':
        return '#dc2626';
    }
  };

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

      {/* Tarjetas KPI Superiores dinámicas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">Tasa de Actividad Provincial</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {totales?.actividad || '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Provincia de Corrientes</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <span className="metricLabel">Tasa de Empleo Provincial</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {totales?.empleo || '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Provincia de Corrientes</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #dc2626' }}>
          <span className="metricLabel">Tasa de Desocupación Provincial</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b91c1c' }}>
            {totales?.desocupacion || '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Provincia de Corrientes</span>
        </div>
      </div>

      {/* Selector de Indicador */}
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
        {(['actividad', 'empleo', 'desocupacion'] as IndicadorTrabajo[]).map((ind) => (
          <button
            key={ind}
            onClick={() => setSelectedIndicador(ind)}
            style={{
              border: '1px solid',
              borderColor: selectedIndicador === ind ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedIndicador === ind ? '#14203b' : '#f8fafc',
              color: selectedIndicador === ind ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedIndicador === ind ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {labelsIndicador[ind].replace(' (%)', '')}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span>{labelsIndicador[selectedIndicador]} por Departamento</span>
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
              <span>Calculando mercado de trabajo...</span>
            </div>
          ) : viewMode === 'grafico' ? (
            <div style={{ width: '100%', height: 600 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={datosGrafico}
                  margin={{ top: 20, right: 40, left: 20, bottom: 35 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${v}%`}
                    stroke="#94a3b8"
                    fontSize={11}
                    label={{
                      value: labelsIndicador[selectedIndicador],
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
                    formatter={(val: any) => [`${Number(val).toFixed(1).replace('.', ',')} %`, labelsIndicador[selectedIndicador].replace(' (%)', '')]}
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
                  <Bar
                    dataKey={selectedIndicador}
                    fill={getColorIndicador(selectedIndicador)}
                    radius={[0, 4, 4, 0]}
                  />
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
                      onClick={() => handleSort('actividad')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Tasa Actividad</span>
                        {renderSortIcon('actividad')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('empleo')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Tasa Empleo</span>
                        {renderSortIcon('empleo')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('desocupacion')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Tasa Desocupación</span>
                        {renderSortIcon('desocupacion')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('empleado_obrero')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Empleados / Obreros</span>
                        {renderSortIcon('empleado_obrero')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('cuenta_propia')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Cuenta Propia</span>
                        {renderSortIcon('cuenta_propia')}
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
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: selectedIndicador === 'actividad' ? 700 : 500, color: selectedIndicador === 'actividad' ? '#047857' : 'inherit' }}>
                        {row.actividad.toFixed(1).replace('.', ',')} %
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: selectedIndicador === 'empleo' ? 700 : 500, color: selectedIndicador === 'empleo' ? '#2563eb' : 'inherit' }}>
                        {row.empleo.toFixed(1).replace('.', ',')} %
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: selectedIndicador === 'desocupacion' ? 700 : 500, color: selectedIndicador === 'desocupacion' ? '#dc2626' : 'inherit' }}>
                        {row.desocupacion.toFixed(1).replace('.', ',')} %
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>
                        {row.empleado_obrero.toLocaleString('es-AR')}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>
                        {row.cuenta_propia.toLocaleString('es-AR')}
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