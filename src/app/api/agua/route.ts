import { NextRequest, NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Comparativa Provincial, NEA y Nacional desde censo_nea_nacion_agua
    const rowsComparativa = await queryDwh(`
      SELECT 
        division_geo,
        "Red_Publica"::numeric as red_publica,
        "Bomba_Motor"::numeric as bomba_motor,
        "Bomba_Manual"::numeric as bomba_manual,
        "Pozo_sin_Bomba"::numeric as pozo_sin_bomba,
        "Cisterna_Canal_Acequia"::numeric as cisterna_acequia,
        "Otra"::numeric as otra
      FROM censo_nea_nacion_agua
    `);

    // 2. Detalle territorial consolidado por municipio/departamento
    let rowsDetalle: any[] = [];
    try {
      rowsDetalle = await queryDatalake(`
        SELECT 
          COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') as nombre,
          SUM(b.total_vivienda)::bigint as total_viviendas,
          SUM(b.red_publica)::bigint as red_publica,
          SUM(b.bomba_motor)::bigint as bomba_motor,
          SUM(b.bomba_manual)::bigint as bomba_manual,
          SUM(b.pozo_sin_bomba)::bigint as pozo_sin_bomba,
          SUM(b.cisterna_canal_acequia)::bigint as cisterna_acequia,
          SUM(b.otra)::bigint as otra
        FROM base_agua_beber_o_cocinar b
        INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
        GROUP BY COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar')
        ORDER BY total_viviendas DESC
      `);
    } catch (e) {
      console.warn('Fallback en query agrupada de agua:', e);
      rowsDetalle = await queryDatalake(`
        SELECT 
          CONCAT('Área ', codigo) as nombre,
          total_vivienda::bigint as total_viviendas,
          red_publica::bigint as red_publica,
          bomba_motor::bigint as bomba_motor,
          bomba_manual::bigint as bomba_manual,
          pozo_sin_bomba::bigint as pozo_sin_bomba,
          cisterna_canal_acequia::bigint as cisterna_acequia,
          otra::bigint as otra
        FROM base_agua_beber_o_cocinar
        ORDER BY total_vivienda DESC
        LIMIT 30
      `);
    }

    const totalViviendas = rowsDetalle.reduce((acc, r) => acc + (Number(r.total_viviendas) || 0), 0);
    const sumRedPublica = rowsDetalle.reduce((acc, r) => acc + (Number(r.red_publica) || 0), 0);
    const sumBombaMotor = rowsDetalle.reduce((acc, r) => acc + (Number(r.bomba_motor) || 0), 0);
    const sumPozo = rowsDetalle.reduce((acc, r) => acc + (Number(r.pozo_sin_bomba) + Number(r.bomba_manual) || 0), 0);
    const sumOtras = rowsDetalle.reduce((acc, r) => acc + (Number(r.cisterna_acequia) + Number(r.otra) || 0), 0);

    const pctRedPublica = totalViviendas > 0 ? ((sumRedPublica / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';
    const pctBombaMotor = totalViviendas > 0 ? ((sumBombaMotor / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';
    const pctPozo = totalViviendas > 0 ? ((sumPozo / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0';

    return NextResponse.json({
      totalesProvincia: {
        totalViviendas,
        sumRedPublica,
        sumBombaMotor,
        sumPozo,
        sumOtras,
        pctRedPublica,
        pctBombaMotor,
        pctPozo,
      },
      comparativa: rowsComparativa,
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_viviendas) || 1;
        const rp = Number(r.red_publica) || 0;
        const bm = Number(r.bomba_motor) || 0;
        const bman = Number(r.bomba_manual) || 0;
        const pz = Number(r.pozo_sin_bomba) || 0;
        const ca = Number(r.cisterna_acequia) || 0;
        const ot = Number(r.otra) || 0;
        return {
          nombre: r.nombre,
          total_viviendas: tot,
          red_publica: rp,
          bomba_motor: bm,
          bomba_manual: bman,
          pozo_sin_bomba: pz,
          cisterna_acequia: ca,
          otra: ot,
          pct_red_publica: ((rp / tot) * 100).toFixed(1),
          pct_bomba_motor: ((bm / tot) * 100).toFixed(1),
          pct_pozo_sin_bomba: ((pz / tot) * 100).toFixed(1),
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar agua:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}