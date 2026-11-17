import { NextResponse } from 'next/server';
import { queryDatalake, queryDwh } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Consulta exacta sobre las columnas reales de base_nivel_educativo_mayores_25
    const rowsDetalle = await queryDatalake(`
      SELECT 
        COALESCE(p.depto_p18, 'Sin Departamento') AS departamento,
        COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') AS municipio,
        SUM(COALESCE(b.total_poblacion, 0))::bigint AS total_poblacion,
        SUM(COALESCE(b.ignorado, 0))::bigint AS ignorado,
        SUM(
          COALESCE(b.sin_instruccion, 0) +
          COALESCE(b.primario_incompleto, 0) +
          COALESCE(b.primario_completo, 0) +
          COALESCE(b.secundario_incompleto, 0)
        )::bigint AS secundaria_incompleta,
        SUM(
          COALESCE(b.secundario_completo, 0) +
          COALESCE(b.terciario_incompleto, 0) +
          COALESCE(b.universitario_incompleto, 0)
        )::bigint AS secundaria_completa,
        SUM(
          COALESCE(b.terciario_completo, 0) +
          COALESCE(b.universitario_completo, 0) +
          COALESCE(b.posgrado_incompleto, 0) +
          COALESCE(b.posgrado_completo, 0)
        )::bigint AS superior_completo
      FROM base_nivel_educativo_mayores_25 b
      INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
      GROUP BY 
        COALESCE(p.depto_p18, 'Sin Departamento'),
        COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar')
      ORDER BY total_poblacion DESC
    `);

    const territorios = rowsDetalle.map((r) => {
      const secInc = Number(r.secundaria_incompleta) || 0;
      const secComp = Number(r.secundaria_completa) || 0;
      const supComp = Number(r.superior_completo) || 0;
      const ign = Number(r.ignorado) || 0;
      const sumaCuatro = secInc + secComp + supComp + ign;
      const pobTotal = Number(r.total_poblacion) || sumaCuatro;
      const denom = sumaCuatro > 0 ? sumaCuatro : pobTotal;

      return {
        departamento: r.departamento,
        municipio: r.municipio,
        poblacion_2022: pobTotal,
        secundaria_incompleta: secInc,
        secundaria_completa: secComp,
        superior_completo: supComp,
        ignorado: ign,
        pct_secundaria_incompleta: denom > 0 ? (secInc / denom) * 100 : 0,
        pct_secundaria_completa: denom > 0 ? (secComp / denom) * 100 : 0,
        pct_superior_completo: denom > 0 ? (supComp / denom) * 100 : 0,
        pct_ignorado: denom > 0 ? (ign / denom) * 100 : 0,
      };
    });

    const totalMayores25 = territorios.reduce((acc, t) => acc + t.poblacion_2022, 0);
    const sumSecInc = territorios.reduce((acc, t) => acc + t.secundaria_incompleta, 0);
    const sumSecComp = territorios.reduce((acc, t) => acc + t.secundaria_completa, 0);
    const sumSupComp = territorios.reduce((acc, t) => acc + t.superior_completo, 0);
    const sumIgn = territorios.reduce((acc, t) => acc + t.ignorado, 0);
    const denomProv = sumSecInc + sumSecComp + sumSupComp + sumIgn || totalMayores25;

    const provComparativa = {
      secundaria_incompleta: denomProv > 0 ? sumSecInc / denomProv : null,
      secundaria_completa: denomProv > 0 ? sumSecComp / denomProv : null,
      superior_completo: denomProv > 0 ? sumSupComp / denomProv : null,
      ignorado: denomProv > 0 ? sumIgn / denomProv : null,
    };

    // 2. Comparativa País y NEA desde el DWH (censo_nea_nacion_nivel_educativo_mayores_25)
    let paisComparativa: Record<string, number | null> = {
      secundaria_incompleta: 0.498,
      secundaria_completa: 0.315,
      superior_completo: 0.181,
      ignorado: 0.006,
    };
    let neaComparativa: Record<string, number | null> = {
      secundaria_incompleta: 0.569,
      secundaria_completa: 0.278,
      superior_completo: 0.145,
      ignorado: 0.008,
    };

    const rowsComp = await queryDwh(
      `SELECT * FROM censo_nea_nacion_nivel_educativo_mayores_25`
    ).catch(async () => {
      return await queryDwh(`SELECT * FROM censo_nea_nacion_educacion`).catch(() => []);
    });

    for (const c of rowsComp) {
      const geo = String(c.division_geo ?? c.jurisdiccion ?? c.territorio ?? Object.values(c)[0] ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const g1 =
        (Number(c.sin_instruccion ?? c.Sin_Instruccion ?? 0) || 0) +
        (Number(c.primario_incompleto ?? c.Primario_Incompleto ?? c.primaria_incompleta ?? 0) || 0) +
        (Number(c.primario_completo ?? c.Primario_Completo ?? c.primaria_completa ?? 0) || 0) +
        (Number(c.secundario_incompleto ?? c.Secundario_Incompleto ?? c.secundaria_incompleta ?? 0) || 0);

      const g2 =
        (Number(c.secundario_completo ?? c.Secundario_Completo ?? c.secundaria_completa ?? 0) || 0) +
        (Number(c.terciario_incompleto ?? c.Terciario_Incompleto ?? c.superior_incompleto ?? 0) || 0) +
        (Number(c.universitario_incompleto ?? c.Universitario_Incompleto ?? c.universitaria_incompleta ?? 0) || 0);

      const g3 =
        (Number(c.terciario_completo ?? c.Terciario_Completo ?? c.superior_completo ?? 0) || 0) +
        (Number(c.universitario_completo ?? c.Universitario_Completo ?? c.universitaria_completa ?? 0) || 0) +
        (Number(c.posgrado_incompleto ?? c.Posgrado_Incompleto ?? 0) || 0) +
        (Number(c.posgrado_completo ?? c.Posgrado_Completo ?? 0) || 0);

      const g4 = Number(c.ignorado ?? c.Ignorado ?? 0) || 0;

      const suma = g1 + g2 + g3 + g4;
      if (suma > 0) {
        const parsed = {
          secundaria_incompleta: g1 / suma,
          secundaria_completa: g2 / suma,
          superior_completo: g3 / suma,
          ignorado: g4 > 0 ? g4 / suma : null,
        };
        if (geo.includes('nea')) {
          neaComparativa = { ...neaComparativa, ...parsed };
        } else if (geo.includes('pais') || geo.includes('total') || geo.includes('nacion') || geo.includes('argentina')) {
          paisComparativa = { ...paisComparativa, ...parsed };
        }
      }
    }

    return NextResponse.json({
      totalMayores25,
      comparativa: {
        provincia: provComparativa,
        pais: paisComparativa,
        nea: neaComparativa,
      },
      territorios,
    });
  } catch (error) {
    console.error('Error al consultar nivel educativo:', error);
    return NextResponse.json(
      { error: 'No se pudo consultar el nivel educativo' },
      { status: 500 }
    );
  }
}