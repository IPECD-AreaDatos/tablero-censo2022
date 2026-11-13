import { NextRequest, NextResponse } from 'next/server';
import { queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rowsDetalle = await queryDatalake(`
      SELECT 
        COALESCE(p.depto_p18, 'Sin Departamento') AS departamento,
        COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') AS municipio,
        COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') AS nombre,
        SUM(b.total_viviendas)::bigint AS total_viviendas,
        SUM(b.gas_garrafa)::bigint AS gas_garrafa,
        SUM(b.gas_tubo_o_zepelin)::bigint AS gas_tubo,
        SUM(b.electricidad)::bigint AS electricidad,
        SUM(b."leña_carbon")::bigint AS lena_carbon
      FROM base_combustible_para_cocinar b
      INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
      GROUP BY 
        COALESCE(p.depto_p18, 'Sin Departamento'), 
        COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar')
      ORDER BY total_viviendas DESC
    `);

    const totalViviendas = rowsDetalle.reduce((acc, r) => acc + (Number(r.total_viviendas) || 0), 0);
    const sumGarrafa = rowsDetalle.reduce((acc, r) => acc + (Number(r.gas_garrafa) || 0), 0);
    const sumTubo = rowsDetalle.reduce((acc, r) => acc + (Number(r.gas_tubo) || 0), 0);
    const sumElectricidad = rowsDetalle.reduce((acc, r) => acc + (Number(r.electricidad) || 0), 0);
    const sumLena = rowsDetalle.reduce((acc, r) => acc + (Number(r.lena_carbon) || 0), 0);

    const fmtPct = (v: number) =>
      totalViviendas > 0 ? ((v / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0,0';

    return NextResponse.json({
      totalesProvincia: {
        totalViviendas,
        sumGarrafa,
        sumTubo,
        sumElectricidad,
        sumLena,
        pctGarrafa: fmtPct(sumGarrafa),
        pctTubo: fmtPct(sumTubo),
        pctElectricidad: fmtPct(sumElectricidad),
        pctLena: fmtPct(sumLena),
      },
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_viviendas) || 1;
        const gar = Number(r.gas_garrafa) || 0;
        const tub = Number(r.gas_tubo) || 0;
        const ele = Number(r.electricidad) || 0;
        const len = Number(r.lena_carbon) || 0;
        return {
          departamento: r.departamento,
          municipio: r.municipio,
          nombre: r.nombre,
          total_viviendas: tot,
          gas_garrafa: gar,
          gas_tubo: tub,
          electricidad: ele,
          lena_carbon: len,
          pct_gas_garrafa: ((gar / tot) * 100).toFixed(1),
          pct_gas_tubo: ((tub / tot) * 100).toFixed(1),
          pct_electricidad: ((ele / tot) * 100).toFixed(1),
          pct_lena_carbon: ((len / tot) * 100).toFixed(1),
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar combustible:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}