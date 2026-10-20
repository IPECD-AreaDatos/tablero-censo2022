import { NextRequest, NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Comparativas País, NEA y Corrientes desde censo_nea_nacion_clima_educativo
    const rowsComparativa = await queryDwh(`
      SELECT 
        division_geo,
        clima_muy_bajo::numeric,
        clima_bajo::numeric,
        clima_medio::numeric,
        clima_alto::numeric,
        clima_muy_alto::numeric,
        no_corresponde::numeric
      FROM censo_nea_nacion_clima_educativo
    `);

    // 2. Desglose por código o departamento desde Datalake
    let rowsDetalle: any[] = [];
    try {
      rowsDetalle = await queryDatalake(`
        SELECT 
          b.codigo,
          COALESCE(p.municipio_p1, p.depto_p18, CONCAT('Área ', b.codigo)) as nombre,
          b.clima_muy_bajo::bigint as muy_bajo,
          b.clima_bajo::bigint as bajo,
          b.clima_medio::bigint as medio,
          b.clima_alto::bigint as alto,
          b.clima_muy_alto::bigint as muy_alto,
          b.total_viviendas::bigint as total_hogares
        FROM base_clima_educativo_hogar b
        LEFT JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
        ORDER BY b.total_viviendas DESC
      `);
    } catch (e) {
      console.warn('Fallback en join con base_p18:', e);
      rowsDetalle = await queryDatalake(`
        SELECT 
          codigo,
          CONCAT('Área ', codigo) as nombre,
          clima_muy_bajo::bigint as muy_bajo,
          clima_bajo::bigint as bajo,
          clima_medio::bigint as medio,
          clima_alto::bigint as alto,
          clima_muy_alto::bigint as muy_alto,
          total_viviendas::bigint as total_hogares
        FROM base_clima_educativo_hogar
        ORDER BY total_viviendas DESC
      `);
    }

    // Totales calculados en tiempo real sumando las filas
    const totalHogares = rowsDetalle.reduce((acc, r) => acc + (Number(r.total_hogares) || 0), 0);
    const sumMedio = rowsDetalle.reduce((acc, r) => acc + (Number(r.medio) || 0), 0);
    const pctMedioProv = totalHogares > 0 ? ((sumMedio / totalHogares) * 100).toFixed(1).replace('.', ',') : '0';

    return NextResponse.json({
      totalHogares,
      pctMedioProv,
      comparativa: rowsComparativa,
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_hogares) || 1;
        const mb = Number(r.muy_bajo) || 0;
        const b = Number(r.bajo) || 0;
        const m = Number(r.medio) || 0;
        const a = Number(r.alto) || 0;
        const ma = Number(r.muy_alto) || 0;
        return {
          codigo: r.codigo,
          nombre: r.nombre,
          total_hogares: tot,
          muy_bajo: mb,
          bajo: b,
          medio: m,
          alto: a,
          muy_alto: ma,
          pct_muy_bajo: ((mb / tot) * 100).toFixed(1),
          pct_bajo: ((b / tot) * 100).toFixed(1),
          pct_medio: ((m / tot) * 100).toFixed(1),
          pct_alto: ((a / tot) * 100).toFixed(1),
          pct_muy_alto: ((ma / tot) * 100).toFixed(1),
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar clima educativo:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}