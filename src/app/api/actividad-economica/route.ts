import { NextRequest, NextResponse } from 'next/server';
import { queryDwh } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rows = await queryDwh(`
      SELECT 
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
    `);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron registros' }, { status: 404 });
    }

    const r = rows[0];

    const sectoresBase = [
      { sector: 'Otros Servicios Personales y Profesionales', valor: Number(r.otros_servicios) || 0 },
      { sector: 'Comercio Mayorista y Minorista', valor: Number(r.comercio) || 0 },
      { sector: 'Administración Pública, Educación y Salud Pública', valor: Number(r.admin_publica) || 0 },
      { sector: 'Construcción', valor: Number(r.construccion) || 0 },
      { sector: 'Agropecuaria, Pesca y Minería', valor: Number(r.agro) || 0 },
      { sector: 'Industria Manufacturera', valor: Number(r.industria) || 0 },
      { sector: 'Educación o Salud Privada', valor: Number(r.educ_salud_privada) || 0 },
      { sector: 'Transporte y Almacenamiento', valor: Number(r.transporte) || 0 },
      { sector: 'Alojamiento y Servicios de Comida (Hotelería)', valor: Number(r.hoteleria_gastronomia) || 0 },
      { sector: 'Electricidad, Gas y Agua (Servicios)', valor: Number(r.servicios_publicos) || 0 },
      { sector: 'Bancos, Financieras y Seguros', valor: Number(r.finanzas_seguros) || 0 },
    ].sort((a, b) => b.valor - a.valor);

    const totalPoblacion = sectoresBase.reduce((acc, s) => acc + s.valor, 0);

    const comercioVal = Number(r.comercio) || 0;
    const industriaVal = Number(r.industria) || 0;
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
    });
  } catch (error) {
    console.error('Error al consultar ramas de actividad:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}