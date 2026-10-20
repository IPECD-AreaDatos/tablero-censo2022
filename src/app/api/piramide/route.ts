import { NextRequest, NextResponse } from 'next/server';
import { queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TABLAS_PIRAMIDE: Record<string, string> = {
  '1980': 'base_piramide_1980',
  '1991': 'base_piramide_1991',
  '2001': 'base_piramide_2001',
  '2010': 'base_piramide_2010',
  '2022': 'base_piramide_2022',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '2022';
    const tableName = TABLAS_PIRAMIDE[year];

    if (!tableName) {
      return NextResponse.json({ error: 'Año no válido' }, { status: 400 });
    }

    // Consultamos la tabla del datalake
    const rows = await queryDatalake(`
      SELECT 
        grupo_edad, 
        hombres::bigint as hombres, 
        mujeres::bigint as mujeres, 
        poblacion_total::bigint as poblacion_total
      FROM ${tableName}
    `);

    // Totales calculados
    let totalHombres = 0;
    let totalMujeres = 0;

    const data = rows.map((row) => {
      const h = Number(row.hombres) || 0;
      const m = Number(row.mujeres) || 0;
      totalHombres += h;
      totalMujeres += m;

      return {
        grupo_edad: row.grupo_edad,
        hombres: h,
        // Para el gráfico bidireccional en Recharts, hombres va en negativo
        hombresGrafico: -Math.abs(h),
        mujeres: m,
        total: Number(row.poblacion_total) || (h + m),
      };
    });

    const totalGeneral = totalHombres + totalMujeres;
    const indiceMasculinidad = totalMujeres > 0 
      ? ((totalHombres / totalMujeres) * 100).toFixed(1).replace('.', ',') 
      : '0';

    return NextResponse.json({
      year,
      totalGeneral,
      totalHombres,
      totalMujeres,
      pctHombres: totalGeneral > 0 ? ((totalHombres / totalGeneral) * 100).toFixed(1).replace('.', ',') : '0',
      pctMujeres: totalGeneral > 0 ? ((totalMujeres / totalGeneral) * 100).toFixed(1).replace('.', ',') : '0',
      indiceMasculinidad,
      data,
    });
  } catch (error) {
    console.error('Error al obtener datos de pirámide:', error);
    return NextResponse.json(
      { error: 'Error al consultar la base de datos' },
      { status: 500 }
    );
  }
}