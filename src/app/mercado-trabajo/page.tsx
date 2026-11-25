'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { InfoTooltip } from '@/components/InfoTooltip';
import TerritoryFilter, { territoryKey } from '@/components/TerritoryFilter';
import CorrientesMap from '@/components/CorrientesMap';
import { 
  Briefcase, 
  ChevronLeft, 
  BarChart2, 
  Table as TableIcon, 
  Map as MapIcon,
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

type IndicadorTrabajo = 'actividad' | 'empleo' | 'desocupacion';
type SortField = 'departamento' | 'municipio' | 'actividad' | 'empleo' | 'desocupacion' | 'empleado_obrero' | 'cuenta_propia';
type SortOrder = 'asc' | 'desc';

type TrabajoTerritory = {
  departamento: string;
  municipio: string;
  nombre: string;
  cantidad_registros: number;
  poblacion: number;
  actividad: number;
  empleo: number;
  desocupacion: number;
  servicio_domestico: number;
  empleado_obrero: number;
  cuenta_propia: number;
  patron_empleador: number;
  trabajador_familiar: number;
};

type VisibleTrabajoTerritory = TrabajoTerritory & { locationKey: string };
type MercadoTrabajoData = {
  totalesProvincia: Record<IndicadorTrabajo, string>;
  detalle: TrabajoTerritory[];
};

const EMPTY_TERRITORIES: TrabajoTerritory[] = [];

export default function MercadoTrabajoPage() {
  const [data, setData] = useState<MercadoTrabajoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndicador, setSelectedIndicador] = useState<IndicadorTrabajo>('actividad');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla' | 'mapa'>('grafico');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);

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

  const detalleOriginal = useMemo<TrabajoTerritory[]>(() => data?.detalle ?? EMPTY_TERRITORIES, [data]);
  const detalleFiltrado = useMemo(
    () =>
      detalleOriginal.filter(
        (territory) => selectedLocations === null || selectedLocations.includes(territoryKey(territory)),
      ),
    [detalleOriginal, selectedLocations],
  );

  const totales = data?.totalesProvincia;

  const labelsIndicador: Record<IndicadorTrabajo, string> = {
    actividad: 'Tasa de Actividad (%)',
    empleo: 'Tasa de Empleo (%)',
    desocupacion: 'Tasa de Desocupación (%)',
  };

  const territoriosVisibles = useMemo<VisibleTrabajoTerritory[]>(() => {
    return detalleFiltrado.map((t) => ({
      ...t,
      locationKey: territoryKey(t),
    }));
  }, [detalleFiltrado]);

  // Datos consolidados por departamento para el Mapa
  const datosMapa = useMemo(() => {
    const deptosActivos = new Set(detalleFiltrado.map((t) => t.departamento));
    const deptosMap = new Map<
      string,
      { pob: number; registros: number; actividad: number; empleo: number; desocupacion: number }
    >();

    for (const t of detalleOriginal) {
      const curr = deptosMap.get(t.departamento) || {
        pob: 0,
        registros: 0,
        actividad: 0,
        empleo: 0,
        desocupacion: 0,
      };
      const registros = Number(t.cantidad_registros) || 0;
      curr.pob += Number(t.poblacion) || 0;
      curr.registros += registros;
      curr.actividad += (Number(t.actividad) || 0) * registros;
      curr.empleo += (Number(t.empleo) || 0) * registros;
      curr.desocupacion += (Number(t.desocupacion) || 0) * registros;
      deptosMap.set(t.departamento, curr);
    }

    return Array.from(deptosMap.entries()).map(([depto, vals]) => {
      const val =
        selectedIndicador === 'actividad'
          ? vals.registros > 0 ? vals.actividad / vals.registros : 0
          : selectedIndicador === 'empleo'
          ? vals.registros > 0 ? vals.empleo / vals.registros : 0
          : vals.registros > 0 ? vals.desocupacion / vals.registros : 0;

      return {
        territoryName: depto,
        value: val,
        labelFormatted: `${val.toFixed(1).replace('.', ',')} %`,
        subtitle: `Población (14+): ${vals.pob.toLocaleString('es-AR')} hab.`,
        isSelected: deptosActivos.has(depto),
      };
    });
  }, [detalleOriginal, detalleFiltrado, selectedIndicador]);

  // Permite hacer clic en un departamento del mapa para aislarlo o restaurar todos en el filtro lateral
  const handleSelectTerritoryOnMap = (deptoName: string) => {
    const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const target = norm(deptoName);

    const keysDelDepto = detalleOriginal
      .filter((t) => norm(t.departamento) === target)
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

  // KPIs superiores dinámicos según filtro territorial
  const seleccionCompleta = selectedLocations === null || selectedLocations.length === detalleOriginal.length;

  const etiquetaSeleccion = useMemo(() => {
    if (seleccionCompleta) return 'Corrientes';
    if (detalleFiltrado.length === 0) return 'Sin selección';
    if (detalleFiltrado.length === 1) {
      return detalleFiltrado[0].municipio || detalleFiltrado[0].departamento;
    }

    const deptosUnicos = Array.from(new Set(detalleFiltrado.map((t) => t.departamento)));
    if (deptosUnicos.length === 1) {
      const todosDelDepto = detalleOriginal.filter((t) => t.departamento === deptosUnicos[0]);
      if (todosDelDepto.length === detalleFiltrado.length) {
        return `Depto. ${deptosUnicos[0]}`;
      }
    }

    return `${detalleFiltrado.length} municipios`;
  }, [seleccionCompleta, detalleFiltrado, detalleOriginal]);

  const kpisMostrados = useMemo(() => {
    if (seleccionCompleta || detalleFiltrado.length === 0) {
      return {
        actividad: totales?.actividad || '...',
        empleo: totales?.empleo || '...',
        desocupacion: totales?.desocupacion || '...',
        subtitulo: 'Total Provincia de Corrientes',
      };
    }

    const registrosTotal = detalleFiltrado.reduce(
      (acc, d) => acc + (Number(d.cantidad_registros) || 0),
      0,
    );

    if (registrosTotal === 0) {
      return {
        actividad: '—',
        empleo: '—',
        desocupacion: '—',
        subtitulo: 'Territorios seleccionados',
      };
    }

    const pondAct = detalleFiltrado.reduce(
      (acc, d) => acc + d.actividad * d.cantidad_registros,
      0,
    ) / registrosTotal;
    const pondEmp = detalleFiltrado.reduce(
      (acc, d) => acc + d.empleo * d.cantidad_registros,
      0,
    ) / registrosTotal;
    const pondDes = detalleFiltrado.reduce(
      (acc, d) => acc + d.desocupacion * d.cantidad_registros,
      0,
    ) / registrosTotal;

    return {
      actividad: `${pondAct.toFixed(1).replace('.', ',')} %`,
      empleo: `${pondEmp.toFixed(1).replace('.', ',')} %`,
      desocupacion: `${pondDes.toFixed(1).replace('.', ',')} %`,
      subtitulo: `Selección (${detalleFiltrado.length} ${detalleFiltrado.length === 1 ? 'municipio' : 'municipios'})`,
    };
  }, [seleccionCompleta, detalleFiltrado, totales]);

  // Datos para el gráfico: ordenados de mayor a menor por el indicador seleccionado
  const datosGrafico = useMemo(() => {
    if (!territoriosVisibles.length) return [];
    return [...territoriosVisibles].sort(
      (a, b) => (Number(b[selectedIndicador]) || 0) - (Number(a[selectedIndicador]) || 0)
    );
  }, [territoriosVisibles, selectedIndicador]);

  const chartHeight = Math.max(520, datosGrafico.length * 28 + 60);

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

  const tablaOrdenada = useMemo(() => {
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

  const getMapColorScheme = (ind: IndicadorTrabajo): 'emerald' | 'blue' | 'red' => {
    switch (ind) {
      case 'actividad':
        return 'emerald';
      case 'empleo':
        return 'blue';
      case 'desocupacion':
        return 'red';
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
            Provincia de Corrientes — Censo 2022 por Municipios y Departamentos
          </p>
        </div>
      </div>

      {/* Tarjetas KPI Superiores dinámicas con Tooltips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#047857', lineHeight: 1.2 }}>
              {etiquetaSeleccion}
            </span>
            <InfoTooltip text="Personas que poseen una ocupación, o al menos, lo están buscando activamente." />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Tasa de Actividad
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#047857' }}>
            {kpisMostrados.actividad}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{kpisMostrados.subtitulo}</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.2 }}>
              {etiquetaSeleccion}
            </span>
            <InfoTooltip text="Es el conjunto de personas que tienen al menos una ocupación, es decir que en la semana de referencia han trabajado al menos una hora." />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Tasa de Empleo
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#1d4ed8' }}>
            {kpisMostrados.empleo}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{kpisMostrados.subtitulo}</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #dc2626', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b91c1c', lineHeight: 1.2 }}>
              {etiquetaSeleccion}
            </span>
            <InfoTooltip text="Personas que, no teniendo ocupación, están buscando activamente trabajo y están disponibles para trabajar." />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Tasa de Desocupación
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#b91c1c' }}>
            {kpisMostrados.desocupacion}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{kpisMostrados.subtitulo}</span>
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
          flexWrap: 'wrap',
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

      {/* Gráfico / Tabla / Mapa + Filtro Lateral */}
      <div className="population-layout">
        <div className="card" style={{ margin: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>
                {labelsIndicador[selectedIndicador]} por {viewMode === 'mapa' ? 'Departamento' : 'Municipio'}
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
                <span>Calculando mercado de trabajo...</span>
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
                            width={175}
                            interval={0}
                            stroke="#475569"
                            fontSize={11}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(val) => [
                              `${Number(val).toFixed(1).replace('.', ',')} %`,
                              labelsIndicador[selectedIndicador].replace(' (%)', ''),
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
                            dataKey={selectedIndicador}
                            fill={getColorIndicador(selectedIndicador)}
                            radius={[0, 4, 4, 0]}
                            barSize={18}
                          >
                            <LabelList
                              dataKey={selectedIndicador}
                              position="right"
                              formatter={(val) => `${Number(val).toFixed(1).replace('.', ',')} %`}
                              style={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Pie fijo del Eje X con los mismos offsets exactos (32px eje Y + 6px margin + 175px YAxis = 213px a la izq, y 65px + 17px scrollbar = 82px a la der) */}
                <div
                  style={{
                    borderTop: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    paddingTop: 6,
                    paddingBottom: 10,
                    paddingLeft: 213,
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
                    {labelsIndicador[selectedIndicador]}
                  </div>
                </div>
              </div>
            ) : viewMode === 'mapa' ? (
              <CorrientesMap
                data={datosMapa}
                metricLabel={labelsIndicador[selectedIndicador].replace(' (%)', '')}
                colorScheme={getMapColorScheme(selectedIndicador)}
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
                    {tablaOrdenada.map((row, idx: number) => (
                      <tr
                        key={row.locationKey || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: '#64748b' }}>
                          {row.departamento}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                          {row.municipio}
                        </td>
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

        <TerritoryFilter
          territories={detalleOriginal}
          selectedKeys={selectedLocations}
          onSelectionChange={setSelectedLocations}
        />
      </div>
    </div>
  );
}