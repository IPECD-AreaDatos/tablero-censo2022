'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import TerritoryFilter, { territoryKey } from '@/components/TerritoryFilter';
import CorrientesMap from '@/components/CorrientesMap';
import {
  Flame,
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

type TipoCombustible = 'gas_garrafa' | 'gas_tubo' | 'electricidad' | 'lena_carbon';
type SortField = 'departamento' | 'municipio' | 'total_viviendas' | TipoCombustible;
type SortOrder = 'asc' | 'desc';

type CombustibleTerritory = {
  departamento: string;
  municipio: string;
  nombre: string;
  total_viviendas: number;
  gas_garrafa: number;
  gas_tubo: number;
  electricidad: number;
  lena_carbon: number;
  pct_gas_garrafa: string;
  pct_gas_tubo: string;
  pct_electricidad: string;
  pct_lena_carbon: string;
};

type VisibleCombustibleTerritory = CombustibleTerritory & {
  locationKey: string;
  incidencia: number;
};

const TIPOS_COMBUSTIBLE: { key: TipoCombustible; label: string; shortLabel: string }[] = [
  { key: 'gas_garrafa', label: 'Gas en Garrafa', shortLabel: 'Gas en Garrafa' },
  { key: 'gas_tubo', label: 'Gas en Tubo o Zepelín', shortLabel: 'Gas en Tubo / Zepelín' },
  { key: 'electricidad', label: 'Electricidad', shortLabel: 'Electricidad' },
  { key: 'lena_carbon', label: 'Leña o Carbón', shortLabel: 'Leña o Carbón' },
];

const EMPTY_TERRITORIES: CombustibleTerritory[] = [];

const normalizeText = (value: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const calcPctNumber = (valor: number, total: number) =>
  total > 0 ? (valor / total) * 100 : 0;

const formatPct = (pct: number) => `${pct.toFixed(1).replace('.', ',')} %`;

export default function CombustiblePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCombustible, setSelectedCombustible] = useState<TipoCombustible>('gas_garrafa');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla' | 'mapa'>('grafico');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);

  // Estados de ordenamiento exclusivos de la tabla
  const [sortField, setSortField] = useState<SortField>('total_viviendas');
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

  const detalleOriginal = useMemo<CombustibleTerritory[]>(() => data?.detalle ?? EMPTY_TERRITORIES, [data]);
  const detalleFiltrado = useMemo(
    () =>
      detalleOriginal.filter(
        (territory) =>
          selectedLocations === null || selectedLocations.includes(territoryKey(territory)),
      ),
    [detalleOriginal, selectedLocations],
  );

  const labelsCombustible: Record<TipoCombustible, string> = {
    gas_garrafa: 'Gas en Garrafa',
    gas_tubo: 'Gas en Tubo o Zepelín',
    electricidad: 'Electricidad',
    lena_carbon: 'Leña o Carbón',
  };

  const territoriosVisibles = useMemo<VisibleCombustibleTerritory[]>(() => {
    return detalleFiltrado.map((territory) => {
      const total = Number(territory.total_viviendas) || 0;
      const val = Number(territory[selectedCombustible]) || 0;
      return {
        ...territory,
        municipio: territory.municipio || territory.nombre || territory.departamento,
        locationKey: territoryKey(territory),
        incidencia: calcPctNumber(val, total),
      };
    });
  }, [detalleFiltrado, selectedCombustible]);

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

  // Cálculos dinámicos de las 4 tarjetas KPI superiores según selección territorial
  const kpisDinamicos = useMemo(() => {
    const totalViviendas = detalleFiltrado.reduce((acc, t) => acc + (Number(t.total_viviendas) || 0), 0);
    const sumGarrafa = detalleFiltrado.reduce((acc, t) => acc + (Number(t.gas_garrafa) || 0), 0);
    const sumTubo = detalleFiltrado.reduce((acc, t) => acc + (Number(t.gas_tubo) || 0), 0);
    const sumElectricidad = detalleFiltrado.reduce((acc, t) => acc + (Number(t.electricidad) || 0), 0);
    const sumLena = detalleFiltrado.reduce((acc, t) => acc + (Number(t.lena_carbon) || 0), 0);

    const fmtPct = (v: number) =>
      totalViviendas > 0 ? `${((v / totalViviendas) * 100).toFixed(1).replace('.', ',')} %` : '0,0 %';

    return {
      sumGarrafa,
      sumTubo,
      sumElectricidad,
      sumLena,
      pctGarrafa: fmtPct(sumGarrafa),
      pctTubo: fmtPct(sumTubo),
      pctElectricidad: fmtPct(sumElectricidad),
      pctLena: fmtPct(sumLena),
    };
  }, [detalleFiltrado]);

  // Todos los municipios ordenados de mayor a menor por % de incidencia
  const datosGrafico = useMemo(() => {
    if (!territoriosVisibles.length) return [];
    return [...territoriosVisibles].sort((a, b) => b.incidencia - a.incidencia);
  }, [territoriosVisibles]);

  const chartHeight = Math.max(500, datosGrafico.length * 28 + 30);

  // Escala porcentual dinámica según el combustible seleccionado
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

  // Datos consolidados por departamento para el Mapa
  const datosMapa = useMemo(() => {
    const deptosActivos = new Set(detalleFiltrado.map((t) => t.departamento));
    const deptosMap = new Map<string, { total: number; tipoVal: number }>();

    for (const t of detalleOriginal) {
      const curr = deptosMap.get(t.departamento) || { total: 0, tipoVal: 0 };
      curr.total += Number(t.total_viviendas) || 0;
      curr.tipoVal += Number(t[selectedCombustible]) || 0;
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
  }, [detalleOriginal, detalleFiltrado, selectedCombustible]);

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

  // Totales de las 4 variables para el pie fijo de la tabla
  const totalesTabla = useMemo(() => {
    const viviendas = territoriosVisibles.reduce(
      (acc, r) => acc + (Number(r.total_viviendas) || 0),
      0,
    );
    const sum = (key: TipoCombustible) =>
      territoriosVisibles.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    const pct = (v: number) =>
      viviendas > 0 ? ((v / viviendas) * 100).toFixed(1).replace('.', ',') : '0,0';

    const garrafa = sum('gas_garrafa');
    const tubo = sum('gas_tubo');
    const elec = sum('electricidad');
    const lena = sum('lena_carbon');

    return {
      viviendas,
      garrafa,
      tubo,
      elec,
      lena,
      pctGarrafa: pct(garrafa),
      pctTubo: pct(tubo),
      pctElec: pct(elec),
      pctLena: pct(lena),
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

  const getColorCombustible = (comb: TipoCombustible) => {
    switch (comb) {
      case 'gas_garrafa':
        return '#047857';
      case 'gas_tubo':
        return '#2563eb';
      case 'electricidad':
        return '#d97706';
      case 'lena_carbon':
        return '#dc2626';
    }
  };

  const getMapColorScheme = (comb: TipoCombustible): 'emerald' | 'blue' | 'amber' | 'red' => {
    switch (comb) {
      case 'gas_garrafa':
        return 'emerald';
      case 'gas_tubo':
        return 'blue';
      case 'electricidad':
        return 'amber';
      case 'lena_carbon':
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
          <h1>COMBUSTIBLE UTILIZADO PRINCIPALMENTE PARA COCINAR</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022
          </p>
        </div>
      </div>

      {/* Tarjetas KPI Superiores dinámicas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#047857', lineHeight: 1.2 }}>
            {etiquetaSeleccion}
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Gas en Garrafa
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#047857' }}>
            {data ? kpisDinamicos.pctGarrafa : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {data ? `${kpisDinamicos.sumGarrafa.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.2 }}>
            {etiquetaSeleccion}
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Gas en Tubo / Zepelín
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#1d4ed8' }}>
            {data ? kpisDinamicos.pctTubo : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {data ? `${kpisDinamicos.sumTubo.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b45309', lineHeight: 1.2 }}>
            {etiquetaSeleccion}
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Electricidad
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#b45309' }}>
            {data ? kpisDinamicos.pctElectricidad : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {data ? `${kpisDinamicos.sumElectricidad.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b91c1c', lineHeight: 1.2 }}>
            {etiquetaSeleccion}
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Leña o Carbón
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#b91c1c' }}>
            {data ? kpisDinamicos.pctLena : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {data ? `${kpisDinamicos.sumLena.toLocaleString('es-AR')} viviendas` : ''}
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
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14203b', marginRight: 8 }}>
          COMBUSTIBLE A VISUALIZAR:
        </span>
        {TIPOS_COMBUSTIBLE.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setSelectedCombustible(t.key);
              if (viewMode === 'tabla') {
                setSortField(t.key);
                setSortOrder('desc');
              }
            }}
            style={{
              border: '1px solid',
              borderColor: selectedCombustible === t.key ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedCombustible === t.key ? '#14203b' : '#f8fafc',
              color: selectedCombustible === t.key ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedCombustible === t.key ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla / Mapa + Filtro Lateral */}
      <div className="population-layout">
        <div className="card" style={{ margin: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <Flame className="w-4 h-4 text-emerald-400" />
              <span>
                {viewMode === 'tabla'
                  ? 'Distribución completa de viviendas por combustible utilizado y municipio'
                  : `Incidencia de ${labelsCombustible[selectedCombustible]} (%) por ${viewMode === 'mapa' ? 'departamento' : 'municipio'}`}
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
                <span>Calculando combustible utilizado...</span>
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
                              const viviendas = Number(props?.payload?.[selectedCombustible]) || 0;
                              return [
                                `${formatPct(Number(val))} (${viviendas.toLocaleString('es-AR')} viviendas)`,
                                labelsCombustible[selectedCombustible],
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
                            fill={getColorCombustible(selectedCombustible)}
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
                    Porcentaje de viviendas que usan {labelsCombustible[selectedCombustible]} (%)
                  </div>
                </div>
              </div>
            ) : viewMode === 'mapa' ? (
              <CorrientesMap
                data={datosMapa}
                metricLabel={`% ${labelsCombustible[selectedCombustible]}`}
                colorScheme={getMapColorScheme(selectedCombustible)}
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
                <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', fontSize: '0.78rem' }}>
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
                      {TIPOS_COMBUSTIBLE.map((comb) => (
                        <th
                          key={comb.key}
                          onClick={() => handleSort(comb.key)}
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            backgroundColor: selectedCombustible === comb.key ? '#f0fdf4' : '#ffffff',
                            color: selectedCombustible === comb.key ? getColorCombustible(comb.key) : '#475569',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                            <span>{comb.shortLabel}</span>
                            {renderSortIcon(comb.key)}
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
                          {TIPOS_COMBUSTIBLE.map((comb) => {
                            const count = Number(row[comb.key]) || 0;
                            const pct = calcPctNumber(count, total);
                            return (
                              <td
                                key={comb.key}
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'right',
                                  backgroundColor:
                                    selectedCombustible === comb.key ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                                }}
                              >
                                <span style={{ fontWeight: 700, color: getColorCombustible(comb.key) }}>
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
                        {totalesTabla.pctGarrafa} % ({totalesTabla.garrafa.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctTubo} % ({totalesTabla.tubo.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctElec} % ({totalesTabla.elec.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctLena} % ({totalesTabla.lena.toLocaleString('es-AR')})
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