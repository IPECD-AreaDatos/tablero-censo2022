import { NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

const niveles = [
  { key: 'secundaria_incompleta', label: 'Secundaria incompleta' },
  { key: 'secundaria_completa', label: 'Secundaria completa' },
  { key: 'superior_completo', label: 'Superior / universitario completo' },
] as const;

type NivelKey = typeof niveles[number]['key'];
type FilaComparativa = {
  division_geo: string;
  secundario_incompleto: number | string | null;
  secundario_completo: number | string | null;
  terciario_completo: number | string | null;
  universitario_completo: number | string | null;
  posgrado_completo: number | string | null;
};
type FilaTerritorio = {
  departamento: string;
  municipio: string;
  poblacion_2022: number | string;
  secundaria_incompleta: number | string | null;
  secundaria_completa: number | string | null;
  superior_completo: number | string | null;
};

export async function GET() {
  try {
    const [rowsDeptos, rowsComparativa] = await Promise.all([
      queryDatalake<FilaTerritorio>(`
        SELECT
          COALESCE(p.depto_p18, 'Sin departamento') AS departamento,
          COALESCE(p.municipio_p1, p.depto_p18, 'Sin municipio') AS municipio,
          SUM(b.total_poblacion)::bigint AS poblacion_2022,
          SUM(b.secundario_incompleto)::bigint AS secundaria_incompleta,
          SUM(b.secundario_completo)::bigint AS secundaria_completa,
          SUM(b.terciario_completo + b.universitario_completo + b.posgrado_completo)::bigint AS superior_completo
        FROM base_nivel_educativo_mayores_25 b
        INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
        GROUP BY COALESCE(p.depto_p18, 'Sin departamento'), COALESCE(p.municipio_p1, p.depto_p18, 'Sin municipio')
        ORDER BY poblacion_2022 DESC
      `),
      queryDwh<FilaComparativa>(`
        SELECT
          division_geo,
          secundario_incompleto,
          secundario_completo,
          terciario_completo,
          universitario_completo,
          posgrado_completo
        FROM censo_nea_nacion_nivel_educativo_mayores_25
      `),
    ]);

    const cleanStr = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const comparativa = {
      provincia: rowsComparativa.find((row) => cleanStr(row.division_geo).includes('corrientes')),
      pais: rowsComparativa.find((row) => {
        const division = cleanStr(row.division_geo);
        return division.includes('pais') || division.includes('nacion') || division.includes('total');
      }),
      nea: rowsComparativa.find((row) => cleanStr(row.division_geo).includes('nea')),
    };
    const valorComparativo = (row: FilaComparativa | undefined, nivel: NivelKey) => {
      if (!row) return null;
      if (nivel === 'secundaria_incompleta') return Number(row.secundario_incompleto);
      if (nivel === 'secundaria_completa') return Number(row.secundario_completo);
      return Number(row.terciario_completo) + Number(row.universitario_completo) + Number(row.posgrado_completo);
    };

    const territorios = rowsDeptos.map((row) => {
      const poblacion = Number(row.poblacion_2022) || 0;
      return {
        departamento: row.departamento,
        municipio: row.municipio,
        poblacion_2022: poblacion,
        secundaria_incompleta: Number(row.secundaria_incompleta) || 0,
        secundaria_completa: Number(row.secundaria_completa) || 0,
        superior_completo: Number(row.superior_completo) || 0,
        pct_secundaria_incompleta: poblacion > 0 ? (Number(row.secundaria_incompleta) / poblacion) * 100 : 0,
        pct_secundaria_completa: poblacion > 0 ? (Number(row.secundaria_completa) / poblacion) * 100 : 0,
        pct_superior_completo: poblacion > 0 ? (Number(row.superior_completo) / poblacion) * 100 : 0,
      };
    });
    const totalMayores25Prov = territorios.reduce((total, row) => total + row.poblacion_2022, 0);

    return NextResponse.json({
      niveles,
      totalMayores25: totalMayores25Prov,
      comparativa: Object.fromEntries(Object.entries(comparativa).map(([region, row]) => [
        region,
        Object.fromEntries(niveles.map(({ key }) => [key, valorComparativo(row, key)])),
      ])),
      territorios,
    });
  } catch (error) {
    console.error('Error general en API educacion:', error);
    return NextResponse.json({ error: 'Error al consultar educación' }, { status: 500 });
  }
}