'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import TerritoryFilter, { territoryKey } from '@/components/TerritoryFilter';
import CorrientesMap from '@/components/CorrientesMap';
import {
  Droplets,
  ChevronLeft,
  BarChart2,
  Table as TableIcon,
  Map as MapIcon,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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

type TipoAgua = 'red_publica' | 'bomba_motor' | 'pozo_sin_bomba' | 'cisterna_acequia' | 'otra';
type SortField = 'departamento' | 'municipio' | 'total_viviendas' | TipoAgua;
type SortOrder = 'asc' | 'desc';

type AguaTerritory = {
  departamento: string;
  municipio: string;
  nombre: string;
  total_viviendas: number;
  red_publica: number;
  bomba_motor: number;
  pozo_sin_bomba: number;
  cisterna_acequia: number;
  otra: number;
  pct_red_publica: string;
  pct_bomba_motor: string;
  pct_pozo_sin_bomba: string;
  pct_cisterna_acequia: string;
  pct_otra: string;
};

type VisibleAguaTerritory = AguaTerritory & {
  locationKey: string;
  incidencia: number;
};

const TIPOS_AGUA: { key: TipoAgua; label: string; shortLabel: string }[] = [
  { key: 'red_publica', label: 'Red Pública (Agua Corriente)', shortLabel: 'Red Pública' },
  { key: 'bomba_motor', label: 'Bomba a Motor o Manual', shortLabel: 'Bomba Motor / Manual' },
  { key: 'pozo_sin_bomba', label: 'Pozo sin Bomba', shortLabel: 'Pozo sin Bomba' },
  { key: 'cisterna_acequia', label: 'Cisterna, Canal o Acequia', shortLabel: 'Cisterna / Acequia' },
  { key: 'otra', label: 'Otra Procedencia', shortLabel: 'Otra Procedencia' },
];

const EMPTY_TERRITORIES: AguaTerritory[] = [];

const normalizeText = (value: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const calcPctNumber = (valor: number, total: number) =>
  total > 0 ? (valor / total) * 100 : 0;

const formatPct = (pct: number) => `${pct.toFixed(1).replace('.', ',')} %`;

export default function AguaPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<TipoAgua>('red_publica');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla' | 'mapa'>('grafico');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);

  // Estados de ordenamiento exclusivos de la tabla
  const [sortField, setSortField] = useState<SortField>('total_viviendas');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/agua'));
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

  const detalleOriginal = useMemo<AguaTerritory[]>(() => data?.detalle ?? EMPTY_TERRITORIES, [data]);
  const detalleFiltrado = useMemo(
    () =>
      detalleOriginal.filter(
        (territory) =>
          selectedLocations === null || selectedLocations.includes(territoryKey(territory)),
      ),
    [detalleOriginal, selectedLocations],
  );

  const labelsAgua: Record<TipoAgua, string> = {
    red_publica: 'Red Pública (Agua Corriente)',
    bomba_motor: 'Bomba a Motor o Manual',
    pozo_sin_bomba: 'Pozo sin Bomba',
    cisterna_acequia: 'Cisterna, Canal o Acequia',
    otra: 'Otra Procedencia',
  };

  const territoriosVisibles = useMemo<VisibleAguaTerritory[]>(() => {
    return detalleFiltrado.map((territory) => {
      const total = Number(territory.total_viviendas) || 0;
      const val = Number(territory[selectedTipo]) || 0;
      return {
        ...territory,
        municipio: territory.municipio || territory.nombre || territory.departamento,
        locationKey: territoryKey(territory),
        incidencia: calcPctNumber(val, total),
      };
    });
  }, [detalleFiltrado, selectedTipo]);

  // Datos consolidados por departamento para el Mapa (% de incidencia de la procedencia elegida)
  const datosMapa = useMemo(() => {
    const deptosActivos = new Set(detalleFiltrado.map((t) => t.departamento));
    const deptosMap = new Map<string, { total: number; tipoVal: number }>();

    for (const t of detalleOriginal) {
      const curr = deptosMap.get(t.departamento) || { total: 0, tipoVal: 0 };
      curr.total += Number(t.total_viviendas) || 0;
      curr.tipoVal += Number(t[selectedTipo]) || 0;
      deptosMap.set(t.departamento, curr);
    }

    return Array.from(deptosMap.entries()).map(([depto, vals]) => {
      const pct = vals.total > 0 ? (vals.tipoVal / vals.total) * 100 : 0;
      return {
        territoryName: depto,
        value: pct,
        labelFormatted: `${pct.toFixed(1).replace('.', ',')} %`,
        subtitle: `${vals.tipoVal.toLocaleString('es-AR')} de ${vals.total.toLocaleString('es-AR')} viviendas`,
        isSelected: deptosActivos.has(depto),
      };
    });
  }, [detalleOriginal, detalleFiltrado, selectedTipo]);

  // Clic en un departamento del mapa para aislarlo o restaurar toda la selección
  const handleSelectTerritoryOnMap = (deptoName: string) => {
    const target = normalizeText(deptoName);
    const keysDelDepto = detalleOriginal
      .filter((t) => normalizeText(t.departamento) === target)
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

  // Cálculos dinámicos de las 4 tarjetas KPI superiores según selección territorial
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

  const kpisDinamicos = useMemo(() => {
    const totalViviendas = detalleFiltrado.reduce((acc, t) => acc + (Number(t.total_viviendas) || 0), 0);
    const sumRed = detalleFiltrado.reduce((acc, t) => acc + (Number(t.red_publica) || 0), 0);
    const sumMotor = detalleFiltrado.reduce((acc, t) => acc + (Number(t.bomba_motor) || 0), 0);
    const sumPozo = detalleFiltrado.reduce((acc, t) => acc + (Number(t.pozo_sin_bomba) || 0), 0);

    const fmtPct = (v: number) =>
      totalViviendas > 0 ? `${((v / totalViviendas) * 100).toFixed(1).replace('.', ',')} %` : '0,0 %';

    return {
      totalViviendas,
      sumRedPublica: sumRed,
      sumBombaMotor: sumMotor,
      sumPozo,
      pctRedPublica: fmtPct(sumRed),
      pctBombaMotor: fmtPct(sumMotor),
      pctPozo: fmtPct(sumPozo),
    };
  }, [detalleFiltrado]);

  // Todos los municipios ordenados de mayor a menor por % de incidencia
  const datosGrafico = useMemo(() => {
    if (!territoriosVisibles.length) return [];
    return [...territoriosVisibles].sort((a, b) => b.incidencia - a.incidencia);
  }, [territoriosVisibles]);

  const chartHeight = Math.max(500, datosGrafico.length * 28 + 30);

  // Escala porcentual dinámica para que tanto Red Pública (100%) como Pozo/Cisterna aprovechen bien el ancho
  const { xMax, xTicks } = useMemo(() => {
    const maxVal = datosGrafico.reduce(
      (max, item) => Math.max(max, Number(item.incidencia) || 0),
      0,
    );
    if (maxVal === 0) return { xMax: 100, xTicks: [0, 25, 50, 75, 100] };

    const targetMax = Math.min(100, maxVal * 1.15);
    const rawStep = targetMax / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;

    const niceFraction =
      normalized <= 1 ? 1 :
      normalized <= 1.25 ? 1.25 :
      normalized <= 1.5 ? 1.5 :
      normalized <= 2 ? 2 :
      normalized <= 2.5 ? 2.5 :
      normalized <= 3 ? 3 :
      normalized <= 4 ? 4 :
      normalized <= 5 ? 5 : 10;

    const niceStep = niceFraction * magnitude;
    const top = Math.min(100, niceStep * 4);
    const step = top / 4;

    return {
      xMax: top,
      xTicks: [0, step, step * 2, step * 3, top],
    };
  }, [datosGrafico]);

  // Totales de las 5 procedencias para el pie fijo de la tabla
  const totalesTabla = useMemo(() => {
    const viviendas = territoriosVisibles.reduce(
      (acc, r) => acc + (Number(r.total_viviendas) || 0),
      0,
    );
    const sum = (key: TipoAgua) =>
      territoriosVisibles.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    const pct = (v: number) =>
      viviendas > 0 ? ((v / viviendas) * 100).toFixed(1).replace('.', ',') : '0,0';

    const red = sum('red_publica');
    const motor = sum('bomba_motor');
    const pozo = sum('pozo_sin_bomba');
    const cisterna = sum('cisterna_acequia');
    const otra = sum('otra');

    return {
      viviendas,
      red,
      motor,
      pozo,
      cisterna,
      otra,
      pctRed: pct(red),
      pctMotor: pct(motor),
      pctPozo: pct(pozo),
      pctCisterna: pct(cisterna),
      pctOtra: pct(otra),
    };
  }, [territoriosVisibles]);

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

      if (sortField === 'total_viviendas') {
        const aVal = Number(a.total_viviendas) || 0;
        const bVal = Number(b.total_viviendas) || 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aVal = calcPctNumber(Number(a[sortField]) || 0, Number(a.total_viviendas) || 0);
      const bVal = calcPctNumber(Number(b[sortField]) || 0, Number(b.total_viviendas) || 0);
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [territoriosVisibles, sortField, sortOrder]);

  const getColorAgua = (tipo: TipoAgua) => {
    switch (tipo) {
      case 'red_publica':
        return '#047857';
      case 'bomba_motor':
        return '#2563eb';
      case 'pozo_sin_bomba':
        return '#d97706';
      case 'cisterna_acequia':
        return '#0284c7';
      case 'otra':
        return '#64748b';
    }
  };

  const getMapColorScheme = (tipo: TipoAgua): 'emerald' | 'blue' | 'amber' => {
    switch (tipo) {
      case 'red_publica':
        return 'emerald';
      case 'bomba_motor':
        return 'blue';
      case 'pozo_sin_bomba':
        return 'amber';
      case 'cisterna_acequia':
        return 'blue';
      case 'otra':
        return 'amber';
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
          <h1>AGUA PARA BEBER O COCINAR EN VIVIENDAS PARTICULARES</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022
          </p>
        </div>
      </div>

      {/* Tarjetas KPI conectadas dinámicamente al filtro territorial */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#14203b', lineHeight: 1.2 }}>
            {etiquetaSeleccion}
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Total Viviendas Evaluadas
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4 }}>
            {data ? kpisDinamicos.totalViviendas.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {seleccionCompleta ? 'Total Provincia de Corrientes' : 'Viviendas en territorios seleccionados'}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#047857', lineHeight: 1.2 }}>
            {etiquetaSeleccion}
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Por Red Pública
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#047857' }}>
            {data ? kpisDinamicos.pctRedPublica : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {data ? `${kpisDinamicos.sumRedPublica.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.2 }}>
            {etiquetaSeleccion}
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Bomba a Motor o Manual
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#1d4ed8' }}>
            {data ? kpisDinamicos.pctBombaMotor : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {data ? `${kpisDinamicos.sumBombaMotor.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #d97706' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b45309', lineHeight: 1.2 }}>
            {etiquetaSeleccion}
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Pozo sin Bomba
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#b45309' }}>
            {data ? kpisDinamicos.pctPozo : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {data ? `${kpisDinamicos.sumPozo.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>
      </div>

      {/* Selector de Procedencia de Agua */}
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
          PROCEDENCIA DEL AGUA:
        </span>
        {TIPOS_AGUA.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setSelectedTipo(t.key);
              if (viewMode === 'tabla') {
                setSortField(t.key);
                setSortOrder('desc');
              }
            }}
            style={{
              border: '1px solid',
              borderColor: selectedTipo === t.key ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedTipo === t.key ? '#14203b' : '#f8fafc',
              color: selectedTipo === t.key ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedTipo === t.key ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {t.shortLabel}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla / Mapa + Filtro Lateral */}
      <div className="population-layout">
        <div className="card" style={{ margin: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <Droplets className="w-4 h-4 text-emerald-400" />
              <span>
                {viewMode === 'tabla'
                  ? 'Distribución completa de viviendas por procedencia del agua y municipio'
                  : `Incidencia de ${labelsAgua[selectedTipo]} (%) por ${viewMode === 'mapa' ? 'departamento' : 'municipio'}`}
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
                <span>Calculando procedencia de agua...</span>
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
                          <XAxis type="number" domain={[0, xMax]} hide />
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
                            formatter={(val: any, _name: any, props: any) => {
                              const viviendas = Number(props?.payload?.[selectedTipo]) || 0;
                              return [
                                `${formatPct(Number(val))} (${viviendas.toLocaleString('es-AR')} viviendas)`,
                                labelsAgua[selectedTipo],
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
                          <Bar
                            dataKey="incidencia"
                            fill={getColorAgua(selectedTipo)}
                            radius={[0, 4, 4, 0]}
                            barSize={18}
                          >
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
                    {xTicks.map((tick) => {
                      const pct = xMax > 0 ? (tick / xMax) * 100 : 0;
                      const label =
                        xMax <= 15
                          ? `${Number(tick).toFixed(1).replace('.', ',')}%`
                          : `${Math.round(tick)}%`;
                      return (
                        <div
                          key={tick}
                          style={{
                            position: 'absolute',
                            left: `${pct}%`,
                            top: 0,
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ width: 1, height: 5, backgroundColor: '#94a3b8' }} />
                          <span style={{ fontSize: 11, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap' }}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
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
                    Porcentaje de viviendas con {labelsAgua[selectedTipo]} (%)
                  </div>
                </div>
              </div>
            ) : viewMode === 'mapa' ? (
              <CorrientesMap
                data={datosMapa}
                metricLabel={`% ${labelsAgua[selectedTipo].split(' (')[0]}`}
                colorScheme={getMapColorScheme(selectedTipo)}
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
                <table style={{ width: '100%', minWidth: 1020, borderCollapse: 'collapse', fontSize: '0.78rem' }}>
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
                      {TIPOS_AGUA.map((tipo) => (
                        <th
                          key={tipo.key}
                          onClick={() => handleSort(tipo.key)}
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            backgroundColor: selectedTipo === tipo.key ? '#f0fdf4' : '#ffffff',
                            color: selectedTipo === tipo.key ? getColorAgua(tipo.key) : '#475569',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                            <span>{tipo.shortLabel}</span>
                            {renderSortIcon(tipo.key)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detalleTablaOrdenado.map((row, idx: number) => {
                      const total = Number(row.total_viviendas) || 0;
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
                          {TIPOS_AGUA.map((tipo) => {
                            const count = Number(row[tipo.key]) || 0;
                            const pct = calcPctNumber(count, total);
                            return (
                              <td
                                key={tipo.key}
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'right',
                                  backgroundColor:
                                    selectedTipo === tipo.key ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                                }}
                              >
                                <span style={{ fontWeight: 700, color: getColorAgua(tipo.key) }}>
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
                        {totalesTabla.viviendas.toLocaleString('es-AR')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctRed} % ({totalesTabla.red.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctMotor} % ({totalesTabla.motor.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctPozo} % ({totalesTabla.pozo.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctCisterna} % ({totalesTabla.cisterna.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctOtra} % ({totalesTabla.otra.toLocaleString('es-AR')})
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