'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { 
  Users, 
  ChevronLeft, 
  BarChart2, 
  Table as TableIcon, 
  Loader2,
  Search,
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

type SortField = 'departamento' | 'municipio' | 'pop_2010' | 'pop_2022' | 'var_abs' | 'var_rel' | 'peso_relativo' | 'total_hogares' | 'personas_por_hogar';
type SortOrder = 'asc' | 'desc';
type MunicipioPoblacion = {
  municipio: string;
  departamento: string;
  pop_2010: number;
  pop_2022: number;
  var_abs: number;
  peso_relativo: number;
  var_rel: number;
  total_hogares: number;
};
type PoblacionData = {
  totalPoblacion: number;
  totalHogaresProv: number;
  promedioHogarProv: string;
  data: MunicipioPoblacion[];
};

const normalizeText = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

export default function PoblacionPage() {
  const [data, setData] = useState<PoblacionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  // Filtros de búsqueda y selección de municipios (arranca con todos seleccionados)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMunicipios, setSelectedMunicipios] = useState<string[]>([]);

  // Estados de ordenamiento exclusivos de la tabla
  const [sortField, setSortField] = useState<SortField>('pop_2022');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/poblacion'));
        const json = await res.json();
        setData(json);
        if (json?.data) {
          setSelectedMunicipios(json.data.map((m: MunicipioPoblacion) => m.municipio));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const municipiosData = useMemo(() => data?.data ?? [], [data]);

  const gruposDepartamentos = useMemo(() => {
    const grupos = new Map<string, { departamento: string; municipios: MunicipioPoblacion[] }>();
    for (const municipio of municipiosData) {
      const departamento = municipio.departamento || 'Sin departamento';
      if (!grupos.has(departamento)) grupos.set(departamento, { departamento, municipios: [] });
      grupos.get(departamento)?.municipios.push(municipio);
    }

    return Array.from(grupos.values())
      .sort((a, b) => a.departamento.localeCompare(b.departamento, 'es', { sensitivity: 'base' }))
      .map((grupo) => ({
        ...grupo,
        municipios: grupo.municipios.sort((a, b) => a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' })),
      }));
  }, [municipiosData]);

  const gruposFiltrados = useMemo(() => {
    const query = normalizeText(searchTerm);
    return gruposDepartamentos.map((grupo) => {
      if (!query || normalizeText(grupo.departamento).includes(query)) return grupo;
      return {
        ...grupo,
        municipios: grupo.municipios.filter((municipio) => normalizeText(municipio.municipio).includes(query)),
      };
    }).filter((grupo) => grupo.municipios.length > 0);
  }, [gruposDepartamentos, searchTerm]);

  // Manejo de selecciones individuales o grupales
  const handleToggleMunicipio = (nombre: string) => {
    setSelectedMunicipios((actuales) => actuales.includes(nombre)
      ? actuales.filter((municipio) => municipio !== nombre)
      : [...actuales, nombre]);
  };

  const handleToggleDepartamento = (departamento: string) => {
    const nombresMunicipios = municipiosData
      .filter((municipio) => (municipio.departamento || 'Sin departamento') === departamento)
      .map((municipio) => municipio.municipio);

    setSelectedMunicipios((actuales) => {
      const todosSeleccionados = nombresMunicipios.every((nombre) => actuales.includes(nombre));
      return todosSeleccionados
        ? actuales.filter((nombre) => !nombresMunicipios.includes(nombre))
        : Array.from(new Set([...actuales, ...nombresMunicipios]));
    });
  };

  const handleSelectAll = () => {
    setSelectedMunicipios((actuales) => actuales.length === municipiosData.length
      ? []
      : municipiosData.map((municipio) => municipio.municipio));
  };

  // Conjunto de datos base activo según selección del panel lateral
  const datosBaseActivos = useMemo<MunicipioPoblacion[]>(() => {
    if (loading) return municipiosData;
    return municipiosData.filter((municipio) => selectedMunicipios.includes(municipio.municipio));
  }, [municipiosData, selectedMunicipios, loading]);

  const totalesSeleccion = useMemo(() => {
    const poblacion = datosBaseActivos.reduce((total, municipio) => total + municipio.pop_2022, 0);
    const hogares = datosBaseActivos.reduce((total, municipio) => total + municipio.total_hogares, 0);
    const totalProvincia = Number(data?.totalPoblacion) || 0;
    return {
      poblacion,
      hogares,
      pesoRelativo: totalProvincia > 0 ? (poblacion / totalProvincia) * 100 : 0,
      personasPorHogar: hogares > 0 ? poblacion / hogares : 0,
      provinciaCompleta: selectedMunicipios.length === municipiosData.length && municipiosData.length > 0,
    };
  }, [data?.totalPoblacion, datosBaseActivos, municipiosData.length, selectedMunicipios.length]);

  // Datos fijos para el gráfico: preserva orden de mayor a menor según censo 2022
  const datosGrafico = useMemo(() => {
    return [...datosBaseActivos]
      .sort((a, b) => b.pop_2022 - a.pop_2022)
      .slice(0, 25);
  }, [datosBaseActivos]);

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
    if (!datosBaseActivos.length) return [];
    return [...datosBaseActivos].sort((a, b) => {
      if (sortField === 'municipio' || sortField === 'departamento') {
        const aVal = (a[sortField] || '').toLowerCase();
        const bVal = (b[sortField] || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (sortField === 'personas_por_hogar') {
        const aVal = a.pop_2022 / (a.total_hogares || 1);
        const bVal = b.pop_2022 / (b.total_hogares || 1);
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aVal = Number(a[sortField]) || 0;
      const bVal = Number(b[sortField]) || 0;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [datosBaseActivos, sortField, sortOrder]);

  return (
    <div className="container">
      {/* Header */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>POBLACIÓN EN VIVIENDAS PARTICULARES</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censo 2022 por Municipios
          </p>
        </div>
      </div>

      {/* Tarjetas KPI Superiores dinámicas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">
            {totalesSeleccion.provinciaCompleta ? 'Total Provincia de Corrientes' : 'Población seleccionada'}
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {data ? totalesSeleccion.poblacion.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {totalesSeleccion.provinciaCompleta ? 'Individuos' : 'Individuos en municipios seleccionados'}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">Peso Relativo sobre la Provincia</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {totalesSeleccion.pesoRelativo.toFixed(1).replace('.', ',')} %
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Participación en total provincial</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <span className="metricLabel">Promedio Personas por Hogar</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {data ? totalesSeleccion.personasPorHogar.toFixed(2).replace('.', ',') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {totalesSeleccion.provinciaCompleta ? 'Provincia de Corrientes' : `${totalesSeleccion.hogares.toLocaleString('es-AR')} hogares seleccionados`}
          </span>
        </div>
      </div>

      {/* Disposición con Sidebar Lateral de Filtro de Municipios */}
      <div className="population-layout">
        {/* Contenedor Principal (Gráfico o Tabla) */}
        <div className="card" style={{ margin: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Distribución por Municipio</span>
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
                <span>Calculando población por municipio...</span>
              </div>
            ) : viewMode === 'grafico' ? (
              <div style={{ width: '100%', height: 600 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={datosGrafico}
                    margin={{ top: 20, right: 95, left: 20, bottom: 35 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v) => Number(v).toLocaleString('es-AR')}
                      stroke="#94a3b8"
                      fontSize={11}
                      label={{
                        value: 'Población en Viviendas Particulares (Censo 2022)',
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
                      width={140}
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
                      formatter={(val) => [
                        `${Number(val).toLocaleString('es-AR')} habitantes`,
                        'Población 2022',
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
                    <Bar dataKey="pop_2022" fill="#047857" radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey="pop_2022"
                        position="right"
                        formatter={(value) => Number(value).toLocaleString('es-AR')}
                        fill="#334155"
                        fontSize={10}
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
                        onClick={() => handleSort('pop_2010')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>Pob. 2010</span>
                          {renderSortIcon('pop_2010')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('pop_2022')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>Pob. 2022</span>
                          {renderSortIcon('pop_2022')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('var_abs')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>Var. Absoluta</span>
                          {renderSortIcon('var_abs')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('var_rel')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>Var. Relativa</span>
                          {renderSortIcon('var_rel')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('peso_relativo')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>Peso %</span>
                          {renderSortIcon('peso_relativo')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('personas_por_hogar')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>Pers. / hogar</span>
                          {renderSortIcon('personas_por_hogar')}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('total_hogares')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>Hogares</span>
                          {renderSortIcon('total_hogares')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleTablaOrdenado.map((row, idx) => (
                      <tr
                        key={row.municipio || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{row.departamento}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.municipio}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>
                          {row.pop_2010.toLocaleString('es-AR')}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                          {row.pop_2022.toLocaleString('es-AR')}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: row.var_abs >= 0 ? '#047857' : '#b91c1c', fontWeight: 600 }}>
                          {row.var_abs >= 0 ? `+${row.var_abs.toLocaleString('es-AR')}` : row.var_abs.toLocaleString('es-AR')}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: row.var_rel >= 0 ? '#047857' : '#b91c1c', fontWeight: 600 }}>
                          {row.var_rel >= 0 ? `↗ ${row.var_rel.toFixed(1)}%` : `↘ ${row.var_rel.toFixed(1)}%`}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {row.peso_relativo.toFixed(2)} %
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {row.total_hogares > 0 ? (row.pop_2022 / row.total_hogares).toFixed(2).replace('.', ',') : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          {row.total_hogares.toLocaleString('es-AR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Panel Lateral: Departamentos / Municipios */}
        <div className="card population-filter-panel" style={{ margin: 0, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#14203b' }}>
              Departamentos / Municipios
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
              {selectedMunicipios.length}/{municipiosData.length}
            </span>
          </div>

          <div className="population-search">
            <Search className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar depto. o municipio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={selectedMunicipios.length === municipiosData.length && municipiosData.length > 0}
                onChange={handleSelectAll}
              />
              <span>Seleccionar todo</span>
            </label>
          </div>

          <div className="population-filter-list">
            {gruposFiltrados.map((grupo) => {
              const municipiosSeleccionados = grupo.municipios.filter((municipio) => selectedMunicipios.includes(municipio.municipio)).length;
              const nombresMunicipios = municipiosData
                .filter((municipio) => (municipio.departamento || 'Sin departamento') === grupo.departamento)
                .map((municipio) => municipio.municipio);
              const todosSeleccionados = nombresMunicipios.length > 0 && nombresMunicipios.every((nombre) => selectedMunicipios.includes(nombre));

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
                      <label key={municipio.municipio} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedMunicipios.includes(municipio.municipio)}
                          onChange={() => handleToggleMunicipio(municipio.municipio)}
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
        </div>
      </div>
    </div>
  );
}