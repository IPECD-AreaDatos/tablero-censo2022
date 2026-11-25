'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import CorrientesMap from '@/components/CorrientesMap';
import {
  HeartPulse,
  ChevronLeft,
  BarChart2,
  Table as TableIcon,
  Map as MapIcon,
  Loader2,
  Search,
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

type IndicadorSalud = 'obra_social_pct' | 'programas_pct' | 'sin_cobertura_pct';
type SortField = 'departamento' | 'municipio' | 'poblacion' | IndicadorSalud;
type SortOrder = 'asc' | 'desc';

type MunicipioSalud = {
  departamento: string;
  municipio: string;
  poblacion: number;
  obra_social: number;
  programas: number;
  sin_cobertura: number;
  obra_social_pct: number;
  programas_pct: number;
  sin_cobertura_pct: number;
};

type SaludData = {
  totalesProvincia: {
    totalPoblacion: number;
    pctObraSocial: string;
    pctProgramas: string;
    pctSinCobertura: string;
  };
  municipios: MunicipioSalud[];
};

const INDICADORES: IndicadorSalud[] = ['obra_social_pct', 'programas_pct', 'sin_cobertura_pct'];

const ETIQUETAS: Record<IndicadorSalud, string> = {
  obra_social_pct: 'Obra Social / Prepaga / PAMI',
  programas_pct: 'Programas Estatales',
  sin_cobertura_pct: 'Sin Cobertura',
};

const COLORES: Record<IndicadorSalud, string> = {
  obra_social_pct: '#047857',
  programas_pct: '#2563eb',
  sin_cobertura_pct: '#dc2626',
};

const MAP_COLOR_SCHEMES: Record<IndicadorSalud, 'emerald' | 'blue' | 'red'> = {
  obra_social_pct: 'emerald',
  programas_pct: 'blue',
  sin_cobertura_pct: 'red',
};

const COUNT_KEY_BY_INDICADOR: Record<IndicadorSalud, 'obra_social' | 'programas' | 'sin_cobertura'> = {
  obra_social_pct: 'obra_social',
  programas_pct: 'programas',
  sin_cobertura_pct: 'sin_cobertura',
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const municipioKey = (municipio: Pick<MunicipioSalud, 'departamento' | 'municipio'>) =>
  `${municipio.departamento}::${municipio.municipio}`;

const formatPct = (value: number) => `${value.toFixed(1).replace('.', ',')} %`;

export default function SaludPage() {
  const [data, setData] = useState<SaludData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndicador, setSelectedIndicador] = useState<IndicadorSalud>('obra_social_pct');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla' | 'mapa'>('grafico');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMunicipios, setSelectedMunicipios] = useState<string[] | null>(null);
  const [sortField, setSortField] = useState<SortField>('obra_social_pct');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/salud'));
        if (!res.ok) throw new Error('No se pudieron cargar los datos de cobertura de salud.');
        setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const municipios = useMemo(() => data?.municipios ?? [], [data]);

  const gruposDepartamentos = useMemo(() => {
    const grupos = new Map<string, { departamento: string; municipios: MunicipioSalud[] }>();
    for (const municipio of municipios) {
      const departamento = municipio.departamento || 'Sin departamento';
      if (!grupos.has(departamento)) grupos.set(departamento, { departamento, municipios: [] });
      grupos.get(departamento)?.municipios.push(municipio);
    }

    return Array.from(grupos.values())
      .sort((a, b) => a.departamento.localeCompare(b.departamento, 'es', { sensitivity: 'base' }))
      .map((grupo) => ({
        ...grupo,
        municipios: grupo.municipios.sort((a, b) =>
          a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' }),
        ),
      }));
  }, [municipios]);

  const gruposFiltrados = useMemo(() => {
    const query = normalizeText(searchTerm);
    return gruposDepartamentos
      .map((grupo) => {
        if (!query || normalizeText(grupo.departamento).includes(query)) return grupo;
        return {
          ...grupo,
          municipios: grupo.municipios.filter((municipio) =>
            normalizeText(municipio.municipio).includes(query),
          ),
        };
      })
      .filter((grupo) => grupo.municipios.length > 0);
  }, [gruposDepartamentos, searchTerm]);

  const datosBaseActivos = useMemo(() => {
    if (selectedMunicipios === null) return municipios;
    return municipios.filter((municipio) => selectedMunicipios.includes(municipioKey(municipio)));
  }, [municipios, selectedMunicipios]);

  const totalesSeleccion = useMemo(() => {
    const poblacion = datosBaseActivos.reduce((total, municipio) => total + municipio.poblacion, 0);
    const conteos = {
      obra_social_pct: datosBaseActivos.reduce((total, municipio) => total + municipio.obra_social, 0),
      programas_pct: datosBaseActivos.reduce((total, municipio) => total + municipio.programas, 0),
      sin_cobertura_pct: datosBaseActivos.reduce((total, municipio) => total + municipio.sin_cobertura, 0),
    };
    return {
      poblacion,
      porcentajes: {
        obra_social_pct: poblacion > 0 ? (conteos.obra_social_pct / poblacion) * 100 : 0,
        programas_pct: poblacion > 0 ? (conteos.programas_pct / poblacion) * 100 : 0,
        sin_cobertura_pct: poblacion > 0 ? (conteos.sin_cobertura_pct / poblacion) * 100 : 0,
      },
    };
  }, [datosBaseActivos]);

  const datosGrafico = useMemo(() => {
    const cantidadesPorNombre = new Map<string, number>();
    for (const municipio of datosBaseActivos) {
      const nombre = normalizeText(municipio.municipio);
      cantidadesPorNombre.set(nombre, (cantidadesPorNombre.get(nombre) || 0) + 1);
    }

    return [...datosBaseActivos]
      .sort((a, b) => b[selectedIndicador] - a[selectedIndicador])
      .map((municipio) => ({
        ...municipio,
        municipio_label:
          (cantidadesPorNombre.get(normalizeText(municipio.municipio)) || 0) > 1
            ? `${municipio.municipio} (${municipio.departamento})`
            : municipio.municipio,
      }));
  }, [datosBaseActivos, selectedIndicador]);

  const chartHeight = Math.max(500, datosGrafico.length * 28 + 30);

  // Datos consolidados por departamento para el Mapa
  const datosMapa = useMemo(() => {
    const deptosActivos = new Set(datosBaseActivos.map((m) => m.departamento || 'Sin departamento'));
    const deptosMap = new Map<string, { pob: number; count: number }>();
    const countKey = COUNT_KEY_BY_INDICADOR[selectedIndicador];

    for (const m of municipios) {
      const depto = m.departamento || 'Sin departamento';
      const curr = deptosMap.get(depto) || { pob: 0, count: 0 };
      curr.pob += Number(m.poblacion) || 0;
      curr.count += Number(m[countKey]) || 0;
      deptosMap.set(depto, curr);
    }

    return Array.from(deptosMap.entries()).map(([depto, vals]) => {
      const pct = vals.pob > 0 ? (vals.count / vals.pob) * 100 : 0;
      return {
        territoryName: depto,
        value: pct,
        labelFormatted: `${pct.toFixed(1).replace('.', ',')} %`,
        subtitle: `${vals.count.toLocaleString('es-AR')} de ${vals.pob.toLocaleString('es-AR')} personas`,
        isSelected: deptosActivos.has(depto),
      };
    });
  }, [municipios, datosBaseActivos, selectedIndicador]);

  const handleSelectTerritoryOnMap = (deptoName: string) => {
    const target = normalizeText(deptoName);
    const keysDelDepto = municipios
      .filter((m) => normalizeText(m.departamento || '') === target)
      .map(municipioKey);

    if (!keysDelDepto.length) return;

    setSelectedMunicipios((prev) => {
      const current = prev ?? municipios.map(municipioKey);
      const soloEsteDeptoSeleccionado =
        current.length === keysDelDepto.length &&
        keysDelDepto.every((k) => current.includes(k));

      return soloEsteDeptoSeleccionado ? null : keysDelDepto;
    });
  };

  const datosTabla = useMemo(
    () =>
      [...datosBaseActivos].sort((a, b) => {
        let comparison: number;
        if (sortField === 'departamento' || sortField === 'municipio') {
          comparison = a[sortField].localeCompare(b[sortField], 'es', { sensitivity: 'base' });
        } else {
          comparison = a[sortField] - b[sortField];
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      }),
    [datosBaseActivos, sortField, sortOrder],
  );

  const handleToggleMunicipio = (nombre: string) => {
    setSelectedMunicipios((actuales) => {
      const seleccion = actuales ?? municipios.map(municipioKey);
      return seleccion.includes(nombre)
        ? seleccion.filter((municipio) => municipio !== nombre)
        : [...seleccion, nombre];
    });
  };

  const handleToggleDepartamento = (departamento: string) => {
    const nombresMunicipios = municipios
      .filter((municipio) => (municipio.departamento || 'Sin departamento') === departamento)
      .map(municipioKey);

    setSelectedMunicipios((actuales) => {
      const seleccion = actuales ?? municipios.map(municipioKey);
      const todosSeleccionados = nombresMunicipios.every((nombre) => seleccion.includes(nombre));
      return todosSeleccionados
        ? seleccion.filter((nombre) => !nombresMunicipios.includes(nombre))
        : Array.from(new Set([...seleccion, ...nombresMunicipios]));
    });
  };

  const mostrarSeleccionCompleta =
    selectedMunicipios === null || selectedMunicipios.length === municipios.length;

  const etiquetaSeleccion = useMemo(() => {
    if (mostrarSeleccionCompleta) return 'Corrientes';
    if (datosBaseActivos.length === 0) return 'Sin selección';
    if (datosBaseActivos.length === 1) {
      return datosBaseActivos[0].municipio || datosBaseActivos[0].departamento;
    }

    const deptosUnicos = Array.from(
      new Set(datosBaseActivos.map((m) => m.departamento || 'Sin departamento')),
    );
    if (deptosUnicos.length === 1) {
      const todosDelDepto = municipios.filter(
        (m) => (m.departamento || 'Sin departamento') === deptosUnicos[0],
      );
      if (todosDelDepto.length === datosBaseActivos.length) {
        return `Depto. ${deptosUnicos[0]}`;
      }
    }

    return `${datosBaseActivos.length} municipios`;
  }, [mostrarSeleccionCompleta, datosBaseActivos, municipios]);

  const handleSelectAll = () => setSelectedMunicipios(mostrarSeleccionCompleta ? [] : null);

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
      return <ArrowUpDown size={12} color="#94a3b8" style={{ marginLeft: 4, opacity: 0.5 }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={12} color="#059669" strokeWidth={2.5} style={{ marginLeft: 4 }} />
    ) : (
      <ArrowDown size={12} color="#059669" strokeWidth={2.5} style={{ marginLeft: 4 }} />
    );
  };

  return (
    <div className="container">
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>COBERTURA DE SALUD EN VIVIENDAS PARTICULARES</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 por Municipios y Departamentos
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#14203b', lineHeight: 1.2 }}>
            {etiquetaSeleccion}
          </div>
          <span className="metricLabel" style={{ marginTop: 2 }}>
            Población Relevada
          </span>
          <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4 }}>
            {data ? totalesSeleccion.poblacion.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            {mostrarSeleccionCompleta ? 'Total Provincia de Corrientes' : 'Individuos en territorios seleccionados'}
          </span>
        </div>

        {INDICADORES.map((indicador) => (
          <div
            key={indicador}
            className="card"
            style={{ padding: '14px 18px', borderLeft: `4px solid ${COLORES[indicador]}` }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: COLORES[indicador], lineHeight: 1.2 }}>
              {etiquetaSeleccion}
            </div>
            <span className="metricLabel" style={{ marginTop: 2 }}>
              {ETIQUETAS[indicador]}
            </span>
            <span className="metricVal" style={{ fontSize: '1.45rem', marginTop: 4, color: COLORES[indicador] }}>
              {data ? formatPct(totalesSeleccion.porcentajes[indicador]) : '...'}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Porcentaje de la población</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
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
          INDICADOR A VISUALIZAR:
        </span>
        {INDICADORES.map((indicador) => (
          <button
            key={indicador}
            onClick={() => setSelectedIndicador(indicador)}
            aria-pressed={selectedIndicador === indicador}
            style={{
              border: '1px solid',
              borderColor: selectedIndicador === indicador ? COLORES[indicador] : '#cbd5e1',
              backgroundColor: selectedIndicador === indicador ? '#14203b' : '#f8fafc',
              color: selectedIndicador === indicador ? '#ffffff' : '#334155',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: selectedIndicador === indicador ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {ETIQUETAS[indicador]}
          </button>
        ))}
      </div>

      <div className="population-layout">
        <div className="card" style={{ margin: 0, minWidth: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <HeartPulse className="w-4 h-4 text-emerald-400" />
              <span>
                {ETIQUETAS[selectedIndicador]} por {viewMode === 'mapa' ? 'Departamento' : 'Municipio'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.08)', padding: 3, borderRadius: 8 }}>
              <button
                onClick={() => setViewMode('grafico')}
                aria-pressed={viewMode === 'grafico'}
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
                aria-pressed={viewMode === 'tabla'}
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
                aria-pressed={viewMode === 'mapa'}
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
                <span>Calculando cobertura de salud...</span>
              </div>
            ) : viewMode === 'grafico' ? (
              datosGrafico.length > 0 ? (
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
                              dataKey="municipio_label"
                              width={185}
                              interval={0}
                              stroke="#475569"
                              fontSize={10.5}
                              tickLine={false}
                            />
                            <Tooltip
                              formatter={(value) => [formatPct(Number(value)), ETIQUETAS[selectedIndicador]]}
                              labelFormatter={(label) => {
                                const municipio = datosGrafico.find((row) => row.municipio_label === label);
                                return municipio ? `${municipio.municipio} · ${municipio.departamento}` : label;
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
                              dataKey={selectedIndicador}
                              fill={COLORES[selectedIndicador]}
                              radius={[0, 4, 4, 0]}
                              barSize={18}
                            >
                              <LabelList
                                dataKey={selectedIndicador}
                                position="right"
                                formatter={(value) => formatPct(Number(value))}
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
                      {ETIQUETAS[selectedIndicador]} (%)
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                  No hay municipios seleccionados.
                </div>
              )
            ) : viewMode === 'mapa' ? (
              <CorrientesMap
                data={datosMapa}
                metricLabel={ETIQUETAS[selectedIndicador]}
                colorScheme={MAP_COLOR_SCHEMES[selectedIndicador]}
                geoJsonUrl="/corrientes-departamentos.geojson"
                onSelectTerritory={handleSelectTerritoryOnMap}
              />
            ) : (
              <div style={{ maxHeight: 600, overflow: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 2, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                    <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                      {([
                        ['departamento', 'Departamento'],
                        ['municipio', 'Municipio'],
                        ['poblacion', 'Población'],
                        ['obra_social_pct', 'Obra Social / PAMI'],
                        ['programas_pct', 'Programas Estatales'],
                        ['sin_cobertura_pct', 'Sin Cobertura'],
                      ] as [SortField, string][]).map(([field, label]) => (
                        <th
                          key={field}
                          onClick={() => handleSort(field)}
                          style={{
                            padding: '10px 12px',
                            textAlign: field === 'departamento' || field === 'municipio' ? 'left' : 'right',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            {label}
                            {renderSortIcon(field)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datosTabla.map((row) => (
                      <tr key={municipioKey(row)} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{row.departamento}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.municipio}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.poblacion.toLocaleString('es-AR')}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: COLORES.obra_social_pct }}>{formatPct(row.obra_social_pct)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: COLORES.programas_pct }}>{formatPct(row.programas_pct)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: COLORES.sin_cobertura_pct }}>{formatPct(row.sin_cobertura_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="card population-filter-panel" style={{ margin: 0, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#14203b' }}>Departamentos / Municipios</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
              {selectedMunicipios === null ? municipios.length : selectedMunicipios.length}/{municipios.length}
            </span>
          </div>

          <div className="population-search">
            <Search className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar depto. o municipio..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={mostrarSeleccionCompleta} onChange={handleSelectAll} />
              <span>Seleccionar todo</span>
            </label>
          </div>

          <div className="population-filter-list">
            {gruposFiltrados.map((grupo) => {
              const municipiosDepartamento = municipios.filter((municipio) =>
                (municipio.departamento || 'Sin departamento') === grupo.departamento,
              );
              const nombresMunicipios = municipiosDepartamento.map(municipioKey);
              const municipiosSeleccionados = municipiosDepartamento.filter((municipio) =>
                selectedMunicipios === null || selectedMunicipios.includes(municipioKey(municipio)),
              ).length;
              const todosSeleccionados = municipiosSeleccionados === nombresMunicipios.length;

              return (
                <div key={grupo.departamento}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#14203b', cursor: 'pointer', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      ref={(element) => {
                        if (element) element.indeterminate = municipiosSeleccionados > 0 && !todosSeleccionados;
                      }}
                      onChange={() => handleToggleDepartamento(grupo.departamento)}
                    />
                    <span>{grupo.departamento}</span>
                  </label>
                  <div style={{ margin: '5px 0 8px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {grupo.municipios.map((municipio) => (
                      <label key={municipioKey(municipio)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedMunicipios === null || selectedMunicipios.includes(municipioKey(municipio))}
                          onChange={() => handleToggleMunicipio(municipioKey(municipio))}
                        />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {municipio.municipio}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}