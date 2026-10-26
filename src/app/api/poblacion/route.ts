import { NextRequest, NextResponse } from 'next/server';
import { queryDwh } from '@/lib/db';

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

    const params: any[] = [];
    if (search.trim() !== '') {
      sql += ` WHERE LOWER(municipio) LIKE LOWER($1)`;
      params.push(`%${search.trim()}%`);
    }

    sql += ` ORDER BY poblacion_viv_part_2022 DESC`;

    const rows = await queryDwh(sql, params);

    const totalPoblacion = rows.reduce((acc, r) => acc + (Number(r.pop_2022) || 0), 0);
    const totalHogaresProv = 379129;
    const promedioHogarProv = totalHogaresProv > 0 && totalPoblacion > 0
      ? (totalPoblacion / totalHogaresProv).toFixed(2).replace('.', ',')
      : '3,19';

    return NextResponse.json({
      totalPoblacion,
      totalHogaresProv,
      promedioHogarProv,
      data: rows.map((r) => ({
        municipio: r.municipio,
        pop_2010: Number(r.pop_2010) || 0,
        pop_2022: Number(r.pop_2022) || 0,
        var_abs: Number(r.var_abs) || 0,
        peso_relativo: Number(r.peso_relativo) || 0,
        var_rel: Number(r.var_rel) || 0,
      })),
    });
  } catch (error) {
    console.error('Error al consultar población por municipio:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}