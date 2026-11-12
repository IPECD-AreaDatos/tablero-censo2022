import { NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

const sectoresConfig = [
  { key: 'otros_servicios', sector: 'Otros Servicios Personales y Profesionales' },
  { key: 'comercio', sector: 'Comercio Mayorista y Minorista' },
  { key: 'admin_publica', sector: 'Administración Pública, Educación y Salud Pública' },
  { key: 'construccion', sector: 'Construcción' },
  { key: 'agro', sector: 'Agropecuaria, Pesca y Minería' },
  { key: 'industria', sector: 'Industria Manufacturera' },
  { key: 'educ_salud_privada', sector: 'Educación o Salud Privada' },
  { key: 'transporte', sector: 'Transporte y Almacenamiento' },
  { key: 'hoteleria_gastronomia', sector: 'Alojamiento y Servicios de Comida (Hotelería)' },
  { key: 'servicios_publicos', sector: 'Electricidad, Gas y Agua (Servicios)' },
  { key: 'finanzas_seguros', sector: 'Bancos, Financieras y Seguros' },
] as const;

type SectorKey = typeof sectoresConfig[number]['key'];
type ActivityRow = Record<SectorKey, number | string | null> & { codigo: number | string };
type GeographyRow = { codigo_p18: number | string; depto_p18: string | null; municipio_p1: string | null };
type TerritoryAggregate = {
  departamento: string;
  municipio: string;
  total: number;
} & Record<SectorKey, number>;

export async function GET() {
  try {
    const [rowsActividad, rowsGeografia] = await Promise.all([
      queryDwh<ActivityRow>(`
      SELECT 
        codigo,
        SUM(comercio)::bigint as comercio,
        SUM(industria)::bigint as industria,
        SUM(agropecuaria_pesca_o_mineria)::bigint as agro,
        SUM(construccion)::bigint as construccion,
        SUM(transporte_o_almacenamiento)::bigint as transporte,
        SUM(hotel_o_restaurante)::bigint as hoteleria_gastronomia,
        SUM(banco_financiera_o_aseguradora)::bigint as finanzas_seguros,
        SUM(educacion_o_salud_privada)::bigint as educ_salud_privada,
        SUM(empresa_de_electricidad_gas_o_agua)::bigint as servicios_publicos,
        SUM(otros_servicios_personales_tecnicos_o_profesionales)::bigint as otros_servicios,
        SUM(administracion_publica_educacion_o_salud_publica)::bigint as admin_publica
      FROM rama_actividad_economica
      GROUP BY codigo
      `),
      queryDatalake<GeographyRow>(`
        SELECT codigo_p18, depto_p18, municipio_p1
        FROM base_p18_corrientes
      `),
    ]);

    if (!rowsActividad || rowsActividad.length === 0) {
      return NextResponse.json({ error: 'No se encontraron registros' }, { status: 404 });
    }

    const geografiaPorCodigo = new Map<string, GeographyRow>(
      rowsGeografia.map((row) => [String(row.codigo_p18), row]),
    );
    const territoriosPorClave = new Map<string, TerritoryAggregate>();

    for (const row of rowsActividad) {
      const geografia = geografiaPorCodigo.get(String(row.codigo));
      const departamento = geografia?.depto_p18 || 'Sin departamento';
      const municipio = geografia?.municipio_p1 || 'Sin municipio';
      const clave = `${departamento}::${municipio}`;
      const territorio: TerritoryAggregate = territoriosPorClave.get(clave) || {
        departamento,
        municipio,
        total: 0,
        ...Object.fromEntries(sectoresConfig.map(({ key }) => [key, 0])),
      } as TerritoryAggregate;

      for (const { key } of sectoresConfig) {
        territorio[key] += Number(row[key]) || 0;
      }
      territorio.total += sectoresConfig.reduce((total, { key }) => total + (Number(row[key]) || 0), 0);
      territoriosPorClave.set(clave, territorio);
    }

    const territorios = Array.from(territoriosPorClave.values())
      .sort((a, b) => b.total - a.total);

    const totalPoblacion = territorios.reduce((total, territorio) => total + territorio.total, 0);
    const sectoresBase = sectoresConfig.map(({ key, sector }) => ({
      key,
      sector,
      valor: territorios.reduce((total, territorio) => total + territorio[key], 0),
    })).sort((a, b) => b.valor - a.valor);

    const comercioVal = sectoresBase.find((sector) => sector.key === 'comercio')?.valor || 0;
    const industriaVal = sectoresBase.find((sector) => sector.key === 'industria')?.valor || 0;
    const pctComercioIndustria = totalPoblacion > 0
      ? (((comercioVal + industriaVal) / totalPoblacion) * 100).toFixed(1).replace('.', ',')
      : '0,0';

    const sectores = sectoresBase.map((s) => ({
      ...s,
      pct: totalPoblacion > 0 ? ((s.valor / totalPoblacion) * 100).toFixed(1).replace('.', ',') : '0,0',
    }));

    return NextResponse.json({
      totalPoblacion,
      principalSector: sectores[0] || null,
      pctComercioIndustria,
      sectores,
      territorios,
    });
  } catch (error) {
    console.error('Error al consultar ramas de actividad:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}