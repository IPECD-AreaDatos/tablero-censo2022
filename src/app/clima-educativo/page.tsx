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
import TerritoryFilter, { territoryKey } from '@/components/TerritoryFilter';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type NivelClima = 'muy_bajo' | 'bajo' | 'medio' | 'alto' | 'muy_alto';
type SortField = 'nombre' | 'total_hogares' | 'valor_clima' | 'pct_clima';
type SortOrder = 'asc' | 'desc';
type ClimaTerritory = {
  departamento: string;
  municipio: string;
  nombre: string;
  total_hogares: number;
  muy_bajo: number;
  bajo: number;
  medio: number;
  alto: number;
  muy_alto: number;
  pct_muy_bajo: string;
  pct_bajo: string;
  pct_medio: string;
  pct_alto: string;
  pct_muy_alto: string;
};
type VisibleClimaTerritory = ClimaTerritory & { locationKey: string };
type ClimaData = {
  totalHogares: number;
  kpis: { pctProv: string; pctPais: string; pctNea: string };
  detalle: ClimaTerritory[];
};

const EMPTY_TERRITORIES: ClimaTerritory[] = [];

export default function ClimaEducativoPage() {
  const [data, setData] = useState<ClimaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClima, setSelectedClima] = useState<NivelClima>('medio');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');
  const [scope, setScope] = useState<'departamento' | 'municipio'>('departamento');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);

  // Ordenamiento exclusivo de la tabla
  const [sortField, setSortField] = useState<SortField>('valor_clima');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/clima-educativo'));
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

  const detalleOriginal = useMemo(() => data?.detalle ?? EMPTY_TERRITORIES, [data]);
  const detalleFiltrado = useMemo(
    () => detalleOriginal.filter((territory) => selectedLocations === null || selectedLocations.includes(territoryKey(territory))),
    [detalleOriginal, selectedLocations],
  );

  const labelsClima: Record<NivelClima, string> = {
    muy_bajo: 'Clima Muy Bajo',
    bajo: 'Clima Bajo',
    medio: 'Clima Medio',
    alto: 'Clima Alto',
    muy_alto: 'Clima Muy Alto',
  };

  const territoriosVisibles = useMemo<VisibleClimaTerritory[]>(() => {
    if (scope === 'municipio') {
      return detalleFiltrado.map((territory) => ({
        ...territory,
        locationKey: territoryKey(territory),
      }));
    }

    const grouped = new Map<string, VisibleClimaTerritory>();
    for (const territory of detalleFiltrado) {
      const current = grouped.get(territory.departamento) || {
        departamento: territory.departamento,
        municipio: '',
        nombre: territory.departamento,
        locationKey: territory.departamento,
        total_hogares: 0,
        muy_bajo: 0,
        bajo: 0,
        medio: 0,
        alto: 0,
        muy_alto: 0,
        pct_muy_bajo: '0',
        pct_bajo: '0',
        pct_medio: '0',
        pct_alto: '0',
        pct_muy_alto: '0',
      };
      current.total_hogares += territory.total_hogares;
      current.muy_bajo += territory.muy_bajo;
      current.bajo += territory.bajo;
      current.medio += territory.medio;
      current.alto += territory.alto;
      current.muy_alto += territory.muy_alto;
      grouped.set(territory.departamento, current);
    }

    return Array.from(grouped.values()).map((territory) => ({
      ...territory,
      pct_muy_bajo: territory.total_hogares > 0 ? ((territory.muy_bajo / territory.total_hogares) * 100).toFixed(1) : '0',
      pct_bajo: territory.total_hogares > 0 ? ((territory.bajo / territory.total_hogares) * 100).toFixed(1) : '0',
      pct_medio: territory.total_hogares > 0 ? ((territory.medio / territory.total_hogares) * 100).toFixed(1) : '0',
      pct_alto: territory.total_hogares > 0 ? ((territory.alto / territory.total_hogares) * 100).toFixed(1) : '0',
      pct_muy_alto: territory.total_hogares > 0 ? ((territory.muy_alto / territory.total_hogares) * 100).toFixed(1) : '0',
    }));
  }, [detalleFiltrado, scope]);

  const totalSeleccionado = detalleFiltrado.reduce((total, territory) => total + territory.total_hogares, 0);
  const hogaresClimaMedioSeleccionado = detalleFiltrado.reduce((total, territory) => total + territory.medio, 0);
  const seleccionCompleta = selectedLocations === null || selectedLocations.length === detalleOriginal.length;
  const pctClimaProvincia = totalSeleccionado > 0
    ? `${((hogaresClimaMedioSeleccionado / totalSeleccionado) * 100).toFixed(1).replace('.', ',')} %`
    : '0,0 %';

  const datosGrafico = useMemo(() => [...territoriosVisibles]
    .sort((a, b) => b[selectedClima] - a[selectedClima])
    .slice(0, 25), [territoriosVisibles, selectedClima]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Ícono de orden con tamaño estricto de 12px
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
    if (!territoriosVisibles.length) return [];
    return [...territoriosVisibles].sort((a, b) => {
      if (sortField === 'nombre') {
        const aVal = a.nombre.toLowerCase();
        const bVal = b.nombre.toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const aVal = sortField === 'total_hogares' ? a.total_hogares : sortField === 'valor_clima' ? a[selectedClima] : Number(a[`pct_${selectedClima}`]);
      const bVal = sortField === 'total_hogares' ? b.total_hogares : sortField === 'valor_clima' ? b[selectedClima] : Number(b[`pct_${selectedClima}`]);
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [territoriosVisibles, sortField, sortOrder, selectedClima]);

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>CLIMA EDUCATIVO EN EL HOGAR</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 y Comparativas Regionales
          </p>
        </div>
      </div>

      {/* KPIs Calculados Dinámicamente desde Base de Datos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">{seleccionCompleta ? 'Total Hogares Relevados' : 'Hogares seleccionados'}</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {data ? totalSeleccionado.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{seleccionCompleta ? 'Total Provincial Calculado' : 'Territorios seleccionados'}</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981' }}>
          <span className="metricLabel">% Clima Medio ({seleccionCompleta ? 'Provincia' : 'Selección'})</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {pctClimaProvincia || '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{seleccionCompleta ? 'Corrientes' : 'Territorios seleccionados'}</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6' }}>
          <span className="metricLabel">% Clima Medio (Total País)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {data?.kpis?.pctPais || '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Nacional</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <span className="metricLabel">% Clima Medio (Región NEA)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b45309' }}>
            {data?.kpis?.pctNea || '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Región NEA</span>
        </div>
      </div>

      {/* Selector de Nivel de Clima Educativo */}
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
          NIVEL DE CLIMA EDUCATIVO:
        </span>
        {(['muy_bajo', 'bajo', 'medio', 'alto', 'muy_alto'] as NivelClima[]).map((nivel) => (
          <button
            key={nivel}
            onClick={() => setSelectedClima(nivel)}
            style={{
              border: '1px solid',
              borderColor: selectedClima === nivel ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedClima === nivel ? '#14203b' : '#f8fafc',
              color: selectedClima === nivel ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedClima === nivel ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {labelsClima[nivel]}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla */}
      <div className="population-layout">
      <div className="card" style={{ margin: 0 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Distribución de {labelsClima[selectedClima]} por {scope}</span>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Ver por</span>
            <div style={{ display: 'inline-flex', gap: 4, padding: 3, borderRadius: 8, background: '#f1f5f9' }}>
              {(['departamento', 'municipio'] as const).map((nivel) => (
                <button
                  key={nivel}
                  onClick={() => setScope(nivel)}
                  aria-pressed={scope === nivel}
                  style={{ border: 0, borderRadius: 6, padding: '7px 12px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', background: scope === nivel ? '#14203b' : 'transparent', color: scope === nivel ? '#fff' : '#475569' }}
                >
                  {nivel}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', height: 450, alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b' }}>
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Calculando indicadores de clima educativo...</span>
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
                      value: 'Cantidad de Hogares',
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
                    width={175}
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    label={{
                      value: scope === 'departamento' ? 'Departamento' : 'Municipio',
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
                    formatter={(value) => [
                      `${Number(value).toLocaleString('es-AR')} hogares`,
                      labelsClima[selectedClima],
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
                  <Bar dataKey={selectedClima} fill="#047857" radius={[0, 4, 4, 0]} />
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
                      onClick={() => handleSort('total_hogares')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Total Hogares</span>
                        {renderSortIcon('total_hogares')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('valor_clima')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>{labelsClima[selectedClima]}</span>
                        {renderSortIcon('valor_clima')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('pct_clima')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>% Incidencia</span>
                        {renderSortIcon('pct_clima')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detalleTablaOrdenado.map((row, idx: number) => (
                    <tr
                      key={row.locationKey || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.nombre}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.total_hogares.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                        {row[selectedClima].toLocaleString('es-AR')}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {row[`pct_${selectedClima}`]} %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <TerritoryFilter
        territories={detalleOriginal}
        selectedKeys={selectedLocations}
        onSelectionChange={setSelectedLocations}
      />
      </div>
    </div>
  );
}