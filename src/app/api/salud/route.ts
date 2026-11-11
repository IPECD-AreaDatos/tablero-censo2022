import { NextResponse } from 'next/server';
import { queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await queryDatalake(`
      SELECT
        p.depto_p18 AS departamento,
        p.municipio_p1 AS municipio,
        SUM(c.total_poblacion)::bigint AS poblacion,
        SUM(c.obra_social_prepaga_pami)::bigint AS obra_social,
        SUM(c.programas_estatales_salud)::bigint AS programas,
        SUM(c.sin_obra_social_ni_plan_estatal)::bigint AS sin_cobertura
      FROM base_cobertura_salud c
      INNER JOIN base_p18_corrientes p ON c.codigo = p.codigo_p18
      GROUP BY p.depto_p18, p.municipio_p1
      ORDER BY poblacion DESC
    `);

    const normalize = (value: string) => value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const municipiosAgrupados = new Map<string, {
      departamento: string;
      municipio: string;
      poblacion: number;
      obra_social: number;
      programas: number;
      sin_cobertura: number;
    }>();

    for (const row of rows) {
      const key = `${normalize(row.departamento)}::${normalize(row.municipio)}`;
      const actual = municipiosAgrupados.get(key) || {
        departamento: row.departamento,
        municipio: row.municipio,
        poblacion: 0,
        obra_social: 0,
        programas: 0,
        sin_cobertura: 0,
      };
      actual.poblacion += Number(row.poblacion) || 0;
      actual.obra_social += Number(row.obra_social) || 0;
      actual.programas += Number(row.programas) || 0;
      actual.sin_cobertura += Number(row.sin_cobertura) || 0;
      municipiosAgrupados.set(key, actual);
    }

    const municipiosBase = Array.from(municipiosAgrupados.values())
      .sort((a, b) => b.poblacion - a.poblacion);
    const totales = municipiosBase.reduce((acc, row) => ({
      poblacion: acc.poblacion + row.poblacion,
      obra_social: acc.obra_social + row.obra_social,
      programas: acc.programas + row.programas,
      sin_cobertura: acc.sin_cobertura + row.sin_cobertura,
    }), { poblacion: 0, obra_social: 0, programas: 0, sin_cobertura: 0 });

    const formatPct = (value: number) => totales.poblacion > 0
      ? `${((value / totales.poblacion) * 100).toFixed(1).replace('.', ',')} %`
      : '0,0 %';

    const municipios = municipiosBase.map((row) => {
      const poblacion = row.poblacion;
      const obraSocial = row.obra_social;
      const programas = row.programas;
      const sinCobertura = row.sin_cobertura;
      const porcentaje = (value: number) => poblacion > 0 ? (value / poblacion) * 100 : 0;

      return {
        departamento: row.departamento,
        municipio: row.municipio,
        poblacion,
        obra_social: obraSocial,
        programas,
        sin_cobertura: sinCobertura,
        obra_social_pct: porcentaje(obraSocial),
        programas_pct: porcentaje(programas),
        sin_cobertura_pct: porcentaje(sinCobertura),
      };
    });

    return NextResponse.json({
      totalesProvincia: {
        totalPoblacion: totales.poblacion,
        pctObraSocial: formatPct(totales.obra_social),
        pctProgramas: formatPct(totales.programas),
        pctSinCobertura: formatPct(totales.sin_cobertura),
      },
      municipios,
    });
  } catch (error) {
    console.error('Error al consultar cobertura de salud:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}