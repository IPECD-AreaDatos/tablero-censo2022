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

    const cleanStr = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const formatPct = (val: any) => {
      if (val === undefined || val === null) return '—';
      let num = Number(val);
      if (isNaN(num)) return '—';
      if (num > 0 && num <= 1) num *= 100;
      return `${num.toFixed(1).replace('.', ',')} %`;
    };

    const filaNea = rowsComparativa.find((c: any) => cleanStr(c.division_geo).includes('nea'));
    const filaPais = rowsComparativa.find((c: any) => {
      const nom = cleanStr(c.division_geo);
      return nom.includes('pais') || nom.includes('total') || nom.includes('nacion');
    });

    const buildCalidades = (row: any) => ({
      calidad_1: formatPct(row?.calidad_1),
      calidad_2: formatPct(row?.calidad_2),
      calidad_3: formatPct(row?.calidad_3),
      calidad_4: formatPct(row?.calidad_4),
    });

    // 2. Detalle territorial consolidado por departamento y municipio
    const rowsDetalle = await queryDatalake(`
      SELECT 
        COALESCE(p.depto_p18, 'Sin Departamento') as departamento,
        COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') as municipio,
        COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') as nombre,
        SUM(b.total_viviendas)::bigint as total_viviendas,
        SUM(b.calidad_1)::bigint as calidad_1,
        SUM(b.calidad_2)::bigint as calidad_2,
        SUM(b.calidad_3)::bigint as calidad_3,
        SUM(b.calidad_4)::bigint as calidad_4,
        SUM(b.ignorado)::bigint as ignorado
      FROM base_inmat b
      INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
      GROUP BY COALESCE(p.depto_p18, 'Sin Departamento'), COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar')
      ORDER BY total_viviendas DESC
    `);

    const totalViviendas = rowsDetalle.reduce((acc, r) => acc + (Number(r.total_viviendas) || 0), 0);

    return NextResponse.json({
      totalViviendas,
      kpis: {
        pais: buildCalidades(filaPais),
        nea: buildCalidades(filaNea),
      },
      comparativa: rowsComparativa,
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_viviendas) || 1;
        const c1 = Number(r.calidad_1) || 0;
        const c2 = Number(r.calidad_2) || 0;
        const c3 = Number(r.calidad_3) || 0;
        const c4 = Number(r.calidad_4) || 0;
        return {
          departamento: r.departamento,
          municipio: r.municipio,
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