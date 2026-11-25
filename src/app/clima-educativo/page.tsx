'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { InfoTooltip } from '@/components/InfoTooltip';
import CorrientesMap from '@/components/CorrientesMap';
import {
  GraduationCap,
  ChevronLeft,
  BarChart2,
  Table as TableIcon,
  Map as MapIcon,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import TerritoryFilter, { territoryKey } from '@/components/TerritoryFilter';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from 'recharts';

type NivelClima = 'muy_bajo' | 'bajo' | 'medio' | 'alto' | 'muy_alto';
type SortField = 'departamento' | 'municipio' | 'total_hogares' | NivelClima;
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

type VisibleClimaTerritory = ClimaTerritory & {
  locationKey: string;
  incidencia: number;
};

type ClimaData = {
  totalHogares: number;
  kpis: {
    pais?: Record<NivelClima, string>;
    nea?: Record<NivelClima, string>;
    pctPais: string;
    pctNea: string;
  };
  detalle: ClimaTerritory[];
};

const NIVELES_CLIMA: { key: NivelClima; label: string; shortLabel: string }[] = [
  { key: 'muy_bajo', label: 'Clima Muy Bajo', shortLabel: 'Muy Bajo' },
  { key: 'bajo', label: 'Clima Bajo', shortLabel: 'Bajo' },
  { key: 'medio', label: 'Clima Medio', shortLabel: 'Medio' },
  { key: 'alto', label: 'Clima Alto', shortLabel: 'Alto' },
  { key: 'muy_alto', label: 'Clima Muy Alto', shortLabel: 'Muy Alto' },
];

const EMPTY_TERRITORIES: ClimaTerritory[] = [];

const normalizeText = (value: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const calcPctNumber = (valor: number, total: number) =>
  total > 0 ? (valor / total) * 100 : 0;

const formatPct = (pct: number) => `${pct.toFixed(1).replace('.', ',')} %`;

export default function ClimaEducativoPage() {
  const [data, setData] = useState<ClimaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClima, setSelectedClima] = useState<NivelClima>('medio');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla' | 'mapa'>('grafico');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);

  // Ordenamiento exclusivo de la tabla
  const [sortField, setSortField] = useState<SortField>('total_hogares');
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
    () =>
      detalleOriginal.filter(
        (territory) =>
          selectedLocations === null || selectedLocations.includes(territoryKey(territory)),
      ),
    [detalleOriginal, selectedLocations],
  );

  const labelsClima: Record<NivelClima, string> = {
    muy_bajo: 'Clima Muy Bajo',
    bajo: 'Clima Bajo',
    medio: 'Clima Medio',
    alto: 'Clima Alto',
    muy_alto: 'Clima Muy Alto',
  };

  const descripcionesClima: Record<NivelClima, string> = {
    muy_bajo:
      'Promedio de años de estudio alcanzados para cada miembro del hogar de 18 años y más. Muy bajo: menor a siete años de máximo nivel de instrucción.',
    bajo:
      'Promedio de años de estudio alcanzados para cada miembro del hogar de 18 años y más. Bajo: entre siete y diez años de máximo nivel de instrucción.',
    medio:
      'Promedio de años de estudio alcanzados para cada miembro del hogar de 18 años y más. Medio: entre once y trece años de máximo nivel de instrucción.',
    alto:
      'Promedio de años de estudio alcanzados para cada miembro del hogar de 18 años y más. Alto: entre catorce y quince años de máximo nivel de instrucción.',
    muy_alto:
      'Promedio de años de estudio alcanzados para cada miembro del hogar de 18 años y más. Muy alto: dieciséis años o más de máximo nivel de instrucción.',
  };

  const territoriosVisibles = useMemo<VisibleClimaTerritory[]>(() => {
    return detalleFiltrado.map((territory) => {
      const total = Number(territory.total_hogares) || 0;
      const val = Number(territory[selectedClima]) || 0;
      return {
        ...territory,
        municipio: territory.municipio || territory.nombre || territory.departamento,
        locationKey: territoryKey(territory),
        incidencia: calcPctNumber(val, total),
      };
    });
  }, [detalleFiltrado, selectedClima]);

  // Cálculos dinámicos conectados al clima seleccionado y al filtro territorial
  const totalSeleccionado = detalleFiltrado.reduce(
    (total, territory) => total + (Number(territory.total_hogares) || 0),
    0,
  );
  const hogaresClimaSeleccionado = detalleFiltrado.reduce(
    (total, territory) => total + (Number(territory[selectedClima]) || 0),
    0,
  );
  const seleccionCompleta =
    selectedLocations === null || selectedLocations.length === detalleOriginal.length;

  const etiquetaSeleccion = useMemo(() => {
    if (seleccionCompleta) return 'Corrientes';
    if (detalleFiltrado.length === 0) return 'Sin selección';
    if (detalleFiltrado.length === 1) {
      return detalleFiltrado[0].municipio || detalleFiltrado[0].nombre || detalleFiltrado[0].departamento;
    }

    const deptosUnicos = Array.from(
      new Set(detalleFiltrado.map((t) => t.departamento || 'Sin departamento')),
    );
    if (deptosUnicos.length === 1) {
      const todosDelDepto = detalleOriginal.filter(
        (t) => (t.departamento || 'Sin departamento') === deptosUnicos[0],
      );
      if (todosDelDepto.length === detalleFiltrado.length) {
        return `Depto. ${deptosUnicos[0]}`;
      }
    }

    return `${detalleFiltrado.length} municipios`;
  }, [seleccionCompleta, detalleFiltrado, detalleOriginal]);

  const pctClimaProvincia =
    totalSeleccionado > 0
      ? `${((hogaresClimaSeleccionado / totalSeleccionado) * 100).toFixed(1).replace('.', ',')} %`
      : '0,0 %';

  const pctClimaPais = data?.kpis?.pais?.[selectedClima] || data?.kpis?.pctPais || '...';
  const pctClimaNea = data?.kpis?.nea?.[selectedClima] || data?.kpis?.pctNea || '...';

  // Todos los municipios ordenados de mayor a menor por % de incidencia
  const datosGrafico = useMemo(
    () => [...territoriosVisibles].sort((a, b) => b.incidencia - a.incidencia),
    [territoriosVisibles],
  );

  const chartHeight = Math.max(500, datosGrafico.length * 28 + 30);

  // Totales de las 5 categorías para el pie fijo de la tabla
  const totalesTabla = useMemo(() => {
    const hogares = territoriosVisibles.reduce((acc, r) => acc + (Number(r.total_hogares) || 0), 0);
    const muyBajo = territoriosVisibles.reduce((acc, r) => acc + (Number(r.muy_bajo) || 0), 0);
    const bajo = territoriosVisibles.reduce((acc, r) => acc + (Number(r.bajo) || 0), 0);
    const medio = territoriosVisibles.reduce((acc, r) => acc + (Number(r.medio) || 0), 0);
    const alto = territoriosVisibles.reduce((acc, r) => acc + (Number(r.alto) || 0), 0);
    const muyAlto = territoriosVisibles.reduce((acc, r) => acc + (Number(r.muy_alto) || 0), 0);
    const pct = (v: number) => (hogares > 0 ? ((v / hogares) * 100).toFixed(1).replace('.', ',') : '0,0');
    return {
      hogares,
      muyBajo,
      bajo,
      medio,
      alto,
      muyAlto,
      pctMuyBajo: pct(muyBajo),
      pctBajo: pct(bajo),
      pctMedio: pct(medio),
      pctAlto: pct(alto),
      pctMuyAlto: pct(muyAlto),
    };
  }, [territoriosVisibles]);

  // Datos consolidados por departamento para el Mapa
  const datosMapa = useMemo(() => {
    const deptosActivos = new Set(
      detalleFiltrado.map((t) => t.departamento || 'Sin departamento'),
    );
    const deptosMap = new Map<string, { hogares: number; count: number }>();

    for (const t of detalleOriginal) {
      const depto = t.departamento || 'Sin departamento';
      const curr = deptosMap.get(depto) || { hogares: 0, count: 0 };
      curr.hogares += Number(t.total_hogares) || 0;
      curr.count += Number(t[selectedClima]) || 0;
      deptosMap.set(depto, curr);
    }

    return Array.from(deptosMap.entries()).map(([depto, vals]) => {
      const pct = vals.hogares > 0 ? (vals.count / vals.hogares) * 100 : 0;
      return {
        territoryName: depto,
        value: pct,
        labelFormatted: `${pct.toFixed(1).replace('.', ',')} %`,
        subtitle: `${vals.count.toLocaleString('es-AR')} de ${vals.hogares.toLocaleString('es-AR')} hogares`,
        isSelected: deptosActivos.has(depto),
      };
    });
  }, [detalleOriginal, detalleFiltrado, selectedClima]);

  const handleSelectTerritoryOnMap = (deptoName: string) => {
    const target = normalizeText(deptoName);
    const keysDelDepto = detalleOriginal
      .filter((t) => normalizeText(t.departamento || '') === target)
      .map(territoryKey);

    if (!keysDelDepto.length) return;

    setSelectedLocations((prev) => {
      const current = prev ?? detalleOriginal.map(territoryKey);
      const soloEsteDeptoSeleccionado =
        current.length === keysDelDepto.length &&
        keysDelDepto.every((k) => current.includes(k));

      return soloEsteDeptoSeleccionado ? null : keysDelDepto;
    });
  };

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

      if (sortField === 'total_hogares') {
        const aVal = Number(a.total_hogares) || 0;
        const bVal = Number(b.total_hogares) || 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Ordena por % de incidencia de la columna de clima seleccionada
      const aVal = calcPctNumber(Number(a[sortField]) || 0, Number(a.total_hogares) || 0);
      const bVal = calcPctNumber(Number(b[sortField]) || 0, Number(b.total_hogares) || 0);
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
          <h1>CLIMA EDUCATIVO EN EL HOGAR</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 y Comparativas Regionales
          </p>
        </div>
      </div>

      {/* KPIs Dinámicos según Nivel de Clima y Selección Territorial */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#14203b', lineHeight: 1.2 }}>
              {etiquetaSeleccion}
            </span>
            <InfoTooltip text="Total de hogares particulares censados en la jurisdicción analizada." />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Total Hogares Relevados
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4 }}>
            {data ? totalSeleccionado.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {seleccionCompleta ? 'Total Provincia de Corrientes' : 'Hogares en territorios seleccionados'}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#047857', lineHeight: 1.2 }}>
              {etiquetaSeleccion}
            </span>
            <InfoTooltip text={descripcionesClima[selectedClima]} />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            % {labelsClima[selectedClima]}
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#047857' }}>
            {data ? pctClimaProvincia : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {data ? `${hogaresClimaSeleccionado.toLocaleString('es-AR')} hogares` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #3b82f6', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.2 }}>
              Total País
            </span>
            <InfoTooltip text={descripcionesClima[selectedClima]} />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            % {labelsClima[selectedClima]}
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#1d4ed8' }}>
            {pctClimaPais}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>República Argentina</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b45309', lineHeight: 1.2 }}>
              Región NEA
            </span>
            <InfoTooltip text={descripcionesClima[selectedClima]} />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            % {labelsClima[selectedClima]}
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#b45309' }}>
            {pctClimaNea}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Nordeste Argentino</span>
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
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14203b', marginRight: 8, display: 'inline-flex', alignItems: 'center' }}>
          NIVEL DE CLIMA EDUCATIVO
          <InfoTooltip text={descripcionesClima[selectedClima]} />
          <span style={{ marginLeft: 4 }}>:</span>
        </span>
        {NIVELES_CLIMA.map((nivel) => (
          <button
            key={nivel.key}
            onClick={() => {
              setSelectedClima(nivel.key);
              if (viewMode === 'tabla') {
                setSortField(nivel.key);
                setSortOrder('desc');
              }
            }}
            style={{
              border: '1px solid',
              borderColor: selectedClima === nivel.key ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedClima === nivel.key ? '#14203b' : '#f8fafc',
              color: selectedClima === nivel.key ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedClima === nivel.key ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {nivel.label}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla / Mapa */}
      <div className="population-layout">
        <div className="card" style={{ margin: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>
                {viewMode === 'tabla'
                  ? 'Distribución completa por clima educativo en el hogar por municipio'
                  : `Incidencia de ${labelsClima[selectedClima]} (%) por ${viewMode === 'mapa' ? 'departamento' : 'municipio'}`}
              </span>
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
              <button
                onClick={() => setViewMode('mapa')}
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
                  backgroundColor: viewMode === 'mapa' ? '#10b981' : 'transparent',
                  color: '#ffffff',
                }}
              >
                <MapIcon className="w-3.5 h-3.5" />
                Mapa
              </button>
            </div>
          </div>

          <div className="cardBody" style={{ minHeight: 520, padding: 18 }}>
            {loading ? (
              <div style={{ display: 'flex', height: 450, alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b' }}>
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span>Calculando indicadores de clima educativo...</span>
              </div>
            ) : viewMode === 'grafico' ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                {/* Contenedor principal con etiqueta fija del Eje Y + área scrolleable */}
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  {/* Título fijo del Eje Y */}
                  <div
                    style={{
                      width: 32,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRight: '1px solid #f1f5f9',
                    }}
                  >
                    <span
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        color: '#64748b',
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Municipio
                    </span>
                  </div>

                  {/* Lista scrolleable de barras */}
                  <div
                    style={{
                      flex: 1,
                      maxHeight: '500px',
                      overflowY: 'scroll',
                      overflowX: 'hidden',
                    }}
                  >
                    <div style={{ width: '100%', height: chartHeight }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={datosGrafico}
                          margin={{ top: 14, right: 65, left: 6, bottom: 8 }}
                        >
                          <XAxis type="number" domain={[0, 100]} hide />
                          <YAxis
                            type="category"
                            dataKey="municipio"
                            width={185}
                            interval={0}
                            stroke="#475569"
                            fontSize={10.5}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value: any, _name: any, props: any) => {
                              const hogares = Number(props?.payload?.[selectedClima]) || 0;
                              return [
                                `${formatPct(Number(value))} (${hogares.toLocaleString('es-AR')} hogares)`,
                                labelsClima[selectedClima],
                              ];
                            }}
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
                          <Bar dataKey="incidencia" fill="#047857" radius={[0, 4, 4, 0]} barSize={18}>
                            <LabelList
                              dataKey="incidencia"
                              position="right"
                              formatter={(val: any) => formatPct(Number(val))}
                              style={{ fill: '#334155', fontSize: 10.5, fontWeight: 600 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Pie fijo del Eje X (32px eje Y + 6px margin + 185px YAxis = 223px izq, 65px + 17px scrollbar = 82px der) */}
                <div
                  style={{
                    borderTop: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    paddingTop: 6,
                    paddingBottom: 10,
                    paddingLeft: 223,
                    paddingRight: 82,
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                  }}
                >
                  <div style={{ position: 'relative', height: 22, borderTop: '1px solid #94a3b8' }}>
                    {[0, 25, 50, 75, 100].map((tick) => (
                      <div
                        key={tick}
                        style={{
                          position: 'absolute',
                          left: `${tick}%`,
                          top: 0,
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ width: 1, height: 5, backgroundColor: '#94a3b8' }} />
                        <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{tick}%</span>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                      marginTop: 6,
                    }}
                  >
                    Porcentaje de hogares con {labelsClima[selectedClima]} (%)
                  </div>
                </div>
              </div>
            ) : viewMode === 'mapa' ? (
              <CorrientesMap
                data={datosMapa}
                metricLabel={`% ${labelsClima[selectedClima]}`}
                colorScheme="emerald"
                geoJsonUrl="/corrientes-departamentos.geojson"
                onSelectTerritory={handleSelectTerritoryOnMap}
              />
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
                <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse', fontSize: '0.78rem' }}>
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
                        onClick={() => handleSort('total_hogares')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>Total Hogares</span>
                          {renderSortIcon('total_hogares')}
                        </div>
                      </th>
                      {NIVELES_CLIMA.map((nivel) => (
                        <th
                          key={nivel.key}
                          onClick={() => handleSort(nivel.key)}
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            backgroundColor: selectedClima === nivel.key ? '#f0fdf4' : '#ffffff',
                            color: selectedClima === nivel.key ? '#047857' : '#475569',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                            <span>{nivel.shortLabel}</span>
                            {renderSortIcon(nivel.key)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detalleTablaOrdenado.map((row, idx: number) => {
                      const total = Number(row.total_hogares) || 0;
                      return (
                        <tr
                          key={row.locationKey || idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          }}
                        >
                          <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: 500 }}>{row.departamento}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#14203b' }}>{row.municipio}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#14203b' }}>
                            {total.toLocaleString('es-AR')}
                          </td>
                          {NIVELES_CLIMA.map((nivel) => {
                            const count = Number(row[nivel.key]) || 0;
                            const pct = calcPctNumber(count, total);
                            return (
                              <td
                                key={nivel.key}
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'right',
                                  backgroundColor:
                                    selectedClima === nivel.key ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                                }}
                              >
                                <span style={{ fontWeight: 700, color: '#047857' }}>
                                  {formatPct(pct)}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 5 }}>
                                  ({count.toLocaleString('es-AR')})
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        position: 'sticky',
                        bottom: 0,
                        backgroundColor: '#eaf2f8',
                        color: '#14203b',
                        fontWeight: 800,
                        borderTop: '2px solid #cbd5e1',
                      }}
                    >
                      <td colSpan={2} style={{ padding: '10px 12px' }}>
                        Total seleccionado
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.hogares.toLocaleString('es-AR')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctMuyBajo} % ({totalesTabla.muyBajo.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctBajo} % ({totalesTabla.bajo.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctMedio} % ({totalesTabla.medio.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctAlto} % ({totalesTabla.alto.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctMuyAlto} % ({totalesTabla.muyAlto.toLocaleString('es-AR')})
                      </td>
                    </tr>
                  </tfoot>
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