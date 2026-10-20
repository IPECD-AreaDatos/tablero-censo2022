import { NextRequest, NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Comparativa Provincial, NEA y Nacional desde censo_nea_nacion_inmat
    const rowsComparativa = await queryDwh(`
      SELECT 
        division_geo,
        "Calidad_1"::numeric as calidad_1,
        "Calidad_2"::numeric as calidad_2,
        "Calidad_3"::numeric as calidad_3,
        "Calidad_4"::numeric as calidad_4,
        "Ignorado"::numeric as ignorado
      FROM censo_nea_nacion_inmat
    `);

    // 2. Detalle territorial desde base_inmat en datalake
    let rowsDetalle: any[] = [];
    try {
      rowsDetalle = await queryDatalake(`
        SELECT 
          b.codigo,
          COALESCE(p.municipio_p1, p.depto_p18, CONCAT('Área ', b.codigo)) as nombre,
          b.total_viviendas::bigint as total_viviendas,
          b.calidad_1::bigint as calidad_1,
          b.calidad_2::bigint as calidad_2,
          b.calidad_3::bigint as calidad_3,
          b.calidad_4::bigint as calidad_4,
          b.ignorado::bigint as ignorado
        FROM base_inmat b
        LEFT JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
        ORDER BY b.total_viviendas DESC
      `);
    } catch (e) {
      console.warn('Fallback en join INMAT:', e);
      rowsDetalle = await queryDatalake(`
        SELECT 
          codigo,
          CONCAT('Área ', codigo) as nombre,
          total_viviendas::bigint as total_viviendas,
          calidad_1::bigint as calidad_1,
          calidad_2::bigint as calidad_2,
          calidad_3::bigint as calidad_3,
          calidad_4::bigint as calidad_4,
          ignorado::bigint as ignorado
        FROM base_inmat
        ORDER BY total_viviendas DESC
      `);
    }

    const totalViviendas = rowsDetalle.reduce((acc, r) => acc + (Number(r.total_viviendas) || 0), 0);
    const sumCalidad1 = rowsDetalle.reduce((acc, r) => acc + (Number(r.calidad_1) || 0), 0);
    const sumCalidad2 = rowsDetalle.reduce((acc, r) => acc + (Number(r.calidad_2) || 0), 0);
    const sumCalidad3 = rowsDetalle.reduce((acc, r) => acc + (Number(r.calidad_3) || 0), 0);
    const sumCalidad4 = rowsDetalle.reduce((acc, r) => acc + (Number(r.calidad_4) || 0), 0);

    const pctCalidad1 = totalViviendas > 0 ? ((sumCalidad1 / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';
    const pctCalidad2 = totalViviendas > 0 ? ((sumCalidad2 / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';
    const pctCalidad3 = totalViviendas > 0 ? ((sumCalidad3 / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';
    const pctCalidad4 = totalViviendas > 0 ? ((sumCalidad4 / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';

    return NextResponse.json({
      totalesProvincia: {
        totalViviendas,
        sumCalidad1,
        sumCalidad2,
        sumCalidad3,
        sumCalidad4,
        pctCalidad1,
        pctCalidad2,
        pctCalidad3,
        pctCalidad4,
      },
      comparativa: rowsComparativa,
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_viviendas) || 1;
        const c1 = Number(r.calidad_1) || 0;
        const c2 = Number(r.calidad_2) || 0;
        const c3 = Number(r.calidad_3) || 0;
        const c4 = Number(r.calidad_4) || 0;
        return {
          codigo: r.codigo,
          nombre: r.nombre,
          total_viviendas: tot,
          calidad_1: c1,
          calidad_2: c2,
          calidad_3: c3,
          calidad_4: c4,
          ignorado: Number(r.ignorado) || 0,
          pct_calidad_1: ((c1 / tot) * 100).toFixed(1),
          pct_calidad_2: ((c2 / tot) * 100).toFixed(1),
          pct_calidad_3: ((c3 / tot) * 100).toFixed(1),
          pct_calidad_4: ((c4 / tot) * 100).toFixed(1),
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar INMAT:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}