import { NextRequest, NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let sql = `
      SELECT 
        municipio,
        poblacion_viv_part_2010::bigint as pop_2010,
        poblacion_viv_part_2022::bigint as pop_2022,
        var_abs_poblacion_2010_vs_2022::bigint as var_abs,
        peso_relativo_2022::numeric as peso_relativo,
        var_rel_poblacion_2010_vs_2022::numeric as var_rel
      FROM censo_ipecd_municipios
    `;

    const params: string[] = [];
    if (search.trim() !== '') {
      sql += ` WHERE LOWER(municipio) LIKE LOWER($1)`;
      params.push(`%${search.trim()}%`);
    }

    sql += ` ORDER BY poblacion_viv_part_2022 DESC`;

    const [rows, rowsHogares] = await Promise.all([
      queryDwh(sql, params),
      queryDatalake(`
        SELECT
          p.depto_p18 as departamento,
          p.municipio_p1 as municipio,
          SUM(b.total_viviendas)::bigint as total_hogares
        FROM base_clima_educativo_hogar b
        INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
        GROUP BY p.depto_p18, p.municipio_p1
      `),
    ]);

    const normalize = (value: string) => value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const aliases: Record<string, string> = {
      'san antonio isla apipe grande': 'san antonio de apipe',
      'santa rosa': 'colonia santa rosa',
    };
    const municipalityKey = (value: string) => {
      const key = normalize(value || '');
      return aliases[key] || key;
    };
    const municipalityKeys = new Set(rows.map((row) => municipalityKey(row.municipio)));
    const geographyByMunicipality = new Map<string, { departamento: string; total_hogares: number }>();
    let hogaresSinMunicipio = 0;

    for (const row of rowsHogares) {
      const key = municipalityKey(row.municipio || '');
      const hogares = Number(row.total_hogares) || 0;
      if (!key || !municipalityKeys.has(key)) {
        hogaresSinMunicipio += hogares;
        continue;
      }

      const current = geographyByMunicipality.get(key);
      geographyByMunicipality.set(key, {
        departamento: row.departamento || 'Sin departamento',
        total_hogares: (current?.total_hogares || 0) + hogares,
      });
    }

    const totalPoblacion = rows.reduce((acc, r) => acc + (Number(r.pop_2022) || 0), 0);
    const totalHogaresProv = rowsHogares.reduce((acc, r) => acc + (Number(r.total_hogares) || 0), 0);
    const promedioHogarProv = totalHogaresProv > 0 && totalPoblacion > 0
      ? (totalPoblacion / totalHogaresProv).toFixed(2).replace('.', ',')
      : '3,19';

    return NextResponse.json({
      totalPoblacion,
      totalHogaresProv,
      promedioHogarProv,
      data: rows.map((r) => ({
        municipio: r.municipio,
        departamento: geographyByMunicipality.get(municipalityKey(r.municipio))?.departamento || 'Sin departamento',
        pop_2010: Number(r.pop_2010) || 0,
        pop_2022: Number(r.pop_2022) || 0,
        var_abs: Number(r.var_abs) || 0,
        peso_relativo: Number(r.peso_relativo) || 0,
        var_rel: Number(r.var_rel) || 0,
        total_hogares: (geographyByMunicipality.get(municipalityKey(r.municipio))?.total_hogares || 0)
          + (normalize(r.municipio || '') === 'indeterminado' ? hogaresSinMunicipio : 0),
      })),
    });
  } catch (error) {
    console.error('Error al consultar población por municipio:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}