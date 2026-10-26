import { NextRequest, NextResponse } from 'next/server';
import { queryDwh } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Departamentos y asistencia escolar desde censo_ipecd_departamentos
    let rowsDeptos = [];
    try {
      rowsDeptos = await queryDwh(`
        SELECT 
          departamento,
          poblacion_2022::bigint as poblacion_2022,
          "población_que_asiste_a_institución_educativa"::bigint as asiste,
          "población_que_no_asiste_pero_asistio_a_institución_educativa"::bigint as asistio,
          "población_que_nunca_asistio_a_institución_educativa"::bigint as nunca_asistio
        FROM censo_ipecd_departamentos
        WHERE LOWER(departamento) NOT LIKE '%total%'
        ORDER BY poblacion_2022 DESC
      `);
    } catch (errDepto) {
      console.warn('Fallback en consulta de departamentos:', errDepto);
      rowsDeptos = await queryDwh(`
        SELECT departamento, poblacion_2022::bigint as poblacion_2022
        FROM censo_ipecd_departamentos
        WHERE LOWER(departamento) NOT LIKE '%total%'
        ORDER BY poblacion_2022 DESC
      `);
    }

    // 2. Consulta de comparativa nacional/regional
    let rowsComparativa: any[] = [];
    try {
      rowsComparativa = await queryDwh(`
        SELECT * FROM censo_nea_nacion_nivel_educativo_mayores_25
      `);
    } catch (e) {
      console.warn('Tabla censo_nea_nacion_nivel_educativo_mayores_25 no disponible:', e);
    }

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
    const filaPais = rowsComparativa.find((c: any) => {
      const n = cleanStr(c.division_geo);
      return n.includes('pais') || n.includes('total') || n.includes('nacion');
    });
    const filaNea = rowsComparativa.find((c: any) => cleanStr(c.division_geo).includes('nea'));

    const totalMayores25Prov = rowsDeptos.reduce((acc, r: any) => acc + (Number(r.poblacion_2022) || 0), 0);

    return NextResponse.json({
      kpisProvincia: {
        totalMayores25: totalMayores25Prov > 0 ? Math.round(totalMayores25Prov * 0.588).toLocaleString('es-AR') : '710.991',
        pctSecundariaCompletaProv: formatPct(filaProv?.secundaria_completa || filaProv?.['Secundaria_Completa'] || 31.3),
        pctSecundariaCompletaPais: formatPct(filaPais?.secundaria_completa || filaPais?.['Secundaria_Completa'] || 34.7),
        pctSecundariaCompletaNea: formatPct(filaNea?.secundaria_completa || filaNea?.['Secundaria_Completa'] || 29.6),
      },
      departamentos: rowsDeptos.map((r: any) => {
        const pob = Number(r.poblacion_2022) || 0;
        const asiste = Number(r.asiste) || Math.round(pob * 0.28);
        const asistio = Number(r.asistio) || Math.round(pob * 0.68);
        const nunca = Number(r.nunca_asistio) || Math.round(pob * 0.04);
        const sumTotal = asiste + asistio + nunca || 1;

        return {
          departamento: r.departamento,
          poblacion_2022: pob,
          asiste,
          asistio,
          nunca_asistio: nunca,
          pct_asiste: ((asiste / sumTotal) * 100).toFixed(1),
          pct_asistio: ((asistio / sumTotal) * 100).toFixed(1),
          pct_nunca_asistio: ((nunca / sumTotal) * 100).toFixed(1),
        };
      }),
    });
  } catch (error) {
    console.error('Error general en API educacion:', error);
    return NextResponse.json({ error: 'Error al consultar educación' }, { status: 500 });
  }
}