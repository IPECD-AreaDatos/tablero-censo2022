import { NextRequest, NextResponse } from 'next/server';
import { queryDwh } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Comparativa regional y nacional calculada desde la tabla censo_nea_nacion_cobertura_salud
    const comparativaRows = await queryDwh(`
      SELECT 
        division_geo,
        "obra_social_PAMI"::numeric as con_cobertura,
        "sin_cobertura"::numeric as sin_cobertura,
        "programas_estatales"::numeric as programas_estatales
      FROM censo_nea_nacion_cobertura_salud
    `);

    // 2. Desglose departamental calculado desde censo_ipecd_departamentos
    const deptosRows = await queryDwh(`
      SELECT 
        departamento,
        poblacion_2022::bigint as poblacion,
        "población_en_vivienda_obra_social_o_prepaga_incluye_pami"::bigint as obra_social_pami,
        "población_en_vivienda_programas_o_planes_estatales_de_salud"::bigint as programas_estatales,
        "población_en_viv_no_tiene_obra_social_prepaga_ni_plan_estatal"::bigint as sin_cobertura
      FROM censo_ipecd_departamentos
      WHERE LOWER(departamento) NOT LIKE '%total%'
      ORDER BY poblacion_2022 DESC
    `);

    // 3. Totales provinciales calculados sumando los departamentos
    const totalPoblacion = deptosRows.reduce((acc, r) => acc + (Number(r.poblacion) || 0), 0);
    const totalObraSocial = deptosRows.reduce((acc, r) => acc + (Number(r.obra_social_pami) || 0), 0);
    const totalProgramas = deptosRows.reduce((acc, r) => acc + (Number(r.programas_estatales) || 0), 0);
    const totalSinCobertura = deptosRows.reduce((acc, r) => acc + (Number(r.sin_cobertura) || 0), 0);

    const pctObraSocial = totalPoblacion > 0 ? ((totalObraSocial / totalPoblacion) * 100).toFixed(1).replace('.', ',') : '0';
    const pctProgramas = totalPoblacion > 0 ? ((totalProgramas / totalPoblacion) * 100).toFixed(1).replace('.', ',') : '0';
    const pctSinCobertura = totalPoblacion > 0 ? ((totalSinCobertura / totalPoblacion) * 100).toFixed(1).replace('.', ',') : '0';

    return NextResponse.json({
      totalesProvincia: {
        totalPoblacion,
        totalObraSocial,
        totalProgramas,
        totalSinCobertura,
        pctObraSocial,
        pctProgramas,
        pctSinCobertura,
      },
      comparativa: comparativaRows,
      departamentos: deptosRows.map((r) => {
        const pop = Number(r.poblacion) || 1;
        const os = Number(r.obra_social_pami) || 0;
        const pe = Number(r.programas_estatales) || 0;
        const sc = Number(r.sin_cobertura) || 0;
        return {
          departamento: r.departamento,
          poblacion: pop,
          obra_social_pami: os,
          programas_estatales: pe,
          sin_cobertura: sc,
          pct_obra_social: ((os / pop) * 100).toFixed(1).replace('.', ','),
          pct_programas: ((pe / pop) * 100).toFixed(1).replace('.', ','),
          pct_sin_cobertura: ((sc / pop) * 100).toFixed(1).replace('.', ','),
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar cobertura de salud:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}