import { NextRequest, NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Comparativa Provincial, NEA y Nacional desde censo_nea_nacion_combustible
    const rowsComparativa = await queryDwh(`
      SELECT 
        division_geo,
        "Gas_garrafa"::numeric as gas_garrafa,
        "Gas_tubo_o_zepelin"::numeric as gas_tubo,
        "Gas_red"::numeric as gas_red,
        "Electricidad"::numeric as electricidad,
        "Leña_carbon"::numeric as lena_carbon,
        "Otro"::numeric as otro
      FROM censo_nea_nacion_combustible
    `);

    // 2. Detalle territorial consolidado por municipio/departamento
    let rowsDetalle: any[] = [];
    try {
      rowsDetalle = await queryDatalake(`
        SELECT 
          COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') as nombre,
          SUM(b.total_viviendas)::bigint as total_viviendas,
          SUM(b.gas_garrafa)::bigint as gas_garrafa,
          SUM(b.gas_tubo_o_zepelin)::bigint as gas_tubo,
          SUM(b.gas_red)::bigint as gas_red,
          SUM(b.electricidad)::bigint as electricidad,
          SUM(b.leña_carbon)::bigint as lena_carbon,
          SUM(b.otro)::bigint as otro
        FROM base_combustible_para_cocinar b
        INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
        GROUP BY COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar')
        ORDER BY total_viviendas DESC
      `);
    } catch (e) {
      console.warn('Fallback en query agrupada de combustible:', e);
      rowsDetalle = await queryDatalake(`
        SELECT 
          CONCAT('Área ', codigo) as nombre,
          total_viviendas::bigint as total_viviendas,
          gas_garrafa::bigint as gas_garrafa,
          gas_tubo_o_zepelin::bigint as gas_tubo,
          gas_red::bigint as gas_red,
          electricidad::bigint as electricidad,
          leña_carbon::bigint as lena_carbon,
          otro::bigint as otro
        FROM base_combustible_para_cocinar
        ORDER BY total_viviendas DESC
        LIMIT 30
      `);
    }

    const totalViviendas = rowsDetalle.reduce((acc, r) => acc + (Number(r.total_viviendas) || 0), 0);
    const sumGarrafa = rowsDetalle.reduce((acc, r) => acc + (Number(r.gas_garrafa) || 0), 0);
    const sumTubo = rowsDetalle.reduce((acc, r) => acc + (Number(r.gas_tubo) || 0), 0);
    const sumElectricidad = rowsDetalle.reduce((acc, r) => acc + (Number(r.electricidad) || 0), 0);
    const sumLena = rowsDetalle.reduce((acc, r) => acc + (Number(r.lena_carbon) || 0), 0);

    const pctGarrafa = totalViviendas > 0 ? ((sumGarrafa / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';
    const pctTubo = totalViviendas > 0 ? ((sumTubo / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';
    const pctElectricidad = totalViviendas > 0 ? ((sumElectricidad / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';
    const pctLena = totalViviendas > 0 ? ((sumLena / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';

    return NextResponse.json({
      totalesProvincia: {
        totalViviendas,
        sumGarrafa,
        sumTubo,
        sumElectricidad,
        sumLena,
        pctGarrafa,
        pctTubo,
        pctElectricidad,
        pctLena,
      },
      comparativa: rowsComparativa,
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_viviendas) || 1;
        const gg = Number(r.gas_garrafa) || 0;
        const gt = Number(r.gas_tubo) || 0;
        const el = Number(r.electricidad) || 0;
        const lc = Number(r.lena_carbon) || 0;
        return {
          nombre: r.nombre,
          total_viviendas: tot,
          gas_garrafa: gg,
          gas_tubo: gt,
          gas_red: Number(r.gas_red) || 0,
          electricidad: el,
          lena_carbon: lc,
          otro: Number(r.otro) || 0,
          pct_gas_garrafa: ((gg / tot) * 100).toFixed(1),
          pct_gas_tubo: ((gt / tot) * 100).toFixed(1),
          pct_electricidad: ((el / tot) * 100).toFixed(1),
          pct_lena_carbon: ((lc / tot) * 100).toFixed(1),
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar combustible:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}