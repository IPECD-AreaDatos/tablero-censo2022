import { NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Demografía y Población desde DWH
    const demoRows = await queryDwh(`
      SELECT 
        SUM(poblacion_2022)::bigint as total_poblacion,
        SUM(poblacion_2022_varon_excluye_situacion_de_calle)::bigint as varones,
        SUM(poblacion_2022_mujer_excluye_situacion_de_calle)::bigint as mujeres,
        AVG(tasa_de_actividad)::numeric as tasa_actividad,
        AVG(tasa_de_empleo)::numeric as tasa_empleo,
        AVG(tasa_de_desocup)::numeric as tasa_desocup,
        SUM(categoria_ocupacional_empleado_u_obrero)::bigint as empleados,
        SUM(categoria_ocupacional_cuenta_propia)::bigint as cuenta_propia,
        SUM("población_en_vivienda_obra_social_o_prepaga_incluye_pami")::bigint as obra_social,
        SUM("población_en_viv_no_tiene_obra_social_prepaga_ni_plan_estatal")::bigint as sin_cobertura
      FROM censo_ipecd_departamentos
      WHERE LOWER(departamento) NOT LIKE '%total%'
    `);

    // 2. Hogares, Internet y Servicios desde Datalake
    const [internetRows, nbiRows, inmatRows, aguaRows, combustibleRows] = await Promise.all([
      queryDatalake(`SELECT SUM(total_viviendas)::bigint as total, SUM(con_internet)::bigint as con_net FROM base_internet`),
      queryDatalake(`SELECT SUM(total_viviendas)::bigint as total, SUM(si_nbi_total)::bigint as nbi FROM base_nbi`),
      queryDatalake(`SELECT SUM(total_viviendas)::bigint as total, SUM(calidad_1)::bigint as cal1 FROM base_inmat`),
      queryDatalake(`SELECT SUM(total_vivienda)::bigint as total, SUM(red_publica)::bigint as red FROM base_agua_beber_o_cocinar`),
      queryDatalake(`SELECT SUM(total_viviendas)::bigint as total, SUM(gas_garrafa)::bigint as garrafa FROM base_combustible_para_cocinar`),
    ]);

    const d = demoRows[0] || {};
    const pop = Number(d.total_poblacion) || 1209671;
    const varones = Number(d.varones) || 586788;
    const mujeres = Number(d.mujeres) || 622883;
    const totalHogares = 379129;

    const netTotal = Number(internetRows[0]?.total) || 1;
    const netCon = Number(internetRows[0]?.con_net) || 0;

    const nbiTotal = Number(nbiRows[0]?.total) || 1;
    const nbiCon = Number(nbiRows[0]?.nbi) || 0;

    const inmatTotal = Number(inmatRows[0]?.total) || 1;
    const inmatCal1 = Number(inmatRows[0]?.cal1) || 0;

    const aguaTotal = Number(aguaRows[0]?.total) || 1;
    const aguaRed = Number(aguaRows[0]?.red) || 0;

    const gasTotal = Number(combustibleRows[0]?.total) || 1;
    const gasGarr = Number(combustibleRows[0]?.garrafa) || 0;

    return NextResponse.json({
      demografia: {
        totalPoblacion: pop.toLocaleString('es-AR'),
        varonesPct: ((varones / pop) * 100).toFixed(1).replace('.', ','),
        mujeresPct: ((mujeres / pop) * 100).toFixed(1).replace('.', ','),
        indiceMasculinidad: mujeres > 0 ? ((varones / mujeres) * 100).toFixed(1).replace('.', ',') : '94,2',
        totalHogares: totalHogares.toLocaleString('es-AR'),
        personasPorHogar: (pop / totalHogares).toFixed(2).replace('.', ','),
      },
      trabajo: {
        actividad: '55,3 %',
        empleo: '51,0 %',
        desocupacion: '7,9 %',
        empleadosObreros: Number(d.empleados || 0).toLocaleString('es-AR'),
        cuentaPropia: Number(d.cuenta_propia || 0).toLocaleString('es-AR'),
      },
      educacionSalud: {
        secundariaCompleta: '31,3 %',
        secundariaPais: '34,7 %',
        secundariaNea: '29,6 %',
        conObraSocial: pop > 0 ? (((Number(d.obra_social) || 0) / pop) * 100).toFixed(1).replace('.', ',') : '51,2',
        sinCobertura: pop > 0 ? (((Number(d.sin_cobertura) || 0) / pop) * 100).toFixed(1).replace('.', ',') : '42,8',
      },
      habitat: {
        nbiPct: ((nbiCon / nbiTotal) * 100).toFixed(1).replace('.', ','),
        inmatCal1Pct: ((inmatCal1 / inmatTotal) * 100).toFixed(1).replace('.', ','),
        internetPct: ((netCon / netTotal) * 100).toFixed(1).replace('.', ','),
        aguaRedPct: ((aguaRed / aguaTotal) * 100).toFixed(1).replace('.', ','),
        gasGarrafaPct: ((gasGarr / gasTotal) * 100).toFixed(1).replace('.', ','),
      }
    });
  } catch (error) {
    console.error('Error al generar resumen:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}