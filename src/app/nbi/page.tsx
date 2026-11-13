'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { InfoTooltip } from '@/components/InfoTooltip';
import TerritoryFilter, { territoryKey } from '@/components/TerritoryFilter';
import { 
  AlertTriangle, 
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

type ComponenteNBI =
  | 'si_nbi'
  | 'hacinamiento'
  | 'viv_inconveniente'
  | 'cond_sanitarias'
  | 'escolaridad'
  | 'capacidad_subsistencia';

type SortField = 'departamento' | 'municipio' | 'total_viviendas' | 'valor_nbi' | 'pct_nbi';
type SortOrder = 'asc' | 'desc';

type NbiTerritory = {
  departamento: string;
  municipio: string;
  nombre: string;
  total_viviendas: number;
  si_nbi: number;
  no_nbi: number;
  hacinamiento: number;
  viv_inconveniente: number;
  cond_sanitarias: number;
  escolaridad: number;
  capacidad_subsistencia: number;
  pct_si_nbi: string;
  pct_hacinamiento: string;
  pct_viv_inconveniente: string;
  pct_cond_sanitarias: string;
  pct_escolaridad: string;
  pct_capacidad_subsistencia: string;
};

type VisibleNbiTerritory = NbiTerritory & { locationKey: string };

type NbiData = {
  totalHogares: number;
  sumNbi: number;
  kpis: {
    pais: Record<ComponenteNBI, string>;
    nea: Record<ComponenteNBI, string>;
  };
  detalle: NbiTerritory[];
};

const EMPTY_TERRITORIES: NbiTerritory[] = [];

export default function NBIPage() {
  const [data, setData] = useState<NbiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedComp, setSelectedComp] = useState<ComponenteNBI>('si_nbi');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);

  // Estados de ordenamiento exclusivos de la tabla
  const [sortField, setSortField] = useState<SortField>('valor_nbi');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/nbi'));
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
    () =>
      detalleOriginal.filter(
        (territory) => selectedLocations === null || selectedLocations.includes(territoryKey(territory)),
      ),
    [detalleOriginal, selectedLocations],
  );

  const labelsComp: Record<ComponenteNBI, string> = {
    si_nbi: 'Hogares con NBI (Total)',
    hacinamiento: 'Hacinamiento Crítico',
    viv_inconveniente: 'Vivienda Inconveniente',
    cond_sanitarias: 'Condiciones Sanitarias',
    escolaridad: 'NBI Escolaridad',
    capacidad_subsistencia: 'Capacidad de Subsistencia',
  };

  const descripcionesComp: Record<ComponenteNBI, string> = {
    si_nbi:
      'Necesidades Básicas Insatisfechas (NBI). Hogares que cuentan con al menos uno de los indicadores de NBI (Escolaridad, Hacinamiento, Viv. Inconveniente, Cond. Sanitarias o Cap. de Subsistencia).',
    hacinamiento: 'NBI Hacinamiento: hogares que tienen más de tres personas por cuarto.',
    viv_inconveniente:
      'NBI Vivienda Inconveniente: hogares que viven en inquilinato, hotel o pensión, viviendas no destinadas a fines habitacionales, viviendas precarias y otro tipo de vivienda.',
    cond_sanitarias: 'NBI Condiciones sanitarias: hogares que no tienen acceso a baño o letrina.',
    escolaridad: 'NBI Escolaridad: hogares que tienen algún niño en edad escolar (6 a 12 años) que no asiste a la escuela.',
    capacidad_subsistencia:
      'NBI Capacidad de subsistencia: hogares que tienen cuatro o más personas por miembro ocupado y, además, cuyo jefe no haya completado el tercer grado de escolaridad primaria.',
  };

  const territoriosVisibles = useMemo<VisibleNbiTerritory[]>(() => {
    return detalleFiltrado.map((territory) => ({
      ...territory,
      municipio: territory.municipio || territory.nombre || territory.departamento,
      locationKey: territoryKey(territory),
    }));
  }, [detalleFiltrado]);

  // Cálculos dinámicos de las tarjetas KPI superiores según selección territorial y componente
  const totalSeleccionado = detalleFiltrado.reduce((acc, t) => acc + t.total_viviendas, 0);
  const hogaresCompSeleccionado = detalleFiltrado.reduce((acc, t) => acc + (t[selectedComp] || 0), 0);
  const seleccionCompleta = selectedLocations === null || selectedLocations.length === detalleOriginal.length;

  const pctCompProvincia =
    totalSeleccionado > 0
      ? `${((hogaresCompSeleccionado / totalSeleccionado) * 100).toFixed(1).replace('.', ',')} %`
      : '0,0 %';

  const pctCompPais = data?.kpis?.pais?.[selectedComp] || '—';
  const pctCompNea = data?.kpis?.nea?.[selectedComp] || '—';

  // Datos fijos para el gráfico
  const datosGrafico = useMemo(() => {
    return [...territoriosVisibles]
      .sort((a, b) => (Number(b[selectedComp]) || 0) - (Number(a[selectedComp]) || 0))
      .slice(0, 25);
  }, [territoriosVisibles, selectedComp]);

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
          : sortField === 'valor_nbi'
          ? a[selectedComp]
          : Number(a[`pct_${selectedComp}`]);
      const bVal =
        sortField === 'total_viviendas'
          ? b.total_viviendas
          : sortField === 'valor_nbi'
          ? b[selectedComp]
          : Number(b[`pct_${selectedComp}`]);

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [territoriosVisibles, sortField, sortOrder, selectedComp]);

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>NECESIDADES BÁSICAS INSATISFECHAS (NBI)</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 y Comparativas Regionales
          </p>
        </div>
      </div>

      {/* Tarjetas KPI Superiores dinámicas con Tooltips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px', overflow: 'visible' }}>
          <span className="metricLabel" style={{ display: 'flex', alignItems: 'center' }}>
            {seleccionCompleta ? 'Total Hogares Evaluados' : 'Hogares seleccionados'}
            <InfoTooltip text={descripcionesComp.si_nbi} />
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {data ? totalSeleccionado.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {seleccionCompleta ? 'Total Provincial Calculado' : 'Territorios seleccionados'}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #dc2626', overflow: 'visible' }}>
          <span className="metricLabel" style={{ display: 'flex', alignItems: 'center' }}>
            % {labelsComp[selectedComp]} ({seleccionCompleta ? 'Corrientes' : 'Selección'})
            <InfoTooltip text={descripcionesComp[selectedComp]} />
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b91c1c' }}>
            {data ? pctCompProvincia : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {data ? `${hogaresCompSeleccionado.toLocaleString('es-AR')} hogares` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b', overflow: 'visible' }}>
          <span className="metricLabel" style={{ display: 'flex', alignItems: 'center' }}>
            % {labelsComp[selectedComp]} (Región NEA)
            <InfoTooltip text={descripcionesComp[selectedComp]} />
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b45309' }}>
            {pctCompNea}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Región NEA</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb', overflow: 'visible' }}>
          <span className="metricLabel" style={{ display: 'flex', alignItems: 'center' }}>
            % {labelsComp[selectedComp]} (Total País)
            <InfoTooltip text={descripcionesComp[selectedComp]} />
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {pctCompPais}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Nacional</span>
        </div>
      </div>

      {/* Selector de Componente NBI */}
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
          COMPONENTE NBI
          <InfoTooltip text={descripcionesComp[selectedComp]} />
          <span style={{ marginLeft: 4 }}>:</span>
        </span>
        {(
          ['si_nbi', 'hacinamiento', 'viv_inconveniente', 'cond_sanitarias', 'escolaridad', 'capacidad_subsistencia'] as ComponenteNBI[]
        ).map((comp) => (
          <button
            key={comp}
            onClick={() => setSelectedComp(comp)}
            style={{
              border: '1px solid',
              borderColor: selectedComp === comp ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedComp === comp ? '#14203b' : '#f8fafc',
              color: selectedComp === comp ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedComp === comp ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {labelsComp[comp]}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla + Filtro Lateral */}
      <div className="population-layout">
        <div className="card" style={{ margin: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <AlertTriangle className="w-4 h-4 text-emerald-400" />
              <span>{labelsComp[selectedComp]} por municipio</span>
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
                <span>Calculando componentes NBI...</span>
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
                        `${Number(val).toLocaleString('es-AR')} hogares`,
                        labelsComp[selectedComp],
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
                    <Bar dataKey={selectedComp} fill="#b91c1c" radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey={selectedComp}
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
                          <span>Total Hogares</span>
                          {renderSortIcon('total_viviendas')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('valor_nbi')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>{labelsComp[selectedComp]}</span>
                          {renderSortIcon('valor_nbi')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('pct_nbi')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>% Incidencia</span>
                          {renderSortIcon('pct_nbi')}
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
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                          {row[selectedComp].toLocaleString('es-AR')}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {row[`pct_${selectedComp}`]} %
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