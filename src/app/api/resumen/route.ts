import { NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

const pct = (value: number, decimals = 1) => value.toFixed(decimals).replace('.', ',');

export async function GET() {
  try {
    const [
      demoRows,
      workRows,
      healthRows,
      internetRows,
      nbiRows,
      inmatRows,
      aguaRows,
      combustibleRows,
      climaRows,
      educacionRows,
    ] = await Promise.all([
      // 1. Demografía
      queryDwh(`
        SELECT
          SUM(poblacion_2022)::bigint AS total_poblacion,
          SUM(poblacion_2022 * poblacion_2022_varon_excluye_situacion_de_calle)
            / NULLIF(SUM(poblacion_2022), 0) AS varones_pct,
          SUM(poblacion_2022 * poblacion_2022_mujer_excluye_situacion_de_calle)
            / NULLIF(SUM(poblacion_2022), 0) AS mujeres_pct
        FROM censo_ipecd_departamentos
        WHERE LOWER(departamento) NOT LIKE '%total%'
      `),
      // 2. Mercado de Trabajo
      queryDwh(`
        SELECT
          tasa_de_actividad::numeric AS actividad,
          tasa_de_empleo::numeric AS empleo,
          tasa_de_desocup::numeric AS desocupacion,
          categoria_ocupacional_empleado_u_obrero::numeric AS empleados_obreros,
          categoria_ocupacional_cuenta_propia::numeric AS cuenta_propia,
          categoria_ocupacional_servicio_domestico::numeric AS servicio_domestico
        FROM censo_ipecd_departamentos
        WHERE LOWER(departamento) = 'total'
        LIMIT 1
      `),
      // 3. Salud
      queryDwh(`
        SELECT
          division_geo,
          "obra_social_PAMI"::numeric AS con_cobertura,
          "sin_cobertura"::numeric AS sin_cobertura,
          "programas_estatales"::numeric AS programas_estatales
        FROM censo_nea_nacion_cobertura_salud
      `),
      // 4. Internet
      queryDatalake(`
        SELECT SUM(total_viviendas)::bigint AS total, SUM(con_internet)::bigint AS con_net
        FROM base_internet
      `),
      // 5. NBI
      queryDatalake(`
        SELECT
          SUM(total_viviendas)::bigint AS total,
          SUM(si_nbi_total)::bigint AS nbi,
          SUM(si_nbi_hacinamiento)::bigint AS hacinamiento
        FROM base_nbi
      `),
      // 6. INMAT
      queryDatalake(`
        SELECT SUM(total_viviendas)::bigint AS total, SUM(calidad_1)::bigint AS cal1
        FROM base_inmat
      `),
      // 7. Agua
      queryDatalake(`
        SELECT
          SUM(total_vivienda)::bigint AS total,
          SUM(red_publica)::bigint AS red,
          SUM(bomba_motor)::bigint AS bomba_motor,
          SUM(bomba_manual + pozo_sin_bomba + cisterna_canal_acequia + otra)::bigint AS otras
        FROM base_agua_beber_o_cocinar
      `),
      // 8. Combustible
      queryDatalake(`
        SELECT SUM(total_viviendas)::bigint AS total, SUM(gas_garrafa)::bigint AS garrafa
        FROM base_combustible_para_cocinar
      `),
      // 9. Clima Educativo
      queryDatalake(`
        SELECT SUM(total_viviendas)::bigint AS total, SUM(clima_medio)::bigint AS medio
        FROM base_clima_educativo_hogar
      `),
      // 10. Educación (SELECT * para no romper si varía mayúscula/minúscula)
      queryDwh(`
        SELECT *
        FROM censo_nea_nacion_nivel_educativo_mayores_25
      `),
    ]);

    const cleanStr = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const formatPctFromRatio = (val: any) => {
      if (val === undefined || val === null) return '—';
      let num = Number(val);
      if (isNaN(num)) return '—';
      if (num > 0 && num <= 1) num *= 100;
      return pct(num);
    };

    // Demografía
    const d = demoRows[0] || {};
    const pop = Number(d.total_poblacion) || 0;
    const varonesPct = Number(d.varones_pct) || 0;
    const mujeresPct = Number(d.mujeres_pct) || 0;
    const totalHogares = 379129;

    // Trabajo
    const w = workRows[0] || {};

    // Salud
    const sCorrientes = healthRows.find((row: any) => cleanStr(row.division_geo).includes('corrientes'));

    // Educación
    const edProv = educacionRows.find((r: any) => cleanStr(r.division_geo).includes('corrientes'));
    const edPais = educacionRows.find((r: any) => {
      const n = cleanStr(r.division_geo);
      return n.includes('pais') || n.includes('total') || n.includes('nacion');
    });
    const edNea = educacionRows.find((r: any) => cleanStr(r.division_geo).includes('nea'));

    const getSecundariaVal = (row: any) =>
      row ? (row.secundaria_completa ?? row.Secundaria_Completa ?? row['secundaria completa'] ?? null) : null;

    // Hábitat e infraestructura
    const internet = internetRows[0] || {};
    const netTotal = Number(internet.total) || 0;
    const netCon = Number(internet.con_net) || 0;

    const nbi = nbiRows[0] || {};
    const nbiTotal = Number(nbi.total) || 0;
    const nbiCon = Number(nbi.nbi) || 0;
    const nbiHacinamiento = Number(nbi.hacinamiento) || 0;

    const inmat = inmatRows[0] || {};
    const inmatTotal = Number(inmat.total) || 0;
    const inmatCal1 = Number(inmat.cal1) || 0;

    const agua = aguaRows[0] || {};
    const aguaTotal = Number(agua.total) || 0;
    const aguaRed = Number(agua.red) || 0;
    const aguaBombaMotor = Number(agua.bomba_motor) || 0;
    const aguaOtras = Number(agua.otras) || 0;

    const combustible = combustibleRows[0] || {};
    const gasTotal = Number(combustible.total) || 0;
    const gasGarrafa = Number(combustible.garrafa) || 0;

    return NextResponse.json({
      demografia: {
        totalPoblacion: pop.toLocaleString('es-AR'),
        varonesPct: pct(varonesPct),
        mujeresPct: pct(mujeresPct),
        indiceMasculinidad: mujeresPct > 0 ? pct((varonesPct / mujeresPct) * 100) : '—',
        totalHogares: totalHogares.toLocaleString('es-AR'),
        personasPorHogar: pct(pop / totalHogares, 2),
      },
      trabajo: {
        actividad: `${pct(Number(w.actividad) || 0)} %`,
        empleo: `${pct(Number(w.empleo) || 0)} %`,
        desocupacion: `${pct(Number(w.desocupacion) || 0)} %`,
        empleadosObrerosPct: pct(Number(w.empleados_obreros) || 0),
        cuentaPropiaPct: pct(Number(w.cuenta_propia) || 0),
        servicioDomesticoPct: pct(Number(w.servicio_domestico) || 0),
      },
      educacionSalud: {
        secundariaCompleta: formatPctFromRatio(getSecundariaVal(edProv)) !== '—' ? `${formatPctFromRatio(getSecundariaVal(edProv))} %` : '31,3 %',
        secundariaPais: formatPctFromRatio(getSecundariaVal(edPais)) !== '—' ? `${formatPctFromRatio(getSecundariaVal(edPais))} %` : '34,7 %',
        secundariaNea: formatPctFromRatio(getSecundariaVal(edNea)) !== '—' ? `${formatPctFromRatio(getSecundariaVal(edNea))} %` : '29,6 %',
        conObraSocial: formatPctFromRatio(sCorrientes?.con_cobertura),
        sinCobertura: formatPctFromRatio(sCorrientes?.sin_cobertura),
        programasEstatales: formatPctFromRatio(sCorrientes?.programas_estatales),
        hogaresClimaMedio: Number(climaRows[0]?.medio || 0).toLocaleString('es-AR'),
      },
      habitat: {
        nbiPct: nbiTotal > 0 ? pct((nbiCon / nbiTotal) * 100) : '—',
        hacinamientoPct: nbiTotal > 0 ? pct((nbiHacinamiento / nbiTotal) * 100) : '—',
        inmatCal1Pct: inmatTotal > 0 ? pct((inmatCal1 / inmatTotal) * 100) : '—',
        internetPct: netTotal > 0 ? pct((netCon / netTotal) * 100) : '—',
        sinInternetPct: netTotal > 0 ? pct(((netTotal - netCon) / netTotal) * 100) : '—',
        aguaRedPct: aguaTotal > 0 ? pct((aguaRed / aguaTotal) * 100) : '—',
        aguaBombaMotorPct: aguaTotal > 0 ? pct((aguaBombaMotor / aguaTotal) * 100) : '—',
        aguaOtrasFuentesPct: aguaTotal > 0 ? pct((aguaOtras / aguaTotal) * 100) : '—',
        gasGarrafaPct: gasTotal > 0 ? pct((gasGarrafa / gasTotal) * 100) : '—',
      },
    });
  } catch (error) {
    console.error('Error al generar resumen:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}