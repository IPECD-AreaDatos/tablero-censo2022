'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import TerritoryFilter, { territoryKey } from '@/components/TerritoryFilter';
import { 
  Wifi, 
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
  LabelList,
} from 'recharts';

type TipoInternet = 'con_internet' | 'sin_internet';
type SortField = 'departamento' | 'municipio' | 'total_viviendas' | 'con_internet' | 'pct_con_internet' | 'sin_internet' | 'pct_sin_internet';
type SortOrder = 'asc' | 'desc';

type InternetTerritory = {
  departamento: string;
  municipio: string;
  nombre: string;
  total_viviendas: number;
  con_internet: number;
  sin_internet: number;
  pct_con_internet: string;
  pct_sin_internet: string;
};

type VisibleInternetTerritory = InternetTerritory & { locationKey: string };

const EMPTY_TERRITORIES: InternetTerritory[] = [];

export default function InternetPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<TipoInternet>('con_internet');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);

  // Estados de ordenamiento exclusivos de la tabla
  const [sortField, setSortField] = useState<SortField>('con_internet');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/internet'));
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

  const detalleOriginal = useMemo<InternetTerritory[]>(() => data?.detalle ?? EMPTY_TERRITORIES, [data]);
  const detalleFiltrado = useMemo(
    () =>
      detalleOriginal.filter(
        (territory) => selectedLocations === null || selectedLocations.includes(territoryKey(territory)),
      ),
    [detalleOriginal, selectedLocations],
  );

  const labelsInternet: Record<TipoInternet, string> = {
    con_internet: 'Con Acceso a Internet',
    sin_internet: 'Sin Acceso a Internet',
  };

  const territoriosVisibles = useMemo<VisibleInternetTerritory[]>(() => {
    return detalleFiltrado.map((territory) => ({
      ...territory,
      municipio: territory.municipio || territory.nombre || territory.departamento,
      locationKey: territoryKey(territory),
    }));
  }, [detalleFiltrado]);

  // Cálculos dinámicos de las 4 tarjetas KPI superiores según selección territorial y opción activa
  const seleccionCompleta = selectedLocations === null || selectedLocations.length === detalleOriginal.length;

  const kpisDinamicos = useMemo(() => {
    const totalViviendas = detalleFiltrado.reduce((acc, t) => acc + t.total_viviendas, 0);
    const sumSeleccionada = detalleFiltrado.reduce((acc, t) => acc + (t[selectedTipo] || 0), 0);

    const pctSeleccion =
      totalViviendas > 0
        ? `${((sumSeleccionada / totalViviendas) * 100).toFixed(1).replace('.', ',')} %`
        : '0,0 %';

    return {
      totalViviendas,
      sumSeleccionada,
      pctSeleccion,
      pctNea: data?.kpis?.nea?.[selectedTipo] || '—',
      pctPais: data?.kpis?.pais?.[selectedTipo] || '—',
    };
  }, [detalleFiltrado, selectedTipo, data]);

  // Datos para el gráfico: ordenados de mayor a menor según la opción elegida (sin mezclar barras)
  const datosGrafico = useMemo(() => {
    return [...territoriosVisibles]
      .sort((a, b) => (Number(b[selectedTipo]) || 0) - (Number(a[selectedTipo]) || 0))
      .slice(0, 25);
  }, [territoriosVisibles, selectedTipo]);

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
    if (!territoriosVisibles.length) return [];
    return [...territoriosVisibles].sort((a, b) => {
      if (sortField === 'departamento' || sortField === 'municipio') {
        const aVal = (a[sortField] || '').toLowerCase();
        const bVal = (b[sortField] || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const aVal = Number(a[sortField]) || 0;
      const bVal = Number(b[sortField]) || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [territoriosVisibles, sortField, sortOrder]);

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>ACCESO A INTERNET EN VIVIENDAS PARTICULARES</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 y Comparativas Regionales
          </p>
        </div>
      </div>

      {/* Tarjetas KPI Superiores dinámicas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">
            {seleccionCompleta ? 'Total Viviendas Evaluadas' : 'Viviendas Seleccionadas'}
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {data ? kpisDinamicos.totalViviendas.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {seleccionCompleta ? 'Total Provincial Calculado' : 'Territorios seleccionados'}
          </span>
        </div>

        <div
          className="card"
          style={{
            padding: '14px 18px',
            borderLeft: `4px solid ${selectedTipo === 'con_internet' ? '#059669' : '#dc2626'}`,
          }}
        >
          <span className="metricLabel">
            % {labelsInternet[selectedTipo]} ({seleccionCompleta ? 'Corrientes' : 'Selección'})
          </span>
          <span
            className="metricVal"
            style={{
              fontSize: '1.4rem',
              marginTop: 4,
              color: selectedTipo === 'con_internet' ? '#047857' : '#b91c1c',
            }}
          >
            {data ? kpisDinamicos.pctSeleccion : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {data ? `${kpisDinamicos.sumSeleccionada.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <span className="metricLabel">% {labelsInternet[selectedTipo]} (Región NEA)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b45309' }}>
            {kpisDinamicos.pctNea}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Región NEA</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6' }}>
          <span className="metricLabel">% {labelsInternet[selectedTipo]} (Total País)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {kpisDinamicos.pctPais}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Nacional</span>
        </div>
      </div>

      {/* Selector de Condición de Conectividad (2 opciones separadas) */}
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
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14203b', marginRight: 8 }}>
          CONDICIÓN A VISUALIZAR:
        </span>
        {(['con_internet', 'sin_internet'] as TipoInternet[]).map((tipo) => (
          <button
            key={tipo}
            onClick={() => setSelectedTipo(tipo)}
            style={{
              border: '1px solid',
              borderColor: selectedTipo === tipo ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedTipo === tipo ? '#14203b' : '#f8fafc',
              color: selectedTipo === tipo ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedTipo === tipo ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {labelsInternet[tipo]}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla + Filtro Lateral */}
      <div className="population-layout">
        <div className="card" style={{ margin: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>Distribución de Viviendas {labelsInternet[selectedTipo]} por municipio</span>
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
                <span>Calculando acceso a internet...</span>
              </div>
            ) : viewMode === 'grafico' ? (
              <div style={{ width: '100%', height: 600 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={datosGrafico}
                    margin={{ top: 20, right: 65, left: 20, bottom: 35 }}
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
                      dataKey="municipio"
                      width={175}
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      label={{
                        value: 'Municipio',
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
                        labelsInternet[selectedTipo],
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
                      dataKey={selectedTipo}
                      fill={selectedTipo === 'con_internet' ? '#047857' : '#dc2626'}
                      radius={[0, 4, 4, 0]}
                    >
                      <LabelList
                        dataKey={selectedTipo}
                        position="right"
                        formatter={(val: any) => Number(val).toLocaleString('es-AR')}
                        style={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                style={{
                  maxHeight: '520px',
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
                        onClick={() => handleSort('municipio')}
                        style={{ padding: '10px 12px', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <span>Municipio</span>
                          {renderSortIcon('municipio')}
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
                        onClick={() => handleSort('con_internet')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>Con Internet</span>
                          {renderSortIcon('con_internet')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('pct_con_internet')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>% Cobertura</span>
                          {renderSortIcon('pct_con_internet')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('sin_internet')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>Sin Internet</span>
                          {renderSortIcon('sin_internet')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('pct_sin_internet')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>% Sin Conexión</span>
                          {renderSortIcon('pct_sin_internet')}
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
                        <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: 500 }}>{row.departamento}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.municipio}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.total_viviendas.toLocaleString('es-AR')}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                          {row.con_internet.toLocaleString('es-AR')}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#047857' }}>
                          {row.pct_con_internet} %
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                          {row.sin_internet.toLocaleString('es-AR')}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#b91c1c' }}>
                          {row.pct_sin_internet} %
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