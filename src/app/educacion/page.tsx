'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { InfoTooltip } from '@/components/InfoTooltip';
import TerritoryFilter, { territoryKey } from '@/components/TerritoryFilter';
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

type NivelEducativo =
  | 'secundaria_incompleta'
  | 'secundaria_completa'
  | 'superior_completo'
  | 'ignorado';

type SortField =
  | 'departamento'
  | 'municipio'
  | 'poblacion_2022'
  | 'secundaria_incompleta'
  | 'secundaria_completa'
  | 'superior_completo'
  | 'ignorado';

type SortOrder = 'asc' | 'desc';

type TerritorioEducacion = {
  departamento: string;
  municipio: string;
  poblacion_2022: number;
  secundaria_incompleta: number;
  secundaria_completa: number;
  superior_completo: number;
  ignorado: number;
  pct_secundaria_incompleta: number;
  pct_secundaria_completa: number;
  pct_superior_completo: number;
  pct_ignorado: number;
};

type EducacionData = {
  totalMayores25: number;
  comparativa: Record<'provincia' | 'pais' | 'nea', Record<NivelEducativo, number | null>>;
  territorios: TerritorioEducacion[];
};

const nivelesEducativos: { key: NivelEducativo; label: string; shortLabel: string; tooltip: string }[] = [
  {
    key: 'secundaria_incompleta',
    label: 'Secundaria incompleta',
    shortLabel: 'Secundaria incompleta',
    tooltip:
      'Agrupa a la población de 25 años y más sin instrucción, con primaria incompleta, primaria completa y secundaria incompleta.',
  },
  {
    key: 'secundaria_completa',
    label: 'Secundaria completa',
    shortLabel: 'Secundaria completa',
    tooltip:
      'Agrupa a la población de 25 años y más con secundaria completa, terciario incompleto y universitario incompleto.',
  },
  {
    key: 'superior_completo',
    label: 'Superior / universitario completo',
    shortLabel: 'Superior / univ. completo',
    tooltip:
      'Agrupa a la población de 25 años y más con nivel terciario completo, universitario completo y posgrado (incompleto o completo).',
  },
  {
    key: 'ignorado',
    label: 'Ignorado',
    shortLabel: 'Ignorado',
    tooltip:
      'Población de 25 años y más cuyo nivel educativo máximo alcanzado figura como ignorado o sin especificar en el Censo 2022.',
  },
];

const EMPTY_TERRITORIOS: TerritorioEducacion[] = [];

const valorNivel = (territorio: TerritorioEducacion, nivel: NivelEducativo) =>
  Number(territorio[nivel]) || 0;
const porcentajeNivel = (territorio: TerritorioEducacion, nivel: NivelEducativo) =>
  Number(territorio[`pct_${nivel}`]) || 0;
const formatPct = (value: number | null | undefined) =>
  value === null || value === undefined
    ? '—'
    : `${(value * 100).toFixed(1).replace('.', ',')} %`;

export default function EducacionPage() {
  const [data, setData] = useState<EducacionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla' | 'mapa'>('grafico');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);
  const [selectedNivel, setSelectedNivel] = useState<NivelEducativo>('secundaria_completa');
  const [sortField, setSortField] = useState<SortField>('poblacion_2022');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const educacionResponse = await fetch(apiPath('/api/educacion'));
        if (!educacionResponse.ok) throw new Error('No se pudo cargar el nivel educativo');
        setData(await educacionResponse.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const territoriosBase = useMemo(() => data?.territorios ?? EMPTY_TERRITORIOS, [data]);
  const territoriosFiltrados = useMemo(
    () =>
      territoriosBase.filter(
        (territorio) =>
          selectedLocations === null || selectedLocations.includes(territoryKey(territorio)),
      ),
    [territoriosBase, selectedLocations],
  );

  const territoriosVisibles = useMemo(() => {
    return territoriosFiltrados.map((territorio) => ({
      ...territorio,
      nombre: territorio.municipio || territorio.departamento,
      locationKey: territoryKey(territorio),
    }));
  }, [territoriosFiltrados]);

  const nivelSeleccionado =
    nivelesEducativos.find((nivel) => nivel.key === selectedNivel) || nivelesEducativos[1];
  const totalSeleccionado = territoriosFiltrados.reduce(
    (total, territorio) => total + (Number(territorio.poblacion_2022) || 0),
    0,
  );
  const totalNivelSeleccionado = territoriosFiltrados.reduce(
    (total, territorio) => total + valorNivel(territorio, selectedNivel),
    0,
  );
  const porcentajeProvinciaSeleccion =
    totalSeleccionado > 0 ? totalNivelSeleccionado / totalSeleccionado : null;
  const seleccionCompleta =
    selectedLocations === null || selectedLocations.length === territoriosBase.length;

  const etiquetaSeleccion = useMemo(() => {
    if (seleccionCompleta) return 'Corrientes';
    if (territoriosFiltrados.length === 0) return 'Sin selección';
    if (territoriosFiltrados.length === 1) {
      return territoriosFiltrados[0].municipio || territoriosFiltrados[0].departamento;
    }

    const deptosUnicos = Array.from(new Set(territoriosFiltrados.map((t) => t.departamento)));
    if (deptosUnicos.length === 1) {
      const todosDelDepto = territoriosBase.filter((t) => t.departamento === deptosUnicos[0]);
      if (todosDelDepto.length === territoriosFiltrados.length) {
        return `Depto. ${deptosUnicos[0]}`;
      }
    }

    return `${territoriosFiltrados.length} municipios`;
  }, [seleccionCompleta, territoriosFiltrados, territoriosBase]);

  // Totales de las 4 categorías para el pie de la tabla
  const totalesTabla = useMemo(() => {
    const pob = territoriosVisibles.reduce((acc, r) => acc + (Number(r.poblacion_2022) || 0), 0);
    const secInc = territoriosVisibles.reduce((acc, r) => acc + (Number(r.secundaria_incompleta) || 0), 0);
    const secComp = territoriosVisibles.reduce((acc, r) => acc + (Number(r.secundaria_completa) || 0), 0);
    const supComp = territoriosVisibles.reduce((acc, r) => acc + (Number(r.superior_completo) || 0), 0);
    const ign = territoriosVisibles.reduce((acc, r) => acc + (Number(r.ignorado) || 0), 0);
    const pct = (v: number) => (pob > 0 ? ((v / pob) * 100).toFixed(1).replace('.', ',') : '0,0');
    return {
      pob,
      secInc,
      secComp,
      supComp,
      ign,
      pctSecInc: pct(secInc),
      pctSecComp: pct(secComp),
      pctSupComp: pct(supComp),
      pctIgn: pct(ign),
    };
  }, [territoriosVisibles]);

  // Datos consolidados por departamento para el Mapa
  const datosMapa = useMemo(() => {
    const deptosActivos = new Set(territoriosFiltrados.map((t) => t.departamento));
    const deptosMap = new Map<string, { pob: number; val: number }>();

    for (const t of territoriosBase) {
      const curr = deptosMap.get(t.departamento) || { pob: 0, val: 0 };
      curr.pob += Number(t.poblacion_2022) || 0;
      curr.val += Number(valorNivel(t, selectedNivel)) || 0;
      deptosMap.set(t.departamento, curr);
    }

    return Array.from(deptosMap.entries()).map(([depto, vals]) => {
      const pct = vals.pob > 0 ? (vals.val / vals.pob) * 100 : 0;
      return {
        territoryName: depto,
        value: pct,
        labelFormatted: `${pct.toFixed(1).replace('.', ',')} %`,
        subtitle: `${vals.val.toLocaleString('es-AR')} de ${vals.pob.toLocaleString('es-AR')} personas (25+)`,
        isSelected: deptosActivos.has(depto),
      };
    });
  }, [territoriosBase, territoriosFiltrados, selectedNivel]);

  const handleSelectTerritoryOnMap = (deptoName: string) => {
    const norm = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    const target = norm(deptoName);

    const keysDelDepto = territoriosBase
      .filter((t) => norm(t.departamento) === target)
      .map(territoryKey);

    if (!keysDelDepto.length) return;

    setSelectedLocations((prev) => {
      const current = prev ?? territoriosBase.map(territoryKey);
      const soloEsteDeptoSeleccionado =
        current.length === keysDelDepto.length &&
        keysDelDepto.every((k) => current.includes(k));

      return soloEsteDeptoSeleccionado ? null : keysDelDepto;
    });
  };

  const datosGrafico = useMemo(() => {
    return [...territoriosVisibles]
      .map((territorio) => ({
        ...territorio,
        valor: valorNivel(territorio, selectedNivel),
        porcentaje: porcentajeNivel(territorio, selectedNivel),
      }))
      .sort((a, b) => b.porcentaje - a.porcentaje);
  }, [territoriosVisibles, selectedNivel]);

  const chartHeight = Math.max(500, datosGrafico.length * 28 + 30);

  const { xMax, xTicks } = useMemo(() => {
    if (selectedNivel !== 'ignorado') {
      return { xMax: 100, xTicks: [0, 25, 50, 75, 100] };
    }
    const maxVal = datosGrafico.reduce((max, item) => Math.max(max, Number(item.porcentaje) || 0), 0);
    if (maxVal === 0) return { xMax: 4, xTicks: [0, 1, 2, 3, 4] };

    const targetMax = maxVal * 1.15;
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
    const top = niceStep * 4;
    return {
      xMax: top,
      xTicks: [0, niceStep, niceStep * 2, niceStep * 3, top],
    };
  }, [datosGrafico, selectedNivel]);

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

  // Datos ordenados para la tabla completa con las 4 opciones
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

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>NIVEL EDUCATIVO EN MAYORES DE 25 AÑOS</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 y Comparativas Regionales
          </p>
        </div>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px', overflow: 'visible' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#14203b', lineHeight: 1.2 }}>
            {etiquetaSeleccion}
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Total Mayores de 25 Años
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4 }}>
            {data ? totalSeleccionado.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Censo 2022 · población de 25 años y más</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#047857', lineHeight: 1.2 }}>
              {etiquetaSeleccion}
            </span>
            <InfoTooltip text={nivelSeleccionado.tooltip} />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            % {nivelSeleccionado.label}
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#047857' }}>
            {seleccionCompleta
              ? formatPct(data?.comparativa.provincia?.[selectedNivel])
              : formatPct(porcentajeProvinciaSeleccion)}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {data ? `${totalNivelSeleccionado.toLocaleString('es-AR')} personas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.2 }}>
              Total País
            </span>
            <InfoTooltip text={nivelSeleccionado.tooltip} />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            % {nivelSeleccionado.label}
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#1d4ed8' }}>
            {formatPct(data?.comparativa.pais?.[selectedNivel])}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>República Argentina</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b', overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b45309', lineHeight: 1.2 }}>
              Región NEA
            </span>
            <InfoTooltip text={nivelSeleccionado.tooltip} />
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            % {nivelSeleccionado.label}
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: '#b45309' }}>
            {formatPct(data?.comparativa.nea?.[selectedNivel])}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Nordeste Argentino</span>
        </div>
      </div>

      {/* Selector de Nivel Educativo (4 Categorías) */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: '#ffffff', padding: '10px 16px', borderRadius: 12, border: '1px solid #cbd5e1', marginTop: 12 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14203b', marginRight: 8, display: 'inline-flex', alignItems: 'center' }}>
          NIVEL A VISUALIZAR
          <InfoTooltip text={nivelSeleccionado.tooltip} />
          <span style={{ marginLeft: 4 }}>:</span>
        </span>
        {nivelesEducativos.map((nivel) => (
          <button
            key={nivel.key}
            onClick={() => {
              setSelectedNivel(nivel.key);
              if (viewMode === 'tabla') {
                setSortField(nivel.key);
                setSortOrder('desc');
              }
            }}
            aria-pressed={selectedNivel === nivel.key}
            style={{
              border: '1px solid',
              borderColor: selectedNivel === nivel.key ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedNivel === nivel.key ? '#14203b' : '#f8fafc',
              color: selectedNivel === nivel.key ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedNivel === nivel.key ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {nivel.label}
          </button>
        ))}
      </div>

      {/* Gráfico / Tabla / Mapa + Filtro Lateral */}
      <div className="population-layout">
        <div className="card" style={{ margin: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>
                {viewMode === 'tabla'
                  ? 'Distribución completa por nivel educativo en mayores de 25 años por municipio'
                  : `${nivelSeleccionado.label} en mayores de 25 por ${
                      viewMode === 'mapa' ? 'departamento' : 'municipio'
                    }`}
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
                <span>Calculando indicadores educativos...</span>
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
                            dataKey="nombre"
                            width={185}
                            interval={0}
                            stroke="#475569"
                            fontSize={10.5}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value) => [
                              `${Number(value).toFixed(1).replace('.', ',')} %`,
                              nivelSeleccionado.label,
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
                            dataKey="porcentaje"
                            fill={selectedNivel === 'ignorado' ? '#64748b' : '#047857'}
                            radius={[0, 4, 4, 0]}
                            barSize={18}
                          >
                            <LabelList
                              dataKey="porcentaje"
                              position="right"
                              formatter={(value) => `${Number(value).toFixed(1).replace('.', ',')} %`}
                              fill="#14203b"
                              fontSize={10}
                              fontWeight={700}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Pie fijo del Eje X con los mismos offsets exactos (32px eje Y + 6px margin + 185px YAxis = 223px a la izq, y 65px + 17px scrollbar = 82px a la der) */}
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
                        selectedNivel === 'ignorado'
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
                    Población de 25 años y más con el nivel seleccionado (%)
                  </div>
                </div>
              </div>
            ) : viewMode === 'mapa' ? (
              <CorrientesMap
                data={datosMapa}
                metricLabel={`% ${nivelSeleccionado.label}`}
                colorScheme="emerald"
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
                        onClick={() => handleSort('poblacion_2022')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>Población 25+</span>
                          {renderSortIcon('poblacion_2022')}
                        </div>
                      </th>
                      {nivelesEducativos.map((nivel) => (
                        <th
                          key={nivel.key}
                          onClick={() => handleSort(nivel.key)}
                          style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            backgroundColor: selectedNivel === nivel.key ? '#f0fdf4' : '#ffffff',
                            color: selectedNivel === nivel.key ? '#047857' : '#475569',
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
                    {tablaOrdenada.map((row, idx: number) => (
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
                          {row.poblacion_2022.toLocaleString('es-AR')}
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            backgroundColor: selectedNivel === 'secundaria_incompleta' ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#047857' }}>
                            {row.secundaria_incompleta.toLocaleString('es-AR')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 5 }}>
                            ({row.pct_secundaria_incompleta.toFixed(1).replace('.', ',')} %)
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            backgroundColor: selectedNivel === 'secundaria_completa' ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#047857' }}>
                            {row.secundaria_completa.toLocaleString('es-AR')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 5 }}>
                            ({row.pct_secundaria_completa.toFixed(1).replace('.', ',')} %)
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            backgroundColor: selectedNivel === 'superior_completo' ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#047857' }}>
                            {row.superior_completo.toLocaleString('es-AR')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 5 }}>
                            ({row.pct_superior_completo.toFixed(1).replace('.', ',')} %)
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            backgroundColor: selectedNivel === 'ignorado' ? 'rgba(100, 116, 139, 0.08)' : 'transparent',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#475569' }}>
                            {row.ignorado.toLocaleString('es-AR')}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 5 }}>
                            ({row.pct_ignorado.toFixed(1).replace('.', ',')} %)
                          </span>
                        </td>
                      </tr>
                    ))}
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
                        {totalesTabla.pob.toLocaleString('es-AR')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.secInc.toLocaleString('es-AR')} ({totalesTabla.pctSecInc} %)
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.secComp.toLocaleString('es-AR')} ({totalesTabla.pctSecComp} %)
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.supComp.toLocaleString('es-AR')} ({totalesTabla.pctSupComp} %)
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {totalesTabla.ign.toLocaleString('es-AR')} ({totalesTabla.pctIgn} %)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
        <TerritoryFilter
          territories={territoriosBase}
          selectedKeys={selectedLocations}
          onSelectionChange={setSelectedLocations}
        />
      </div>
    </div>
  );
}