'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { 
  Flame, 
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

type TipoCombustible = 'gas_garrafa' | 'gas_tubo' | 'electricidad' | 'lena_carbon';
type SortField = 'nombre' | 'total_viviendas' | 'valor_combustible' | 'pct_combustible';
type SortOrder = 'asc' | 'desc';

export default function CombustiblePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCombustible, setSelectedCombustible] = useState<TipoCombustible>('gas_garrafa');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  // Estados de ordenamiento exclusivos de la tabla
  const [sortField, setSortField] = useState<SortField>('valor_combustible');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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

  const detalleOriginal = data?.detalle || [];
  const totales = data?.totalesProvincia;

  const labelsCombustible: Record<TipoCombustible, string> = {
    gas_garrafa: 'Gas en Garrafa',
    gas_tubo: 'Gas en Tubo o Zepelín',
    electricidad: 'Electricidad',
    lena_carbon: 'Leña o Carbón',
  };

  // Datos fijos para el gráfico: siempre ordenados de mayor a menor según el combustible seleccionado
  const datosGrafico = useMemo(() => {
    if (!detalleOriginal.length) return [];
    return [...detalleOriginal]
      .sort((a: any, b: any) => (Number(b[selectedCombustible]) || 0) - (Number(a[selectedCombustible]) || 0))
      .slice(0, 25);
  }, [detalleOriginal, selectedCombustible]);

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
    if (!detalleOriginal.length) return [];
    return [...detalleOriginal].sort((a: any, b: any) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'nombre') {
        aVal = (a.nombre || '').toLowerCase();
        bVal = (b.nombre || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (sortField === 'total_viviendas') {
        aVal = Number(a.total_viviendas) || 0;
        bVal = Number(b.total_viviendas) || 0;
      } else if (sortField === 'valor_combustible') {
        aVal = Number(a[selectedCombustible]) || 0;
        bVal = Number(b[selectedCombustible]) || 0;
      } else if (sortField === 'pct_combustible') {
        aVal = parseFloat(String(a[`pct_${selectedCombustible}`] || '0').replace(',', '.')) || 0;
        bVal = parseFloat(String(b[`pct_${selectedCombustible}`] || '0').replace(',', '.')) || 0;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [detalleOriginal, sortField, sortOrder, selectedCombustible]);

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
                <BarChart
                  layout="vertical"
                  data={datosGrafico}
                  margin={{ top: 20, right: 40, left: 20, bottom: 35 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) => Number(v).toLocaleString('es-AR')}
                    stroke="#94a3b8"
                    fontSize={11}
                    label={{
                      value: 'Cantidad de Viviendas Particulares',
                      position: 'insideBottom',
                      offset: -18,
                      fill: '#64748b',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={150}
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    label={{
                      value: 'Territorio / Área',
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
                    formatter={(val: any) => [
                      `${Number(val).toLocaleString('es-AR')} viviendas`,
                      labelsCombustible[selectedCombustible],
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
                  <Bar
                    dataKey={selectedCombustible}
                    fill={
                      selectedCombustible === 'gas_garrafa'
                        ? '#047857'
                        : selectedCombustible === 'gas_tubo'
                        ? '#2563eb'
                        : selectedCombustible === 'electricidad'
                        ? '#d97706'
                        : '#dc2626'
                    }
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
                      onClick={() => handleSort('nombre')}
                      style={{ padding: '10px 12px', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span>Territorio / Área</span>
                        {renderSortIcon('nombre')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('total_viviendas')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Total Viviendas</span>
                        {renderSortIcon('total_viviendas')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('valor_combustible')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>{labelsCombustible[selectedCombustible]}</span>
                        {renderSortIcon('valor_combustible')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('pct_combustible')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>% Incidencia</span>
                        {renderSortIcon('pct_combustible')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detalleTablaOrdenado.map((row: any, idx: number) => (
                    <tr
                      key={row.nombre || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.nombre}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.total_viviendas.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                        {row[selectedCombustible].toLocaleString('es-AR')}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {row[`pct_${selectedCombustible}`] || '0'} %
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