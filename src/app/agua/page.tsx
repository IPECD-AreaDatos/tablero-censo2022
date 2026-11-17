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

type TipoAgua = 'red_publica' | 'bomba_motor' | 'pozo_sin_bomba' | 'cisterna_acequia' | 'otra';
type SortField = 'departamento' | 'municipio' | 'total_viviendas' | 'valor_agua' | 'pct_agua';
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

type VisibleAguaTerritory = AguaTerritory & { locationKey: string };

const EMPTY_TERRITORIES: AguaTerritory[] = [];

export default function AguaPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<TipoAgua>('red_publica');
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla' | 'mapa'>('grafico');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);

  // Estados de ordenamiento exclusivos de la tabla
  const [sortField, setSortField] = useState<SortField>('valor_agua');
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
        (territory) => selectedLocations === null || selectedLocations.includes(territoryKey(territory)),
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
    return detalleFiltrado.map((territory) => ({
      ...territory,
      municipio: territory.municipio || territory.nombre || territory.departamento,
      locationKey: territoryKey(territory),
    }));
  }, [detalleFiltrado]);

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
    const norm = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
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

  // Cálculos dinámicos de las 4 tarjetas KPI superiores según selección territorial
  const seleccionCompleta = selectedLocations === null || selectedLocations.length === detalleOriginal.length;

  const kpisDinamicos = useMemo(() => {
    const totalViviendas = detalleFiltrado.reduce((acc, t) => acc + t.total_viviendas, 0);
    const sumRed = detalleFiltrado.reduce((acc, t) => acc + t.red_publica, 0);
    const sumMotor = detalleFiltrado.reduce((acc, t) => acc + t.bomba_motor, 0);
    const sumPozo = detalleFiltrado.reduce((acc, t) => acc + t.pozo_sin_bomba, 0);

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

  // Datos fijos para el gráfico: ordenados de mayor a menor por el tipo de agua seleccionado
  const datosGrafico = useMemo(() => {
    if (!territoriosVisibles.length) return [];
    return [...territoriosVisibles]
      .sort((a, b) => (Number(b[selectedTipo]) || 0) - (Number(a[selectedTipo]) || 0))
      .slice(0, 25);
  }, [territoriosVisibles, selectedTipo]);

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

      let aVal = 0;
      let bVal = 0;

      if (sortField === 'total_viviendas') {
        aVal = Number(a.total_viviendas) || 0;
        bVal = Number(b.total_viviendas) || 0;
      } else if (sortField === 'valor_agua') {
        aVal = Number(a[selectedTipo]) || 0;
        bVal = Number(b[selectedTipo]) || 0;
      } else if (sortField === 'pct_agua') {
        aVal = parseFloat(String(a[`pct_${selectedTipo}`] || '0').replace(',', '.')) || 0;
        bVal = parseFloat(String(b[`pct_${selectedTipo}`] || '0').replace(',', '.')) || 0;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [territoriosVisibles, sortField, sortOrder, selectedTipo]);

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
          <span className="metricLabel">
            {seleccionCompleta ? 'Total Viviendas Evaluadas' : 'Viviendas Seleccionadas'}
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {data ? kpisDinamicos.totalViviendas.toLocaleString('es-AR') : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {seleccionCompleta ? 'Total Provincial Calculado' : 'Territorios seleccionados'}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">Por Red Pública</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {data ? kpisDinamicos.pctRedPublica : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {data ? `${kpisDinamicos.sumRedPublica.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <span className="metricLabel">Bomba a Motor o Manual</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#1d4ed8' }}>
            {data ? kpisDinamicos.pctBombaMotor : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {data ? `${kpisDinamicos.sumBombaMotor.toLocaleString('es-AR')} viviendas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #d97706' }}>
          <span className="metricLabel">Pozo sin Bomba</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#b45309' }}>
            {data ? kpisDinamicos.pctPozo : '...'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
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
        {(['red_publica', 'bomba_motor', 'pozo_sin_bomba', 'cisterna_acequia', 'otra'] as TipoAgua[]).map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTipo(t)}
            style={{
              border: '1px solid',
              borderColor: selectedTipo === t ? '#10b981' : '#cbd5e1',
              backgroundColor: selectedTipo === t ? '#1b2d57' : '#f8fafc',
              color: selectedTipo === t ? '#ffffff' : '#334155',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: selectedTipo === t ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {labelsAgua[t].split(' (')[0]}
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
                Distribución de {labelsAgua[selectedTipo]} por {viewMode === 'mapa' ? 'departamento' : 'municipio'}
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
                        value: 'Cantidad de Viviendas Particulares',
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
                        `${Number(val).toLocaleString('es-AR')} viviendas`,
                        labelsAgua[selectedTipo],
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
                      dataKey={selectedTipo}
                      fill={getColorAgua(selectedTipo)}
                      radius={[0, 4, 4, 0]}
                    >
                      <LabelList
                        dataKey={selectedTipo}
                        position="right"
                        formatter={(val: any) => Number(val).toLocaleString('es-AR')}
                        style={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
                          <span>Total Viviendas</span>
                          {renderSortIcon('total_viviendas')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('valor_agua')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>{labelsAgua[selectedTipo].split(' (')[0]}</span>
                          {renderSortIcon('valor_agua')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('pct_agua')}
                        style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#ffffff', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          <span>% Incidencia</span>
                          {renderSortIcon('pct_agua')}
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
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: getColorAgua(selectedTipo) }}>
                          {row[selectedTipo].toLocaleString('es-AR')}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                          {row[`pct_${selectedTipo}`] || '0'} %
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