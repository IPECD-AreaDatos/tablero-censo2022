import { NextResponse } from 'next/server';
import { queryDwh } from '@/lib/db';

export const dynamic = 'force-dynamic';

const pct = (value: number) => value.toFixed(1).replace('.', ',');

export async function GET() {
  try {
    const [comparativaRows, deptosRows] = await Promise.all([
      queryDwh(`
        SELECT
          division_geo,
          "obra_social_PAMI"::numeric AS con_cobertura,
          "sin_cobertura"::numeric AS sin_cobertura,
          "programas_estatales"::numeric AS programas_estatales
        FROM censo_nea_nacion_cobertura_salud
      `),
      queryDwh(`
        SELECT
          departamento,
          poblacion_2022::bigint AS poblacion,
          "población_en_vivienda_obra_social_o_prepaga_incluye_pami"::numeric AS obra_social_pct,
          "población_en_vivienda_programas_o_planes_estatales_de_salud"::numeric AS programas_pct,
          "población_en_viv_no_tiene_obra_social_prepaga_ni_plan_estatal"::numeric AS sin_cobertura_pct
        FROM censo_ipecd_departamentos
        WHERE LOWER(departamento) NOT LIKE '%total%'
        ORDER BY poblacion_2022 DESC
      `),
    ]);

    const totalPoblacion = deptosRows.reduce((total, row) => total + (Number(row.poblacion) || 0), 0);
    const corrientes = comparativaRows.find((row) => String(row.division_geo).toLowerCase() === 'corrientes');

    return NextResponse.json({
      totalesProvincia: {
        totalPoblacion,
        pctObraSocial: pct((Number(corrientes?.con_cobertura) || 0) * 100),
        pctProgramas: pct((Number(corrientes?.programas_estatales) || 0) * 100),
        pctSinCobertura: pct((Number(corrientes?.sin_cobertura) || 0) * 100),
      },
      comparativa: comparativaRows,
      departamentos: deptosRows.map((row) => ({
        departamento: row.departamento,
        poblacion: Number(row.poblacion) || 0,
        obra_social_pct: Number(row.obra_social_pct) || 0,
        programas_pct: Number(row.programas_pct) || 0,
        sin_cobertura_pct: Number(row.sin_cobertura_pct) || 0,
      })),
    });
  } catch (error) {
    console.error('Error al consultar cobertura de salud:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}
