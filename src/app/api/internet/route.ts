import { NextRequest, NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Comparativa Provincial, NEA y Nacional desde censo_nea_nacion_internet
    const rowsComparativa = await queryDwh(`
      SELECT 
        division_geo,
        "acceso_internet"::numeric as acceso_internet
      FROM censo_nea_nacion_internet
    `);

    // 2. Detalle territorial desde base_internet en datalake
    let rowsDetalle: any[] = [];
    try {
      rowsDetalle = await queryDatalake(`
        SELECT 
          b.codigo,
          COALESCE(p.municipio_p1, p.depto_p18, CONCAT('Área ', b.codigo)) as nombre,
          b.total_viviendas::bigint as total_viviendas,
          b.con_internet::bigint as con_internet,
          b.sin_internet::bigint as sin_internet
        FROM base_internet b
        LEFT JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
        ORDER BY b.total_viviendas DESC
      `);
    } catch (e) {
      console.warn('Fallback en join internet:', e);
      rowsDetalle = await queryDatalake(`
        SELECT 
          codigo,
          CONCAT('Área ', codigo) as nombre,
          total_viviendas::bigint as total_viviendas,
          con_internet::bigint as con_internet,
          sin_internet::bigint as sin_internet
        FROM base_internet
        ORDER BY total_viviendas DESC
      `);
    }

    const totalViviendas = rowsDetalle.reduce((acc, r) => acc + (Number(r.total_viviendas) || 0), 0);
    const sumConInternet = rowsDetalle.reduce((acc, r) => acc + (Number(r.con_internet) || 0), 0);
    const sumSinInternet = rowsDetalle.reduce((acc, r) => acc + (Number(r.sin_internet) || 0), 0);

    const pctConInternet = totalViviendas > 0 ? ((sumConInternet / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';
    const pctSinInternet = totalViviendas > 0 ? ((sumSinInternet / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';

    return NextResponse.json({
      totalesProvincia: {
        totalViviendas,
        sumConInternet,
        sumSinInternet,
        pctConInternet,
        pctSinInternet,
      },
      comparativa: rowsComparativa,
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_viviendas) || 1;
        const con = Number(r.con_internet) || 0;
        const sin = Number(r.sin_internet) || 0;
        return {
          codigo: r.codigo,
          nombre: r.nombre,
          total_viviendas: tot,
          con_internet: con,
          sin_internet: sin,
          pct_con_internet: ((con / tot) * 100).toFixed(1),
          pct_sin_internet: ((sin / tot) * 100).toFixed(1),
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar internet:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}