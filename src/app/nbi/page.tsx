'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { InfoTooltip } from '@/components/InfoTooltip';
import TerritoryFilter, { territoryKey } from '@/components/TerritoryFilter';
import CorrientesMap from '@/components/CorrientesMap';
import {
  AlertTriangle,
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

type ComponenteNBI =
  | 'si_nbi'
  | 'hacinamiento'
  | 'viv_inconveniente'
  | 'cond_sanitarias'
  | 'escolaridad'
  | 'capacidad_subsistencia';

type SortField = 'departamento' | 'municipio' | 'total_viviendas' | ComponenteNBI;
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

type VisibleNbiTerritory = NbiTerritory & {
  locationKey: string;
  incidencia: number;
};

type NbiData = {
  totalHogares: number;
  sumNbi: number;
  kpis: {
    pais: Record<ComponenteNBI, string>;
    nea: Record<ComponenteNBI, string>;
  };
  detalle: NbiTerritory[];
};

const COMPONENTES_NBI: { key: ComponenteNBI; label: string; shortLabel: string }[] = [
  { key: 'si_nbi', label: 'Hogares con NBI (Total)', shortLabel: 'Con NBI (Total)' },
  { key: 'hacinamiento', label: 'Hacinamiento Crítico', shortLabel: 'Hacinamiento' },
  { key: 'viv_inconveniente', label: 'Vivienda Inconveniente', shortLabel: 'Viv. Inconveniente' },
  { key: 'cond_sanitarias', label: 'Condiciones Sanitarias', shortLabel: 'Cond. Sanitarias' },
  { key: 'escolaridad', label: 'NBI Escolaridad', shortLabel: 'Escolaridad' },
  { key: 'capacidad_subsistencia', label: 'Capacidad de Subsistencia', shortLabel: 'Cap. Subsistencia' },
];

const EMPTY_TERRITORIES: NbiTerritory[] = [];

const normalizeText = (value: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const calcPctNumber = (valor: number, total: number) =>
  total > 0 ? (valor / total) * 100 : 0;

const formatPct = (pct: number) => `${pct.toFixed(1).replace('.', ',')} %`;

export default function NBIPage() {
  const [data, setData] = useState<NbiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedComp, setSelectedComp] = useState<ComponenteNBI>('si_nbi');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla' | 'mapa'>('grafico');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);

  // Estados de ordenamiento exclusivos de la tabla
  const [sortField, setSortField] = useState<SortField>('total_viviendas');
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
        (territory) =>
          selectedLocations === null || selectedLocations.includes(territoryKey(territory)),
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
    return detalleFiltrado.map((territory) => {
      const total = Number(territory.total_viviendas) || 0;
      const val = Number(territory[selectedComp]) || 0;
      return {
        ...territory,
        municipio: territory.municipio || territory.nombre || territory.departamento,
        locationKey: territoryKey(territory),
        incidencia: calcPctNumber(val, total),
      };
    });
  }, [detalleFiltrado, selectedComp]);

  // Datos consolidados por departamento para el Mapa (% de incidencia del componente NBI activo)
  const datosMapa = useMemo(() => {
    const deptosActivos = new Set(detalleFiltrado.map((t) => t.departamento));
    const deptosMap = new Map<string, { total: number; compVal: number }>();

    for (const t of detalleOriginal) {
      const curr = deptosMap.get(t.departamento) || { total: 0, compVal: 0 };
      curr.total += Number(t.total_viviendas) || 0;
      curr.compVal += Number(t[selectedComp]) || 0;
      deptosMap.set(t.departamento, curr);
    }

    return Array.from(deptosMap.entries()).map(([depto, vals]) => {
      const pct = vals.total > 0 ? (vals.compVal / vals.total) * 100 : 0;
      return {
        territoryName: depto,
        value: pct,
        labelFormatted: `${pct.toFixed(1).replace('.', ',')} %`,
        subtitle: `${vals.compVal.toLocaleString('es-AR')} de ${vals.total.toLocaleString('es-AR')} hogares`,
        isSelected: deptosActivos.has(depto),
      };
    });
  }, [detalleOriginal, detalleFiltrado, selectedComp]);

  // Clic en un departamento del mapa para filtrar o restaurar todos
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

  // Cálculos dinámicos de las tarjetas KPI superiores según selección territorial y componente
  const totalSeleccionado = detalleFiltrado.reduce(
    (acc, t) => acc + (Number(t.total_viviendas) || 0),
    0,
  );
  const hogaresCompSeleccionado = detalleFiltrado.reduce(
    (acc, t) => acc + (Number(t[selectedComp]) || 0),
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

  const pctCompProvincia =
    totalSeleccionado > 0
      ? `${((hogaresCompSeleccionado / totalSeleccionado) * 100).toFixed(1).replace('.', ',')} %`
      : '0,0 %';

  const pctCompPais = data?.kpis?.pais?.[selectedComp] || '—';
  const pctCompNea = data?.kpis?.nea?.[selectedComp] || '—';

  // Todos los municipios ordenados de mayor a menor por % de incidencia
  const datosGrafico = useMemo(() => {
    return [...territoriosVisibles].sort((a, b) => b.incidencia - a.incidencia);
  }, [territoriosVisibles]);

  const chartHeight = Math.max(500, datosGrafico.length * 28 + 30);

  // Escala porcentual dinámica para que tanto NBI Total (~50%) como Escolaridad (~5%) ocupen bien el ancho
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

  // Totales de los 6 componentes para el pie fijo de la tabla
  const totalesTabla = useMemo(() => {
    const hogares = territoriosVisibles.reduce((acc, r) => acc + (Number(r.total_viviendas) || 0), 0);
    const sum = (key: ComponenteNBI) =>
      territoriosVisibles.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    const pct = (v: number) => (hogares > 0 ? ((v / hogares) * 100).toFixed(1).replace('.', ',') : '0,0');

    const siNbi = sum('si_nbi');
    const hac = sum('hacinamiento');
    const viv = sum('viv_inconveniente');
    const san = sum('cond_sanitarias');
    const esc = sum('escolaridad');
    const sub = sum('capacidad_subsistencia');

    return {
      hogares,
      siNbi,
      hac,
      viv,
      san,
      esc,
      sub,
      pctSiNbi: pct(siNbi),
      pctHac: pct(hac),
      pctViv: pct(viv),
      pctSan: pct(san),
      pctEsc: pct(esc),
      pctSub: pct(sub),
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#14203b', lineHeight: 1.2 }}>
              {etiquetaSeleccion}
            </span>
            <InfoTooltip text={descripcionesComp.si_nbi} />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Total Hogares Evaluados
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4 }}>
            {data ? totalSeleccionado.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {seleccionCompleta ? 'Total Provincia de Corrientes' : 'Hogares en territorios seleccionados'}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #dc2626', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b91c1c', lineHeight: 1.2 }}>
              {etiquetaSeleccion}
            </span>
            <InfoTooltip text={descripcionesComp[selectedComp]} />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            % {labelsComp[selectedComp]}
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#b91c1c' }}>
            {data ? pctCompProvincia : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {data ? `${hogaresCompSeleccionado.toLocaleString('es-AR')} hogares` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b45309', lineHeight: 1.2 }}>
              Región NEA
            </span>
            <InfoTooltip text={descripcionesComp[selectedComp]} />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            % {labelsComp[selectedComp]}
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#b45309' }}>
            {pctCompNea}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Nordeste Argentino</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.2 }}>
              Total País
            </span>
            <InfoTooltip text={descripcionesComp[selectedComp]} />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            % {labelsComp[selectedComp]}
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#1d4ed8' }}>
            {pctCompPais}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>República Argentina</span>
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
        {COMPONENTES_NBI.map((comp) => (
          <button
            key={comp.key}
            onClick={() => {
              setSelectedComp(comp.key);
              if (viewMode === 'tabla') {
                setSortField(comp.key);
                setSortOrder('desc');
              }
            }}
            style={{
              border: '1px solid',
              borderColor: selectedComp === comp.key ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedComp === comp.key ? '#14203b' : '#f8fafc',
              color: selectedComp === comp.key ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedComp === comp.key ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {comp.label}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla / Mapa + Filtro Lateral */}
      <div className="population-layout">
        <div className="card" style={{ margin: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <AlertTriangle className="w-4 h-4 text-emerald-400" />
              <span>
                {viewMode === 'tabla'
                  ? 'Distribución completa de hogares con NBI por componente y municipio'
                  : `Incidencia de ${labelsComp[selectedComp]} (%) por ${viewMode === 'mapa' ? 'departamento' : 'municipio'}`}
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
                <span>Calculando componentes NBI...</span>
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
                              const hogares = Number(props?.payload?.[selectedComp]) || 0;
                              return [
                                `${formatPct(Number(val))} (${hogares.toLocaleString('es-AR')} hogares)`,
                                labelsComp[selectedComp],
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
                          <Bar dataKey="incidencia" fill="#b91c1c" radius={[0, 4, 4, 0]} barSize={18}>
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
                    Porcentaje de hogares con {labelsComp[selectedComp]} (%)
                  </div>
                </div>
              </div>
            ) : viewMode === 'mapa' ? (
              <CorrientesMap
                data={datosMapa}
                metricLabel={`% ${labelsComp[selectedComp]}`}
                colorScheme="red"
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
                <table style={{ width: '100%', minWidth: 1120, borderCollapse: 'collapse', fontSize: '0.78rem' }}>
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
                      {COMPONENTES_NBI.map((comp) => (
                        <th
                          key={comp.key}
                          onClick={() => handleSort(comp.key)}
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            backgroundColor: selectedComp === comp.key ? '#fef2f2' : '#ffffff',
                            color: selectedComp === comp.key ? '#b91c1c' : '#475569',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                            <span>{comp.shortLabel}</span>
                            {renderSortIcon(comp.key)}
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
                          {COMPONENTES_NBI.map((comp) => {
                            const count = Number(row[comp.key]) || 0;
                            const pct = calcPctNumber(count, total);
                            return (
                              <td
                                key={comp.key}
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'right',
                                  backgroundColor:
                                    selectedComp === comp.key ? 'rgba(220, 38, 38, 0.06)' : 'transparent',
                                }}
                              >
                                <span style={{ fontWeight: 700, color: '#b91c1c' }}>
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
                        {totalesTabla.pctSiNbi} % ({totalesTabla.siNbi.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctHac} % ({totalesTabla.hac.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctViv} % ({totalesTabla.viv.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctSan} % ({totalesTabla.san.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctEsc} % ({totalesTabla.esc.toLocaleString('es-AR')})
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.pctSub} % ({totalesTabla.sub.toLocaleString('es-AR')})
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