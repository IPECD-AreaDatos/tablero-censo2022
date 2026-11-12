'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { 
  GraduationCap, 
  ChevronLeft, 
  BarChart2, 
  Table as TableIcon, 
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
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

type NivelEducativo = 'secundaria_incompleta' | 'secundaria_completa' | 'superior_completo';
type SortField = 'departamento' | 'municipio' | 'poblacion_2022' | 'valor' | 'porcentaje';
type SortOrder = 'asc' | 'desc';
type TerritorioEducacion = {
  departamento: string;
  municipio: string;
  poblacion_2022: number;
  secundaria_incompleta: number;
  secundaria_completa: number;
  superior_completo: number;
  pct_secundaria_incompleta: number;
  pct_secundaria_completa: number;
  pct_superior_completo: number;
};
type EducacionData = {
  totalMayores25: number;
  comparativa: Record<'provincia' | 'pais' | 'nea', Record<NivelEducativo, number | null>>;
  territorios: TerritorioEducacion[];
};

const nivelesEducativos: { key: NivelEducativo; label: string }[] = [
  { key: 'secundaria_incompleta', label: 'Secundaria incompleta' },
  { key: 'secundaria_completa', label: 'Secundaria completa' },
  { key: 'superior_completo', label: 'Superior / universitario completo' },
];
const EMPTY_TERRITORIOS: TerritorioEducacion[] = [];

type TerritorioVisible = TerritorioEducacion & { nombre: string; locationKey: string; valor: number; porcentaje: number };

const valorNivel = (departamento: TerritorioEducacion, nivel: NivelEducativo) => departamento[nivel];
const porcentajeNivel = (departamento: TerritorioEducacion, nivel: NivelEducativo) => departamento[`pct_${nivel}`];
const formatPct = (value: number | null | undefined) => value === null || value === undefined
  ? '—'
  : `${(value * 100).toFixed(1).replace('.', ',')} %`;

export default function EducacionPage() {
  const [data, setData] = useState<EducacionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');
  const [scope, setScope] = useState<'departamento' | 'municipio'>('departamento');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);
  const [selectedNivel, setSelectedNivel] = useState<NivelEducativo>('secundaria_completa');
  const [sortField, setSortField] = useState<SortField>('porcentaje');
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
    () => territoriosBase.filter((territorio) => selectedLocations === null || selectedLocations.includes(territoryKey(territorio))),
    [territoriosBase, selectedLocations],
  );
  const deptosOriginal = useMemo(() => {
    if (scope === 'municipio') {
      return territoriosFiltrados.map((territorio) => ({
        ...territorio,
        nombre: territorio.municipio,
        locationKey: territoryKey(territorio),
      }));
    }

    const grouped = new Map<string, TerritorioVisible>();
    for (const territorio of territoriosFiltrados) {
      const current = grouped.get(territorio.departamento) || {
        departamento: territorio.departamento,
        municipio: '',
        nombre: territorio.departamento,
        locationKey: territorio.departamento,
        poblacion_2022: 0,
        secundaria_incompleta: 0,
        secundaria_completa: 0,
        superior_completo: 0,
        pct_secundaria_incompleta: 0,
        pct_secundaria_completa: 0,
        pct_superior_completo: 0,
        valor: 0,
        porcentaje: 0,
      };
      current.poblacion_2022 += territorio.poblacion_2022;
      current.secundaria_incompleta += territorio.secundaria_incompleta;
      current.secundaria_completa += territorio.secundaria_completa;
      current.superior_completo += territorio.superior_completo;
      grouped.set(territorio.departamento, current);
    }
    return Array.from(grouped.values()).map((territorio) => ({
      ...territorio,
      locationKey: territorio.departamento,
      pct_secundaria_incompleta: territorio.poblacion_2022 > 0 ? (territorio.secundaria_incompleta / territorio.poblacion_2022) * 100 : 0,
      pct_secundaria_completa: territorio.poblacion_2022 > 0 ? (territorio.secundaria_completa / territorio.poblacion_2022) * 100 : 0,
      pct_superior_completo: territorio.poblacion_2022 > 0 ? (territorio.superior_completo / territorio.poblacion_2022) * 100 : 0,
    }));
  }, [territoriosFiltrados, scope]);
  const nivelSeleccionado = nivelesEducativos.find((nivel) => nivel.key === selectedNivel) || nivelesEducativos[1];
  const totalSeleccionado = territoriosFiltrados.reduce((total, territorio) => total + territorio.poblacion_2022, 0);
  const totalNivelSeleccionado = territoriosFiltrados.reduce((total, territorio) => total + valorNivel(territorio, selectedNivel), 0);
  const porcentajeProvinciaSeleccion = totalSeleccionado > 0 ? totalNivelSeleccionado / totalSeleccionado : null;
  const seleccionCompleta = selectedLocations === null || selectedLocations.length === territoriosBase.length;

  const datosGrafico = useMemo(() => {
    return [...deptosOriginal]
      .map((departamento) => ({
        ...departamento,
        valor: valorNivel(departamento, selectedNivel),
        porcentaje: porcentajeNivel(departamento, selectedNivel),
      }))
      .sort((a, b) => b.porcentaje - a.porcentaje)
      .slice(0, 25);
  }, [deptosOriginal, selectedNivel]);

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
  const deptosTablaOrdenados = useMemo(() => {
    if (!deptosOriginal.length) return [];
    return deptosOriginal.map((departamento) => ({
      ...departamento,
      valor: valorNivel(departamento, selectedNivel),
      porcentaje: porcentajeNivel(departamento, selectedNivel),
    })).sort((a, b) => {
      if (sortField === 'departamento' || sortField === 'municipio') {
        const aVal = (a[sortField] || '').toLowerCase();
        const bVal = (b[sortField] || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const aVal = sortField === 'valor' ? a.valor : sortField === 'porcentaje' ? a.porcentaje : a.poblacion_2022;
      const bVal = sortField === 'valor' ? b.valor : sortField === 'porcentaje' ? b.porcentaje : b.poblacion_2022;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [deptosOriginal, sortField, sortOrder, selectedNivel]);

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">{seleccionCompleta ? 'Total Mayores de 25 Años' : 'Mayores de 25 seleccionados'}</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {data ? totalSeleccionado.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Censo 2022 · población de 25 años y más</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">% {nivelSeleccionado.label} ({seleccionCompleta ? 'Provincia' : 'Selección'})</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {seleccionCompleta ? formatPct(data?.comparativa.provincia?.[selectedNivel]) : formatPct(porcentajeProvinciaSeleccion)}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{seleccionCompleta ? 'Corrientes' : 'Territorios seleccionados'}</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <span className="metricLabel">% {nivelSeleccionado.label} (País)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {formatPct(data?.comparativa.pais?.[selectedNivel])}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Nacional</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <span className="metricLabel">% {nivelSeleccionado.label} (NEA)</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b45309' }}>
            {formatPct(data?.comparativa.nea?.[selectedNivel])}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Región NEA</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: '#ffffff', padding: '10px 16px', borderRadius: 12, border: '1px solid #cbd5e1', marginTop: 12 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14203b', marginRight: 8 }}>NIVEL A VISUALIZAR:</span>
        {nivelesEducativos.map((nivel) => (
          <button
            key={nivel.key}
            onClick={() => setSelectedNivel(nivel.key)}
            aria-pressed={selectedNivel === nivel.key}
            style={{ border: '1px solid', borderColor: selectedNivel === nivel.key ? '#10b981' : '#cbd5e1', backgroundColor: selectedNivel === nivel.key ? '#14203b' : '#f8fafc', color: selectedNivel === nivel.key ? '#ffffff' : '#334155', padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: selectedNivel === nivel.key ? 700 : 500, cursor: 'pointer' }}
          >
            {nivel.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Ver por</span>
        <div style={{ display: 'inline-flex', gap: 4, padding: 3, borderRadius: 8, background: '#f1f5f9' }}>
          {(['departamento', 'municipio'] as const).map((nivel) => (
            <button
              key={nivel}
              onClick={() => setScope(nivel)}
              aria-pressed={scope === nivel}
              style={{ border: 0, borderRadius: 6, padding: '7px 12px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', background: scope === nivel ? '#14203b' : 'transparent', color: scope === nivel ? '#fff' : '#475569' }}
            >
              {nivel}
            </button>
          ))}
        </div>
      </div>

      <div className="population-layout">
      <div className="card" style={{ margin: 0 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>{nivelSeleccionado.label} en mayores de 25 por {scope}{scope === 'municipio' ? ' · hasta 25 principales' : ''}</span>
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
              <span>Calculando indicadores educativos...</span>
            </div>
          ) : viewMode === 'grafico' ? (
            <div style={{ width: '100%', height: 620 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={datosGrafico}
                  margin={{ top: 20, right: 55, left: 18, bottom: 35 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    stroke="#94a3b8"
                    fontSize={11}
                    label={{
                      value: 'Población de 25 años y más con el nivel seleccionado (%)',
                      position: 'insideBottom',
                      offset: -18,
                      fill: '#64748b',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={185}
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    label={{
                      value: scope === 'departamento' ? 'Departamento' : 'Municipio',
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
                    formatter={(value) => [`${Number(value).toFixed(1).replace('.', ',')} %`, nivelSeleccionado.label]}
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
                  <Bar dataKey="porcentaje" fill="#047857" radius={[0, 4, 4, 0]}>
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
          ) : (
            <div
              style={{
                maxHeight: '480px',
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
                      onClick={() => handleSort(scope)}
                      style={{ padding: '10px 12px', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span>{scope === 'departamento' ? 'Departamento' : 'Municipio'}</span>
                        {renderSortIcon(scope)}
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
                    <th 
                      onClick={() => handleSort('valor')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>{nivelSeleccionado.label}</span>
                        {renderSortIcon('valor')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('porcentaje')}
                      style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                        <span>% del grupo 25+</span>
                        {renderSortIcon('porcentaje')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deptosTablaOrdenados.map((row, idx: number) => (
                    <tr
                      key={row.locationKey || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.nombre}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.poblacion_2022.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>{row.valor.toLocaleString('es-AR')}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{row.porcentaje.toFixed(1).replace('.', ',')} %</td>
                    </tr>
                  ))}
                </tbody>
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