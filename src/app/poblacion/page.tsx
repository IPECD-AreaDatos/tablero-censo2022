'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiPath } from '@/lib/api';
import { 
  Users, 
  ChevronLeft, 
  Search, 
  BarChart2, 
  Table as TableIcon, 
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface MunicipioData {
  municipio: string;
  pop_2010: number;
  pop_2022: number;
  var_abs: number;
  peso_relativo: number;
  var_rel: number;
}

export default function PoblacionPage() {
  const [municipios, setMunicipios] = useState<MunicipioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMunicipios, setSelectedMunicipios] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grafico' | 'tabla'>('grafico');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(apiPath('/api/poblacion'));
        const json = await res.json();
        setMunicipios(json.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtrado de búsqueda en la lista
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return municipios;
    return municipios.filter((m) =>
      m.municipio.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [municipios, searchTerm]);

  // Manejo de selecciones
  const toggleMunicipio = (nombre: string) => {
    setSelectedMunicipios((prev) =>
      prev.includes(nombre) ? prev.filter((m) => m !== nombre) : [...prev, nombre]
    );
  };

  const handleSelectAll = () => {
    if (selectedMunicipios.length === filteredList.length) {
      setSelectedMunicipios([]);
    } else {
      setSelectedMunicipios(filteredList.map((m) => m.municipio));
    }
  };

  // Datos activos a graficar/tabular (si no hay ninguno marcado, se toman los filtrados o top)
  const activeData = useMemo(() => {
    if (selectedMunicipios.length > 0) {
      return municipios.filter((m) => selectedMunicipios.includes(m.municipio));
    }
    return filteredList;
  }, [municipios, selectedMunicipios, filteredList]);

  // KPIs dinámicos calculados
  const totalPoblacionProv = 1209671;
  const poblacionSeleccionada = useMemo(() => {
    return activeData.reduce((acc, curr) => acc + curr.pop_2022, 0);
  }, [activeData]);

  const pesoRelativoCalc = ((poblacionSeleccionada / totalPoblacionProv) * 100).toFixed(1).replace('.', ',');

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

      {/* KPIs superiores estilo Power BI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">
            {selectedMunicipios.length > 0 ? `Población Seleccionada (${selectedMunicipios.length})` : 'Total Provincia de Corrientes'}
          </span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            {poblacionSeleccionada.toLocaleString('es-AR')}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Individuos</span>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">Peso Relativo sobre la Provincia</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4, color: '#047857' }}>
            {pesoRelativoCalc} %
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Participación en total provincial</span>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <span className="metricLabel">Promedio Personas por Hogar</span>
          <span className="metricVal" style={{ fontSize: '1.4rem', marginTop: 4 }}>
            3,19
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Provincia de Corrientes</span>
        </div>
      </div>

      {/* Grid Principal: Contenido a la izquierda + Panel de Municipios a la derecha */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginTop: 12, alignItems: 'start' }}>
        
        {/* Contenido Visual (Gráfico o Tabla) */}
        <div className="card">
          <div className="cardHeader">
            <div className="cardTitle">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Distribución por Municipio</span>
            </div>
            
            {/* Toggle Tabla / Gráfico */}
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
                <span>Cargando municipios...</span>
              </div>
            ) : viewMode === 'grafico' ? (
              <div style={{ width: '100%', height: Math.max(480, Math.min(activeData.length * 28, 900)) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={activeData.slice(0, 25)} // Muestra los top 25 para legibilidad
                    margin={{ top: 10, right: 30, left: 40, bottom: 20 }}
                  >
                    <XAxis
                      type="number"
                      tickFormatter={(v) => Number(v).toLocaleString('es-AR')}
                      stroke="#94a3b8"
                      fontSize={11}
                    />
                    <YAxis
                      type="category"
                      dataKey="municipio"
                      width={140}
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => [Number(val).toLocaleString('es-AR') + ' habitantes', 'Población 2022']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: 8,
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                      }}
                    />
                    <Bar dataKey="pop_2022" fill="#047857" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '8px 10px' }}>Municipio</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Pob. 2010</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Pob. 2022</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Var. Absoluta</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Var. Relativa</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Peso %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.map((row, idx) => (
                      <tr 
                        key={idx} 
                        style={{ 
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' 
                        }}
                      >
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{row.municipio}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{row.pop_2010.toLocaleString('es-AR')}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{row.pop_2022.toLocaleString('es-AR')}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <span style={{ color: row.var_abs >= 0 ? '#16a34a' : '#dc2626' }}>
                            {row.var_abs >= 0 ? `+${row.var_abs.toLocaleString('es-AR')}` : row.var_abs.toLocaleString('es-AR')}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: row.var_rel >= 0 ? '#16a34a' : '#dc2626' }}>
                            {row.var_rel >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {row.var_rel.toFixed(1).replace('.', ',')} %
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                          {row.peso_relativo.toFixed(2).replace('.', ',')} %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Panel Lateral: Selector de Municipios */}
        <div className="card" style={{ position: 'sticky', top: 20 }}>
          <div className="cardHeader">
            <span className="cardTitle" style={{ fontSize: '0.82rem' }}>Departamentos / Municipios</span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              {selectedMunicipios.length}/{filteredList.length}
            </span>
          </div>

          <div style={{ padding: '12px' }}>
            {/* Buscador de municipio */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '6px 10px',
                marginBottom: 10,
              }}
            >
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar municipio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '0.78rem',
                  width: '100%',
                }}
              />
            </div>

            {/* Checkbox Seleccionar todo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', marginBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
              <input
                type="checkbox"
                id="select-all"
                checked={selectedMunicipios.length === filteredList.length && filteredList.length > 0}
                onChange={handleSelectAll}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="select-all" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                Seleccionar todo
              </label>
            </div>

            {/* Lista scrollable de municipios */}
            <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredList.map((m) => {
                const isChecked = selectedMunicipios.includes(m.municipio);
                return (
                  <label
                    key={m.municipio}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 8px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      backgroundColor: isChecked ? '#e2e8f0' : 'transparent',
                      color: isChecked ? '#0f172a' : '#475569',
                      fontWeight: isChecked ? 600 : 400,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleMunicipio(m.municipio)}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.municipio}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
