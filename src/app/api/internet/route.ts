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

    const cleanStr = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const formatPct = (val: any) => {
      if (val === undefined || val === null) return '—';
      let num = Number(val);
      if (isNaN(num)) return '—';
      if (num > 0 && num <= 1) num *= 100;
      return `${num.toFixed(1).replace('.', ',')} %`;
    };

    const filaProv = rowsComparativa.find((c: any) => cleanStr(c.division_geo).includes('corrientes'));
    const filaNea = rowsComparativa.find((c: any) => cleanStr(c.division_geo).includes('nea'));
    const filaPais = rowsComparativa.find((c: any) => {
      const nom = cleanStr(c.division_geo);
      return nom.includes('pais') || nom.includes('total') || nom.includes('nacion');
    });

    // 2. Detalle territorial consolidado por municipio/departamento
    let rowsDetalle: any[] = [];
    try {
      rowsDetalle = await queryDatalake(`
        SELECT 
          COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') as nombre,
          SUM(b.total_viviendas)::bigint as total_viviendas,
          SUM(b.con_internet)::bigint as con_internet,
          SUM(b.sin_internet)::bigint as sin_internet
        FROM base_internet b
        INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
        GROUP BY COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar')
        ORDER BY total_viviendas DESC
      `);
    } catch (e) {
      console.warn('Fallback en query agrupada de internet:', e);
      rowsDetalle = await queryDatalake(`
        SELECT 
          CONCAT('Área ', codigo) as nombre,
          total_viviendas::bigint as total_viviendas,
          con_internet::bigint as con_internet,
          sin_internet::bigint as sin_internet
        FROM base_internet
        ORDER BY total_viviendas DESC
        LIMIT 30
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
      kpis: {
        pctProv: formatPct(filaProv?.acceso_internet) !== '—' ? formatPct(filaProv?.acceso_internet) : `${pctConInternet} %`,
        pctPais: formatPct(filaPais?.acceso_internet),
        pctNea: formatPct(filaNea?.acceso_internet),
      },
      comparativa: rowsComparativa,
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_viviendas) || 1;
        const con = Number(r.con_internet) || 0;
        const sin = Number(r.sin_internet) || 0;
        return {
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