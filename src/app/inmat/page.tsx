'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { InfoTooltip } from '@/components/InfoTooltip';
import TerritoryFilter, { territoryKey } from '@/components/TerritoryFilter';
import { 
  Layers, 
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

type CalidadInmat = 'calidad_1' | 'calidad_2' | 'calidad_3' | 'calidad_4';
type SortField = 'departamento' | 'municipio' | 'total_viviendas' | 'valor_calidad' | 'pct_calidad';
type SortOrder = 'asc' | 'desc';

type InmatTerritory = {
  departamento: string;
  municipio: string;
  nombre: string;
  total_viviendas: number;
  calidad_1: number;
  calidad_2: number;
  calidad_3: number;
  calidad_4: number;
  ignorado: number;
  pct_calidad_1: string;
  pct_calidad_2: string;
  pct_calidad_3: string;
  pct_calidad_4: string;
};

type VisibleInmatTerritory = InmatTerritory & { locationKey: string };

const EMPTY_TERRITORIES: InmatTerritory[] = [];

export default function InmatPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCalidad, setSelectedCalidad] = useState<CalidadInmat>('calidad_1');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);

  const [sortField, setSortField] = useState<SortField>('valor_calidad');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/inmat'));
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

  const detalleOriginal = useMemo<InmatTerritory[]>(() => data?.detalle ?? EMPTY_TERRITORIES, [data]);
  const detalleFiltrado = useMemo(
    () =>
      detalleOriginal.filter(
        (territory) => selectedLocations === null || selectedLocations.includes(territoryKey(territory)),
      ),
    [detalleOriginal, selectedLocations],
  );

  const labelsInmat: Record<CalidadInmat, string> = {
    calidad_1: 'Calidad I (Materiales Satisfactorios)',
    calidad_2: 'Calidad II (Aceptables / Reparables)',
    calidad_3: 'Calidad III (Materiales Deficitarios)',
    calidad_4: 'Calidad IV (Materiales Críticos / Precarios)',
  };

  const labelsCortos: Record<CalidadInmat, string> = {
    calidad_1: 'Calidad 1',
    calidad_2: 'Calidad 2',
    calidad_3: 'Calidad 3',
    calidad_4: 'Calidad 4',
  };

  const descripcionesInmat: Record<CalidadInmat, string> = {
    calidad_1:
      'Calidad de los materiales con que están construidas las viviendas (material predominante de los pisos y techos). Calidad I: la vivienda presenta materiales resistentes y sólidos, tanto en el piso como en techo; presenta cielorraso.',
    calidad_2:
      'Calidad de los materiales con que están construidas las viviendas (material predominante de los pisos y techos). Calidad II: la vivienda presenta materiales resistentes y sólidos, tanto en el piso como en el techo, sin cielorraso o bien materiales de menor calidad en pisos.',
    calidad_3:
      'Calidad de los materiales con que están construidas las viviendas (material predominante de los pisos y techos). Calidad III: la vivienda presenta materiales poco resistentes y sólidos, tanto en el piso como en el techo.',
    calidad_4:
      'Calidad de los materiales con que están construidas las viviendas (material predominante de los pisos y techos). Calidad IV: la vivienda presenta materiales de baja calidad, tanto en el piso como en el techo.',
  };

  const territoriosVisibles = useMemo<VisibleInmatTerritory[]>(() => {
    return detalleFiltrado.map((territory) => ({
      ...territory,
      municipio: territory.municipio || territory.nombre || territory.departamento,
      locationKey: territoryKey(territory),
    }));
  }, [detalleFiltrado]);

  // Cálculos dinámicos conectados al botón de Calidad y al filtro territorial
  const totalSeleccionado = detalleFiltrado.reduce((acc, t) => acc + t.total_viviendas, 0);
  const hogaresCalidadSeleccionada = detalleFiltrado.reduce((acc, t) => acc + (t[selectedCalidad] || 0), 0);
  const seleccionCompleta = selectedLocations === null || selectedLocations.length === detalleOriginal.length;

  const pctCalidadProvincia =
    totalSeleccionado > 0
      ? `${((hogaresCalidadSeleccionada / totalSeleccionado) * 100).toFixed(1).replace('.', ',')} %`
      : '0,0 %';

  const pctCalidadPais = data?.kpis?.pais?.[selectedCalidad] || '—';
  const pctCalidadNea = data?.kpis?.nea?.[selectedCalidad] || '—';

  const datosGrafico = useMemo(() => {
    return [...territoriosVisibles]
      .sort((a, b) => (Number(b[selectedCalidad]) || 0) - (Number(a[selectedCalidad]) || 0))
      .slice(0, 25);
  }, [territoriosVisibles, selectedCalidad]);

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

  const detalleTablaOrdenado = useMemo(() => {
    if (!territoriosVisibles.length) return [];
    return [...territoriosVisibles].sort((a, b) => {
      if (sortField === 'departamento' || sortField === 'municipio') {
        const aVal = (a[sortField] || '').toLowerCase();
        const bVal = (b[sortField] || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const aVal =
        sortField === 'total_viviendas'
          ? a.total_viviendas
          : sortField === 'valor_calidad'
          ? a[selectedCalidad]
          : Number(a[`pct_${selectedCalidad}`]);
      const bVal =
        sortField === 'total_viviendas'
          ? b.total_viviendas
          : sortField === 'valor_calidad'
          ? b[selectedCalidad]
          : Number(b[`pct_${selectedCalidad}`]);

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [territoriosVisibles, sortField, sortOrder, selectedCalidad]);

  const getColorCalidad = (cal: CalidadInmat) => {
    switch (cal) {
      case 'calidad_1':
        return '#047857';
      case 'calidad_2':
        return '#2563eb';
      case 'calidad_3':
        return '#d97706';
      case 'calidad_4':
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
          <h1>INDICADOR DE MATERIALES DE LA VIVIENDA (INMAT)</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 y Comparativas Regionales
          </p>
        </div>
      </div>

      {/* Tarjetas KPI: Total Viviendas | Provincia/Selección | Total País | Región NEA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px', overflow: 'visible' }}>
          <span className="metricLabel" style={{ display: 'flex', alignItems: 'center' }}>
            {seleccionCompleta ? 'Total Viviendas Relevadas' : 'Viviendas seleccionadas'}
            <InfoTooltip text="Total de viviendas particulares censadas en la jurisdicción analizada." />
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {data ? totalSeleccionado.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {seleccionCompleta ? 'Total Provincial Calculado' : 'Territorios seleccionados'}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981', overflow: 'visible' }}>
          <span className="metricLabel" style={{ display: 'flex', alignItems: 'center' }}>
            % {labelsCortos[selectedCalidad]} ({seleccionCompleta ? 'Provincia' : 'Selección'})
            <InfoTooltip text={descripcionesInmat[selectedCalidad]} />
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {data ? pctCalidadProvincia : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {data ? `${hogaresCalidadSeleccionada.toLocaleString('es-AR')} viviendas (${seleccionCompleta ? 'Corrientes' : 'Selección'})` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6', overflow: 'visible' }}>
          <span className="metricLabel" style={{ display: 'flex', alignItems: 'center' }}>
            % {labelsCortos[selectedCalidad]} (Total País)
            <InfoTooltip text={descripcionesInmat[selectedCalidad]} />
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {pctCalidadPais}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Nacional</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b', overflow: 'visible' }}>
          <span className="metricLabel" style={{ display: 'flex', alignItems: 'center' }}>
            % {labelsCortos[selectedCalidad]} (Región NEA)
            <InfoTooltip text={descripcionesInmat[selectedCalidad]} />
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b45309' }}>
            {pctCalidadNea}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Región NEA</span>
        </div>
      </div>

      {/* Selector de Nivel INMAT */}
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
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14203b', marginRight: 8, display: 'inline-flex', alignItems: 'center' }}>
          CATEGORÍA INMAT
          <InfoTooltip text={descripcionesInmat[selectedCalidad]} />
          <span style={{ marginLeft: 4 }}>:</span>
        </span>
        {(['calidad_1', 'calidad_2', 'calidad_3', 'calidad_4'] as CalidadInmat[]).map((cal) => (
          <button
            key={cal}
            onClick={() => setSelectedCalidad(cal)}
            style={{
              border: '1px solid',
              borderColor: selectedCalidad === cal ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedCalidad === cal ? '#14203b' : '#f8fafc',
              color: selectedCalidad === cal ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedCalidad === cal ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {labelsInmat[cal].split(' (')[0]}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla + Filtro Lateral */}
      <div className="population-layout">
        <div className="card" style={{ margin: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Distribución de {labelsInmat[selectedCalidad]} por municipio</span>
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
                <span>Calculando materiales de vivienda...</span>
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
                        labelsInmat[selectedCalidad],
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
                      dataKey={selectedCalidad}
                      fill={getColorCalidad(selectedCalidad)}
                      radius={[0, 4, 4, 0]}
                    >
                      <LabelList
                        dataKey={selectedCalidad}
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
                        onClick={() => handleSort('valor_calidad')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>{labelsInmat[selectedCalidad].split(' (')[0]}</span>
                          {renderSortIcon('valor_calidad')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('pct_calidad')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>% Incidencia</span>
                          {renderSortIcon('pct_calidad')}
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
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: getColorCalidad(selectedCalidad) }}>
                          {row[selectedCalidad].toLocaleString('es-AR')}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {row[`pct_${selectedCalidad}`]} %
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