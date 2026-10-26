import { NextResponse } from 'next/server';
import { queryDwh } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

    const formatPct = (val: any) => {
      if (val === undefined || val === null) return '—';
      let num = Number(val);
      if (isNaN(num)) return '—';
      if (num > 0 && num <= 1) num *= 100;
      return `${num.toFixed(1).replace('.', ',')} %`;
    };

    const cleanStr = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const corrientes = comparativaRows.find((row) => cleanStr(row.division_geo).includes('corrientes'));

    return NextResponse.json({
      totalesProvincia: {
        totalPoblacion,
        pctObraSocial: formatPct(corrientes?.con_cobertura),
        pctProgramas: formatPct(corrientes?.programas_estatales),
        pctSinCobertura: formatPct(corrientes?.sin_cobertura),
      },
      comparativa: comparativaRows,
      departamentos: deptosRows.map((row) => {
        const pob = Number(row.poblacion) || 0;
        const os = Number(row.obra_social_pct) || 0;
        const pr = Number(row.programas_pct) || 0;
        const sc = Number(row.sin_cobertura_pct) || 0;

        return {
          departamento: row.departamento,
          poblacion: pob,
          obra_social_pct: os,
          programas_pct: pr,
          sin_cobertura_pct: sc,
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar cobertura de salud:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}