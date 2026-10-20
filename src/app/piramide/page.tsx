'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Layers, Users, ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const ANIOS = ['1980', '1991', '2001', '2010', '2022'];

interface PiramideItem {
  grupo_edad: string;
  hombres: number;
  hombresGrafico: number;
  mujeres: number;
  total: number;
}

interface ApiResponse {
  year: string;
  totalGeneral: number;
  totalHombres: number;
  totalMujeres: number;
  pctHombres: string;
  pctMujeres: string;
  indiceMasculinidad: string;
  data: PiramideItem[];
}

export default function PiramidePage() {
  const [selectedYear, setSelectedYear] = useState('2022');
  const [loading, setLoading] = useState(true);
  const [piramideData, setPiramideData] = useState<ApiResponse | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/piramide?year=${selectedYear}`);
        if (!res.ok) throw new Error('Error al cargar datos');
        const data: ApiResponse = await res.json();
        setPiramideData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedYear]);

  // Formateador para el eje X y tooltips
  const formatNumero = (val: number) => Math.abs(val).toLocaleString('es-AR');

  return (
    <div className="container">
      {/* Botón de retorno y encabezado */}
      <div className="header" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" className="arrowLink" style={{ width: 28, height: 28 }}>
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="titleGroup">
          <h1>EVOLUCIÓN DE LA PIRÁMIDE POBLACIONAL</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Provincia de Corrientes — Censos 1980 a 2022
          </p>
        </div>
      </div>

      {/* Selector de Censo / Año */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: '#ffffff',
          padding: '10px 16px',
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14203b', marginRight: 8 }}>
          CENSO / AÑO:
        </span>
        {ANIOS.map((year) => {
          const isSelected = selectedYear === year;
          return (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              style={{
                border: '1px solid',
                borderColor: isSelected ? '#10b981' : '#cbd5e1',
                backgroundColor: isSelected ? '#14203b' : '#f8fafc',
                color: isSelected ? '#ffffff' : '#334155',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Censo {year}
            </button>
          );
        })}
      </div>

      {/* Métricas Resumen del Año Seleccionado */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginTop: 8,
        }}
      >
        <div className="card" style={{ padding: '12px 16px' }}>
          <span className="metricLabel">Población Total ({selectedYear})</span>
          <span className="metricVal" style={{ fontSize: '1.25rem', marginTop: 4 }}>
            {piramideData ? piramideData.totalGeneral.toLocaleString('es-AR') : '...'}
          </span>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <span className="metricLabel">Varones ({piramideData?.pctHombres || '0'} %)</span>
          <span className="metricVal" style={{ fontSize: '1.25rem', marginTop: 4, color: '#1e3a8a' }}>
            {piramideData ? piramideData.totalHombres.toLocaleString('es-AR') : '...'}
          </span>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <span className="metricLabel">Mujeres ({piramideData?.pctMujeres || '0'} %)</span>
          <span className="metricVal" style={{ fontSize: '1.25rem', marginTop: 4, color: '#047857' }}>
            {piramideData ? piramideData.totalMujeres.toLocaleString('es-AR') : '...'}
          </span>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <span className="metricLabel">Índice de Masculinidad</span>
          <span className="metricVal" style={{ fontSize: '1.25rem', marginTop: 4 }}>
            {piramideData ? piramideData.indiceMasculinidad : '...'}
          </span>
          <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Varones cada 100 mujeres</span>
        </div>
      </div>

      {/* Gráfico de la Pirámide */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="cardHeader">
          <div className="cardTitle">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Pirámide Poblacional — Censo {selectedYear}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Fuente: IPECD en base a censos históricos
          </span>
        </div>

        <div className="cardBody" style={{ minHeight: 520, padding: 20 }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                height: 480,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: '#64748b',
              }}
            >
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Cargando datos del censo {selectedYear}...</span>
            </div>
          ) : piramideData && piramideData.data.length > 0 ? (
            <div style={{ width: '100%', height: 500 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={piramideData.data}
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                  stackOffset="sign"
                >
                  <XAxis
                    type="number"
                    tickFormatter={formatNumero}
                    stroke="#94a3b8"
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="grupo_edad"
                    width={70}
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatNumero(Number(value)),
                      name === 'hombresGrafico' ? 'Varones' : 'Mujeres',
                    ]}
                    labelFormatter={(label) => `Grupo de edad: ${label}`}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: 8,
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="center"
                    height={36}
                    formatter={(val) => (val === 'hombresGrafico' ? 'Varones' : 'Mujeres')}
                  />
                  <ReferenceLine x={0} stroke="#64748b" strokeWidth={1} />
                  {/* Varones a la izquierda (valores negativos) */}
                  <Bar
                    dataKey="hombresGrafico"
                    name="hombresGrafico"
                    fill="#1e3a8a"
                    stackId="stack"
                    radius={[4, 0, 0, 4]}
                  />
                  {/* Mujeres a la derecha (valores positivos) */}
                  <Bar
                    dataKey="mujeres"
                    name="mujeres"
                    fill="#059669"
                    stackId="stack"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              No se encontraron registros para el censo seleccionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}