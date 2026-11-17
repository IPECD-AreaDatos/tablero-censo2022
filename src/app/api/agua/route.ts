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
        SUM(b.total_vivienda)::bigint AS total_viviendas,
        SUM(b.red_publica)::bigint AS red_publica,
        SUM(COALESCE(b.bomba_motor, 0) + COALESCE(b.bomba_manual, 0))::bigint AS bomba_motor,
        SUM(b.pozo_sin_bomba)::bigint AS pozo_sin_bomba,
        SUM(b.cisterna_canal_acequia)::bigint AS cisterna_acequia,
        SUM(b.otra)::bigint AS otra
      FROM base_agua_beber_o_cocinar b
      INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
      GROUP BY 
        COALESCE(p.depto_p18, 'Sin Departamento'), 
        COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar')
      ORDER BY total_viviendas DESC
    `);

    const totalViviendas = rowsDetalle.reduce((acc, r) => acc + (Number(r.total_viviendas) || 0), 0);
    const sumRedPublica = rowsDetalle.reduce((acc, r) => acc + (Number(r.red_publica) || 0), 0);
    const sumBombaMotor = rowsDetalle.reduce((acc, r) => acc + (Number(r.bomba_motor) || 0), 0);
    const sumPozo = rowsDetalle.reduce((acc, r) => acc + (Number(r.pozo_sin_bomba) || 0), 0);
    const sumCisterna = rowsDetalle.reduce((acc, r) => acc + (Number(r.cisterna_acequia) || 0), 0);
    const sumOtra = rowsDetalle.reduce((acc, r) => acc + (Number(r.otra) || 0), 0);

    const fmtPct = (v: number) =>
      totalViviendas > 0 ? ((v / totalViviendas) * 100).toFixed(1).replace('.', ',') : '0,0';

    return NextResponse.json({
      totalesProvincia: {
        totalViviendas,
        sumRedPublica,
        sumBombaMotor,
        sumPozo,
        sumCisterna,
        sumOtra,
        pctRedPublica: fmtPct(sumRedPublica),
        pctBombaMotor: fmtPct(sumBombaMotor),
        pctPozo: fmtPct(sumPozo),
        pctCisterna: fmtPct(sumCisterna),
        pctOtra: fmtPct(sumOtra),
      },
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_viviendas) || 1;
        const red = Number(r.red_publica) || 0;
        const mot = Number(r.bomba_motor) || 0;
        const poz = Number(r.pozo_sin_bomba) || 0;
        const cis = Number(r.cisterna_acequia) || 0;
        const otr = Number(r.otra) || 0;
        return {
          departamento: r.departamento,
          municipio: r.municipio,
          nombre: r.nombre,
          total_viviendas: tot,
          red_publica: red,
          bomba_motor: mot,
          pozo_sin_bomba: poz,
          cisterna_acequia: cis,
          otra: otr,
          pct_red_publica: ((red / tot) * 100).toFixed(1),
          pct_bomba_motor: ((mot / tot) * 100).toFixed(1),
          pct_pozo_sin_bomba: ((poz / tot) * 100).toFixed(1),
          pct_cisterna_acequia: ((cis / tot) * 100).toFixed(1),
          pct_otra: ((otr / tot) * 100).toFixed(1),
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar agua:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}