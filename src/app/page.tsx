import { query } from '@/lib/db';
import MetricCard from '@/components/MetricCard';
import Link from 'next/link';
import { ArrowRight, Users, Home } from 'lucide-react';


async function getTotales() {
  try {
    // Si la tabla base_poblacion_viviendas existe en tu DWH:
    const rows = await query(`
      SELECT 
        SUM(poblacion)::bigint as total_poblacion,
        SUM(hogares)::bigint as total_hogares
      FROM base_poblacion_viviendas
    `);
    
    if (rows.length > 0 && rows[0].total_poblacion) {
      const pop = Number(rows[0].total_poblacion);
      const hog = Number(rows[0].total_hogares);
      return {
        poblacion: pop.toLocaleString('es-AR'),
        hogares: hog.toLocaleString('es-AR'),
        promedio: (pop / (hog || 1)).toFixed(2).replace('.', ',')
      };
    }
  } catch (error) {
    console.error('Error consultando base de datos:', error);
  }

  // Valores de respaldo exactos del Censo Corrientes 2022
  return {
    poblacion: '1.209.671',
    hogares: '379.129',
    promedio: '3,19'
  };
}

export default async function HomePage() {
  const data = await getTotales();

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Título de portada */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900">
          Tablero Censo 2022 — Provincia de Corrientes
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Instituto Provincial de Estadística y Ciencia de Datos (IPECD)
        </p>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <MetricCard
          title="Población en Viviendas Particulares"
          value={data.poblacion}
          subtitle="Individuos relevados"
          badge="Provincial"
        />
        <MetricCard
          title="Cantidad de Hogares"
          value={data.hogares}
          subtitle="Hogares censados"
          badge="Provincial"
        />
        <MetricCard
          title="Promedio Individuos por Hogar"
          value={data.promedio}
          subtitle="Personas / Hogar"
        />
      </div>

      {/* Accesos rápidos divididos como en el tablero original */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Indicadores Individuales */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4 text-emerald-800">
            <Users className="w-6 h-6" />
            <h2 className="text-lg font-bold">Indicadores Individuales</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { label: 'Población por municipio', href: '/poblacion' },
              { label: 'Evolución Pirámide Poblacional (1980-2022)', href: '/piramide' },
              { label: 'Mercado de Trabajo (Actividad, Empleo, Desocupación)', href: '/mercado-trabajo' },
              { label: 'Nivel Educativo (+25 años)', href: '/educacion' },
            ].map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                className="py-3 flex items-center justify-between text-sm text-slate-700 hover:text-emerald-700 font-medium group transition-colors"
              >
                <span>{link.label}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-700 transition-all" />
              </Link>
            ))}
          </div>
        </div>

        {/* Indicadores por Hogar */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4 text-emerald-800">
            <Home className="w-6 h-6" />
            <h2 className="text-lg font-bold">Indicadores por Hogar</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              { label: 'Clima Educativo en el Hogar', href: '/clima-educativo' },
              { label: 'Necesidades Básicas Insatisfechas (NBI)', href: '/nbi' },
              { label: 'Materiales de la Vivienda (INMAT)', href: '/inmat' },
              { label: 'Agua para beber o cocinar / Red pública', href: '/agua' },
              { label: 'Acceso a Internet', href: '/internet' },
            ].map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                className="py-3 flex items-center justify-between text-sm text-slate-700 hover:text-emerald-700 font-medium group transition-colors"
              >
                <span>{link.label}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-700 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}