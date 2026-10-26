import { NextRequest, NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Comparativas País, NEA y Corrientes
    const rowsComparativa = await queryDwh(`
      SELECT 
        division_geo,
        clima_muy_bajo::numeric as clima_muy_bajo,
        clima_bajo::numeric as clima_bajo,
        clima_medio::numeric as clima_medio,
        clima_alto::numeric as clima_alto,
        clima_muy_alto::numeric as clima_muy_alto,
        no_corresponde::numeric as no_corresponde
      FROM censo_nea_nacion_clima_educativo
    `);

    // Log para ver en la terminal cómo figuran exactamente los nombres en la base
    console.log('Filas censo_nea_nacion_clima_educativo:', rowsComparativa);

    // Función auxiliar para formatear a porcentaje real (si viene 0.294 -> 29,4 %)
    const formatPct = (val: any) => {
      if (val === undefined || val === null) return '—';
      let num = Number(val);
      if (isNaN(num)) return '—';
      if (num > 0 && num <= 1) {
        num = num * 100;
      }
      return `${num.toFixed(1).replace('.', ',')} %`;
    };

    // Función para limpiar acentos y mayúsculas
    const cleanStr = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const filaProv = rowsComparativa.find((c: any) => cleanStr(c.division_geo).includes('corrientes'));
    const filaNea = rowsComparativa.find((c: any) => cleanStr(c.division_geo).includes('nea'));
    const filaPais = rowsComparativa.find((c: any) => {
      const nom = cleanStr(c.division_geo);
      return nom.includes('pais') || nom.includes('total') || nom.includes('nacion');
    });

    // 2. Detalle territorial consolidado por municipio/departamento
    const rowsDetalle = await queryDatalake(`
      SELECT 
        COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') as nombre,
        SUM(b.clima_muy_bajo)::bigint as muy_bajo,
        SUM(b.clima_bajo)::bigint as bajo,
        SUM(b.clima_medio)::bigint as medio,
        SUM(b.clima_alto)::bigint as alto,
        SUM(b.clima_muy_alto)::bigint as muy_alto,
        SUM(b.total_viviendas)::bigint as total_hogares
      FROM base_clima_educativo_hogar b
      INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
      GROUP BY COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar')
      ORDER BY total_hogares DESC
    `);

    const totalHogares = rowsDetalle.reduce((acc, r) => acc + (Number(r.total_hogares) || 0), 0);

    return NextResponse.json({
      totalHogares,
      kpis: {
        pctProv: formatPct(filaProv?.clima_medio),
        pctPais: formatPct(filaPais?.clima_medio),
        pctNea: formatPct(filaNea?.clima_medio),
      },
      comparativa: rowsComparativa,
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_hogares) || 1;
        const mb = Number(r.muy_bajo) || 0;
        const b = Number(r.bajo) || 0;
        const m = Number(r.medio) || 0;
        const a = Number(r.alto) || 0;
        const ma = Number(r.muy_alto) || 0;
        return {
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