import { NextRequest, NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Comparativa Provincial, NEA y País desde censo_nea_nacion_nbi
    const rowsComparativa = await queryDwh(`
      SELECT 
        division_geo,
        "Si_NBI_Total"::numeric as si_nbi_total,
        "No_NBI_Total"::numeric as no_nbi_total,
        "Si_NBI_Hacinamiento"::numeric as hacinamiento,
        "Si_NBI_Viv_Incoveniente"::numeric as viv_inconveniente,
        "Si_NBI_Cond_Sanitarias"::numeric as cond_sanitarias,
        "Si_NBI_Escolaridad"::numeric as escolaridad,
        "Si_NBI_Capacidad_Subsistencia"::numeric as capacidad_subsistencia
      FROM censo_nea_nacion_nbi
    `);

    // 2. Detalle territorial desde base_nbi en el datalake
    let rowsDetalle: any[] = [];
    try {
      rowsDetalle = await queryDatalake(`
        SELECT 
          b.codigo,
          COALESCE(p.municipio_p1, p.depto_p18, CONCAT('Área ', b.codigo)) as nombre,
          b.total_viviendas::bigint as total_viviendas,
          b.si_nbi_total::bigint as si_nbi,
          b.no_nbi_total::bigint as no_nbi,
          b.si_nbi_hacinamiento::bigint as hacinamiento,
          b.si_nbi_viv_incoveniente::bigint as viv_inconveniente,
          b.si_nbi_cond_sanitarias::bigint as cond_sanitarias,
          b.si_nbi_escolaridad::bigint as escolaridad,
          b.si_nbi_capacidad_subsistencia::bigint as capacidad_subsistencia
        FROM base_nbi b
        LEFT JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
        ORDER BY b.total_viviendas DESC
      `);
    } catch (e) {
      console.warn('Fallback en join NBI:', e);
      rowsDetalle = await queryDatalake(`
        SELECT 
          codigo,
          CONCAT('Área ', codigo) as nombre,
          total_viviendas::bigint as total_viviendas,
          si_nbi_total::bigint as si_nbi,
          no_nbi_total::bigint as no_nbi,
          si_nbi_hacinamiento::bigint as hacinamiento,
          si_nbi_viv_incoveniente::bigint as viv_inconveniente,
          si_nbi_cond_sanitarias::bigint as cond_sanitarias,
          si_nbi_escolaridad::bigint as escolaridad,
          si_nbi_capacidad_subsistencia::bigint as capacidad_subsistencia
        FROM base_nbi
        ORDER BY total_viviendas DESC
      `);
    }

    const totalHogares = rowsDetalle.reduce((acc, r) => acc + (Number(r.total_viviendas) || 0), 0);
    const sumNbi = rowsDetalle.reduce((acc, r) => acc + (Number(r.si_nbi) || 0), 0);
    const pctNbiProv = totalHogares > 0 ? ((sumNbi / totalHogares) * 100).toFixed(1).replace('.', ',') : '0';

    return NextResponse.json({
      totalHogares,
      sumNbi,
      pctNbiProv,
      comparativa: rowsComparativa,
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_viviendas) || 1;
        const nbi = Number(r.si_nbi) || 0;
        return {
          codigo: r.codigo,
          nombre: r.nombre,
          total_viviendas: tot,
          si_nbi: nbi,
          no_nbi: Number(r.no_nbi) || 0,
          hacinamiento: Number(r.hacinamiento) || 0,
          viv_inconveniente: Number(r.viv_inconveniente) || 0,
          cond_sanitarias: Number(r.cond_sanitarias) || 0,
          escolaridad: Number(r.escolaridad) || 0,
          capacidad_subsistencia: Number(r.capacidad_subsistencia) || 0,
          pct_nbi: ((nbi / tot) * 100).toFixed(1),
          pct_hacinamiento: (((Number(r.hacinamiento) || 0) / tot) * 100).toFixed(1),
          pct_viv_inconveniente: (((Number(r.viv_inconveniente) || 0) / tot) * 100).toFixed(1),
          pct_cond_sanitarias: (((Number(r.cond_sanitarias) || 0) / tot) * 100).toFixed(1),
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar NBI:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}