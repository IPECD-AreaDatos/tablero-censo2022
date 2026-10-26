import { NextRequest, NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Comparativa Provincial, NEA y País desde censo_nea_nacion_nbi
    const rowsComparativa = await queryDwh(`
      SELECT 
        division_geo,
        "Si_NBI_Total"::numeric as si_nbi_total,
        "No_NBI_Total"::numeric as no_nbi_total,
        "Si_NBI_Hacinamiento"::numeric as hacinamiento,
        "Si_NBI_Viv_Incoveniente"::numeric as viv_inconveniente,
        "Si_NBI_Cond_Sanitarias"::numeric as cond_sanitarias,
        "Si_NBI_Escolaridad"::numeric as escolaridad,
        "Si_NBI_Capacidad_Subsistencia"::numeric as capacidad_subsistencia
      FROM censo_nea_nacion_nbi
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
          SUM(b.si_nbi_total)::bigint as si_nbi,
          SUM(b.no_nbi_total)::bigint as no_nbi,
          SUM(b.si_nbi_hacinamiento)::bigint as hacinamiento,
          SUM(b.si_nbi_viv_incoveniente)::bigint as viv_inconveniente,
          SUM(b.si_nbi_cond_sanitarias)::bigint as cond_sanitarias,
          SUM(b.si_nbi_escolaridad)::bigint as escolaridad,
          SUM(b.si_nbi_capacidad_subsistencia)::bigint as capacidad_subsistencia
        FROM base_nbi b
        INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
        GROUP BY COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar')
        ORDER BY total_viviendas DESC
      `);
    } catch (e) {
      console.warn('Fallback en query agrupada de NBI:', e);
      rowsDetalle = await queryDatalake(`
        SELECT 
          CONCAT('Área ', codigo) as nombre,
          total_viviendas::bigint as total_viviendas,
          si_nbi_total::bigint as si_nbi,
          no_nbi_total::bigint as no_nbi,
          si_nbi_hacinamiento::bigint as hacinamiento,
          si_nbi_viv_incoveniente::bigint as viv_inconveniente,
          si_nbi_cond_sanitarias::bigint as cond_sanitarias,
          si_nbi_escolaridad::bigint as escolaridad,
          si_nbi_capacidad_subsistencia::bigint as capacidad_subsistencia
        FROM base_nbi
        ORDER BY total_viviendas DESC
        LIMIT 30
      `);
    }

    const totalHogares = rowsDetalle.reduce((acc, r) => acc + (Number(r.total_viviendas) || 0), 0);
    const sumNbi = rowsDetalle.reduce((acc, r) => acc + (Number(r.si_nbi) || 0), 0);
    const pctNbiProvCalculado = totalHogares > 0 ? ((sumNbi / totalHogares) * 100).toFixed(1).replace('.', ',') : '0';

    return NextResponse.json({
      totalHogares,
      sumNbi,
      kpis: {
        pctProv: formatPct(filaProv?.si_nbi_total) !== '—' ? formatPct(filaProv?.si_nbi_total) : `${pctNbiProvCalculado} %`,
        pctPais: formatPct(filaPais?.si_nbi_total),
        pctNea: formatPct(filaNea?.si_nbi_total),
      },
      comparativa: rowsComparativa,
      detalle: rowsDetalle.map((r) => {
        const tot = Number(r.total_viviendas) || 1;
        const nbi = Number(r.si_nbi) || 0;
        const hac = Number(r.hacinamiento) || 0;
        const viv = Number(r.viv_inconveniente) || 0;
        const san = Number(r.cond_sanitarias) || 0;
        const esc = Number(r.escolaridad) || 0;
        const sub = Number(r.capacidad_subsistencia) || 0;

        return {
          nombre: r.nombre,
          total_viviendas: tot,
          si_nbi: nbi,
          no_nbi: Number(r.no_nbi) || 0,
          hacinamiento: hac,
          viv_inconveniente: viv,
          cond_sanitarias: san,
          escolaridad: esc,
          capacidad_subsistencia: sub,
          pct_si_nbi: ((nbi / tot) * 100).toFixed(1),
          pct_hacinamiento: ((hac / tot) * 100).toFixed(1),
          pct_viv_inconveniente: ((viv / tot) * 100).toFixed(1),
          pct_cond_sanitarias: ((san / tot) * 100).toFixed(1),
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar NBI:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}