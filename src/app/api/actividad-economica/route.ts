import { NextRequest, NextResponse } from 'next/server';
import { queryDwh } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Consultamos las ramas sumando los valores de la tabla
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

    const sectores = [
      { sector: 'Administración Pública, Educación y Salud Pública', valor: Number(r.admin_publica) || 0, color: '#1e3a8a' },
      { sector: 'Comercio Mayorista y Minorista', valor: Number(r.comercio) || 0, color: '#047857' },
      { sector: 'Agropecuaria, Pesca y Minería', valor: Number(r.agro) || 0, color: '#059669' },
      { sector: 'Industria Manufacturera', valor: Number(r.industria) || 0, color: '#2563eb' },
      { sector: 'Construcción', valor: Number(r.construccion) || 0, color: '#d97706' },
      { sector: 'Otros Servicios Personales y Profesionales', valor: Number(r.otros_servicios) || 0, color: '#6366f1' },
      { sector: 'Transporte y Almacenamiento', valor: Number(r.transporte) || 0, color: '#0891b2' },
      { sector: 'Educación o Salud Privada', valor: Number(r.educ_salud_privada) || 0, color: '#10b981' },
      { sector: 'Alojamiento y Servicios de Comida (Hotelería)', valor: Number(r.hoteleria_gastronomia) || 0, color: '#ea580c' },
      { sector: 'Electricidad, Gas y Agua (Servicios)', valor: Number(r.servicios_publicos) || 0, color: '#64748b' },
      { sector: 'Bancos, Financieras y Seguros', valor: Number(r.finanzas_seguros) || 0, color: '#475569' },
    ].sort((a, b) => b.valor - a.valor);

    const totalOcupados = sectores.reduce((acc, s) => acc + s.valor, 0);

    const sectoresConPct = sectores.map((s) => ({
      ...s,
      porcentaje: totalOcupados > 0 ? ((s.valor / totalOcupados) * 100).toFixed(1).replace('.', ',') : '0',
    }));

    return NextResponse.json({
      totalOcupados,
      topSector: sectoresConPct[0] || null,
      sectores: sectoresConPct,
    });
  } catch (error) {
    console.error('Error al consultar ramas de actividad:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}