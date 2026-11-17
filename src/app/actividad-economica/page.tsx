'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiPath } from '@/lib/api';
import Link from 'next/link';
import { BarChart2, Building2, ChevronLeft, Loader2, Search, Table as TableIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ActivitySector = { key: string; sector: string; valor: number; pct: string };
type ActivityTerritory = {
  departamento: string;
  municipio: string;
  total: number;
  [key: string]: number | string;
};
type DisplayTerritory = ActivityTerritory & { nombre: string; locationKey: string };
type ActivityResponse = {
  totalPoblacion: number;
  principalSector: ActivitySector | null;
  pctComercioIndustria: string;
  sectores: ActivitySector[];
  territorios: ActivityTerritory[];
};

const EMPTY_SECTORS: ActivitySector[] = [];
const EMPTY_TERRITORIES: ActivityTerritory[] = [];
const locationKey = (territory: ActivityTerritory) => `${territory.departamento}::${territory.municipio}`;
const normalizeText = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

export default function ActividadEconomicaPage() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');
  const [selectedLocations, setSelectedLocations] = useState<string[] | null>(null);
  const [searchLocation, setSearchLocation] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const response = await fetch(apiPath('/api/actividad-economica'));
        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sectores = data?.sectores ?? EMPTY_SECTORS;
  const territoriosBase = data?.territorios ?? EMPTY_TERRITORIES;

  const gruposDepartamentos = useMemo(() => {
    const grupos = new Map<string, { departamento: string; municipios: ActivityTerritory[] }>();
    for (const territorio of territoriosBase) {
      const departamento = territorio.departamento || 'Sin departamento';
      if (!grupos.has(departamento)) grupos.set(departamento, { departamento, municipios: [] });
      grupos.get(departamento)?.municipios.push(territorio);
    }
    return Array.from(grupos.values())
      .sort((a, b) => a.departamento.localeCompare(b.departamento, 'es', { sensitivity: 'base' }))
      .map((grupo) => ({
        ...grupo,
        municipios: grupo.municipios.sort((a, b) => a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' })),
      }));
  }, [territoriosBase]);

  const gruposFiltrados = useMemo(() => {
    const query = normalizeText(searchLocation);
    return gruposDepartamentos.map((grupo) => {
      if (!query || normalizeText(grupo.departamento).includes(query)) return grupo;
      return {
        ...grupo,
        municipios: grupo.municipios.filter((municipio) => normalizeText(municipio.municipio).includes(query)),
      };
    }).filter((grupo) => grupo.municipios.length > 0);
  }, [gruposDepartamentos, searchLocation]);

  const territoriosBaseSeleccionados = useMemo(() => {
    if (selectedLocations === null) return territoriosBase;
    return territoriosBase.filter((territorio) => selectedLocations.includes(locationKey(territorio)));
  }, [territoriosBase, selectedLocations]);

  const territoriosSeleccionados = useMemo(() => {
    return territoriosBaseSeleccionados
      .map((row: ActivityTerritory): DisplayTerritory => ({
        ...row,
        nombre: row.municipio || row.departamento,
        locationKey: locationKey(row),
      }))
      .sort((a: DisplayTerritory, b: DisplayTerritory) => (Number(b.total) || 0) - (Number(a.total) || 0));
  }, [territoriosBaseSeleccionados]);

  const totalPoblacion = territoriosSeleccionados.reduce(
    (total: number, row: DisplayTerritory) => total + (Number(row.total) || 0),
    0,
  );
  const datosGrafico = useMemo(() => sectores.map((sector) => ({
    ...sector,
    valor: territoriosSeleccionados.reduce(
      (total: number, row: DisplayTerritory) => total + (Number(row[sector.key]) || 0),
      0,
    ),
  })).sort((a, b) => b.valor - a.valor), [sectores, territoriosSeleccionados]);
  const principalSector = datosGrafico[0];
  const comercioIndustria = datosGrafico
    .filter((sector) => sector.key === 'comercio' || sector.key === 'industria')
    .reduce((total, sector) => total + sector.valor, 0);
  const pctComercioIndustria = totalPoblacion > 0
    ? ((comercioIndustria / totalPoblacion) * 100).toFixed(1).replace('.', ',')
    : '0,0';

  const seleccionarTodas = () => setSelectedLocations(null);
  const limpiarSeleccion = () => setSelectedLocations([]);
  const cambiarSeleccion = (key: string, seleccionado: boolean) => {
    setSelectedLocations((actuales) => {
      const actualesSet = new Set(actuales ?? territoriosBase.map(locationKey));
      if (seleccionado) actualesSet.add(key);
      else actualesSet.delete(key);
      return Array.from(actualesSet);
    });
  };
  const cambiarDepartamento = (departamento: string) => {
    const keys = territoriosBase
      .filter((territorio) => (territorio.departamento || 'Sin departamento') === departamento)
      .map(locationKey);
    setSelectedLocations((actuales) => {
      const actualesSet = new Set(actuales ?? territoriosBase.map(locationKey));
      const todosSeleccionados = keys.every((key) => actualesSet.has(key));
      for (const key of keys) {
        if (todosSeleccionados) actualesSet.delete(key);
        else actualesSet.add(key);
      }
      return Array.from(actualesSet);
    });
  };

  return (
    <div className="container">
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>RAMA DE ACTIVIDAD ECONÓMICA DE LA POBLACIÓN OCUPADA</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Provincia de Corrientes — Censo 2022</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">Población Ocupada Total Relevada</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {totalPoblacion ? totalPoblacion.toLocaleString('es-AR') : loading ? '...' : '0'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Según territorios seleccionados</span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
          <span className="metricLabel">Principal Rama de Empleo</span>
          <span className="metricVal" style={{ fontSize: '1.25rem', marginTop: 4, color: '#1d4ed8' }}>
            {principalSector?.sector || (loading ? '...' : 'Sin datos')}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {principalSector ? `${principalSector.valor.toLocaleString('es-AR')} personas` : ''}
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #059669' }}>
          <span className="metricLabel">Comercio e Industria Combinados</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {pctComercioIndustria} %
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Participación en la selección</span>
        </div>
      </div>

      <div className="population-layout">
        <div className="card" style={{ margin: 0 }}>
          <div className="cardHeader">
            <div className="cardTitle">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Distribución de Ocupados por Rama Económica</span>
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.08)', padding: 3, borderRadius: 8 }}>
              <button
                onClick={() => setViewMode('grafico')}
                aria-pressed={viewMode === 'grafico'}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', backgroundColor: viewMode === 'grafico' ? '#10b981' : 'transparent', color: '#ffffff' }}
              >
                <BarChart2 className="w-3.5 h-3.5" /> Gráfico
              </button>
              <button
                onClick={() => setViewMode('tabla')}
                aria-pressed={viewMode === 'tabla'}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', backgroundColor: viewMode === 'tabla' ? '#10b981' : 'transparent', color: '#ffffff' }}
              >
                <TableIcon className="w-3.5 h-3.5" /> Tabla
              </button>
            </div>
          </div>

          <div className="cardBody" style={{ minHeight: 520, padding: 18 }}>
            {loading ? (
              <div style={{ display: 'flex', height: 450, alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b' }}>
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                <span>Calculando actividad económica...</span>
              </div>
            ) : viewMode === 'grafico' ? (
              <div style={{ width: '100%', height: 600 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={datosGrafico} margin={{ top: 20, right: 80, left: 20, bottom: 35 }}>
                    <XAxis
                      type="number"
                      domain={[0, 'dataMax * 1.18']}
                      tickFormatter={(value) => Number(value).toLocaleString('es-AR')}
                      stroke="#94a3b8"
                      fontSize={11}
                      label={{ value: 'Población Ocupada (cantidad de personas)', position: 'insideBottom', offset: -18, fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="sector"
                      width={235}
                      stroke="#475569"
                      fontSize={10}
                      tickLine={false}
                      label={{ value: 'Rama de Actividad Económica', angle: -90, position: 'insideLeft', offset: -10, fill: '#64748b', fontSize: 12, fontWeight: 600, style: { textAnchor: 'middle' } }}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toLocaleString('es-AR')} ocupados`, 'Población']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #334155', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', padding: '8px 12px' }}
                      labelStyle={{ color: '#ffffff', fontWeight: 600, marginBottom: 4, fontSize: '0.8rem' }}
                      itemStyle={{ color: '#34d399', fontWeight: 700, fontSize: '0.82rem' }}
                    />
                    <Bar dataKey="valor" fill="#14203b" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="valor" position="right" formatter={(value) => Number(value ?? 0).toLocaleString('es-AR')} fill="#14203b" fontSize={10} fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ maxHeight: 520, overflow: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <table style={{ minWidth: 1650, width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.76rem' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 3, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                    <tr style={{ color: '#475569', textAlign: 'right' }}>
                      <th style={{ position: 'sticky', left: 0, zIndex: 4, minWidth: 160, padding: '11px 12px', background: '#fff', textAlign: 'left', borderRight: '1px solid #f1f5f9' }}>Departamento</th>
                      <th style={{ position: 'sticky', left: 160, zIndex: 4, minWidth: 190, padding: '11px 12px', background: '#fff', textAlign: 'left', boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)' }}>Municipio</th>
                      {sectores.map((sector: ActivitySector) => (
                        <th key={sector.key} style={{ minWidth: 118, maxWidth: 170, padding: '11px 9px', background: '#fff', verticalAlign: 'bottom' }}>{sector.sector}</th>
                      ))}
                      <th style={{ minWidth: 110, padding: '11px 12px', background: '#fff' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {territoriosSeleccionados.length ? territoriosSeleccionados.map((row: DisplayTerritory, index: number) => {
                      const rowBg = index % 2 === 0 ? '#fff' : '#f8fafc';
                      return (
                        <tr key={row.locationKey} style={{ background: rowBg, color: '#14203b' }}>
                          <td style={{ position: 'sticky', left: 0, zIndex: 1, padding: '9px 12px', borderTop: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', background: rowBg, textAlign: 'left', whiteSpace: 'nowrap', color: '#64748b', fontWeight: 500 }}>{row.departamento}</td>
                          <th scope="row" style={{ position: 'sticky', left: 160, zIndex: 1, padding: '9px 12px', borderTop: '1px solid #f1f5f9', background: rowBg, textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 600, boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)' }}>{row.municipio}</th>
                          {sectores.map((sector: ActivitySector) => (
                            <td key={sector.key} style={{ padding: '9px', borderTop: '1px solid #f1f5f9', textAlign: 'right', whiteSpace: 'nowrap' }}>{(Number(row[sector.key]) || 0).toLocaleString('es-AR')}</td>
                          ))}
                          <td style={{ padding: '9px 12px', borderTop: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 700 }}>{(Number(row.total) || 0).toLocaleString('es-AR')}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={sectores.length + 3} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Seleccioná al menos un territorio para ver los datos.</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ position: 'sticky', bottom: 0, zIndex: 2, background: '#eaf2f8', color: '#14203b', fontWeight: 800 }}>
                      <th colSpan={2} style={{ position: 'sticky', left: 0, zIndex: 3, padding: '10px 12px', background: '#eaf2f8', textAlign: 'left', boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)' }}>Total seleccionado</th>
                      {sectores.map((sector: ActivitySector) => {
                        const totalSector = territoriosSeleccionados.reduce((total: number, row: DisplayTerritory) => total + (Number(row[sector.key]) || 0), 0);
                        return <td key={sector.key} style={{ padding: '10px 9px', textAlign: 'right', whiteSpace: 'nowrap' }}>{totalSector.toLocaleString('es-AR')}</td>;
                      })}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{totalPoblacion.toLocaleString('es-AR')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
        <aside className="card population-filter-panel" style={{ margin: 0, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#14203b' }}>Departamentos / Municipios</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
              {selectedLocations === null ? territoriosBase.length : selectedLocations.length}/{territoriosBase.length}
            </span>
          </div>

          <div className="population-search">
            <Search className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar depto. o municipio..."
              value={searchLocation}
              onChange={(event) => setSearchLocation(event.target.value)}
            />
          </div>

          <div style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={selectedLocations === null || selectedLocations.length === territoriosBase.length}
                onChange={(event) => event.target.checked ? seleccionarTodas() : limpiarSeleccion()}
              />
              <span>Seleccionar todo</span>
            </label>
          </div>

          <div className="population-filter-list">
            {gruposFiltrados.map((grupo) => {
              const keysMunicipio = grupo.municipios.map(locationKey);
              const seleccionados = keysMunicipio.filter((key) => selectedLocations === null || selectedLocations.includes(key)).length;
              const todosSeleccionados = seleccionados === keysMunicipio.length;

              return (
                <div key={grupo.departamento}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#14203b', cursor: 'pointer', fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      ref={(element) => {
                        if (element) element.indeterminate = seleccionados > 0 && !todosSeleccionados;
                      }}
                      onChange={() => cambiarDepartamento(grupo.departamento)}
                    />
                    <span>{grupo.departamento}</span>
                  </label>
                  <div style={{ margin: '5px 0 8px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {grupo.municipios.map((municipio) => {
                      const key = locationKey(municipio);
                      return (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedLocations === null || selectedLocations.includes(key)}
                            onChange={(event) => cambiarSeleccion(key, event.target.checked)}
                          />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{municipio.municipio}</span>
                        </label>
                      );
                    })}
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