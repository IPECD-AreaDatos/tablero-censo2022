import { NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

function gruposGetOrCreate(map: Map<string, any>, key: string, depto: string, muni: string) {
  if (!map.has(key)) {
    map.set(key, {
      departamento: depto,
      municipio: muni,
      total: 0,
      agropecuaria_pesca_o_mineria: 0,
      industria: 0,
      construccion: 0,
      comercio: 0,
      hotel_o_restaurante: 0,
      transporte_o_almacenamiento: 0,
      banco_financiera_o_aseguradora: 0,
      empresa_de_electricidad_gas_o_agua: 0,
      educacion_o_salud_privada: 0,
      educacion_o_salud_sin_determinar: 0,
      administracion_publica_educacion_o_salud_publica: 0,
      otros_servicios_personales_tecnicos_o_profesionales: 0,
      ignorado: 0,
    });
  }
  return map.get(key);
}

export async function GET() {
  try {
    const [rowsRama, rowsGeo] = await Promise.all([
      queryDwh(`SELECT * FROM rama_actividad_economica`),
      queryDatalake(`SELECT codigo_p18, depto_p18, municipio_p1 FROM base_p18_corrientes`).catch(() => [])
    ]);

    const geoMap = new Map<string | number, { depto: string; muni: string }>();
    for (const g of rowsGeo) {
      geoMap.set(Number(g.codigo_p18), {
        depto: g.depto_p18 || 'Sin Departamento',
        muni: g.municipio_p1 || g.depto_p18 || 'Sin Identificar',
      });
    }

    const grouped = new Map<string, any>();

    for (const r of rowsRama) {
      const codigoNum = Number(r.codigo);
      const geo = geoMap.get(codigoNum) || {
        depto: r.departamento || r.depto || 'Sin Departamento',
        muni: r.municipio || r.muni || r.depto || 'Sin Identificar',
      };

      const departamentoLimpio = geo.depto;
      const municipioLimpio = geo.muni;
      const key = `${departamentoLimpio}::${municipioLimpio}`;

      const current = gruposGetOrCreate(grouped, key, departamentoLimpio, municipioLimpio);

      const agro = Number(r.agropecuaria_pesca_o_mineria ?? 0) || 0;
      const ind = Number(r.industria ?? 0) || 0;
      const constr = Number(r.construccion ?? 0) || 0;
      const com = Number(r.comercio ?? 0) || 0;
      const hotel = Number(r.hotel_o_restaurante ?? 0) || 0;
      const transp = Number(r.transporte_o_almacenamiento ?? 0) || 0;
      const banco = Number(r.banco_financiera_o_aseguradora ?? 0) || 0;
      const elec = Number(r.empresa_de_electricidad_gas_o_agua ?? 0) || 0;
      const edSalPriv = Number(r.educacion_o_salud_privada ?? 0) || 0;
      
      const edSalSinDet = Number(
        r.educacion_o_salud_sin_determinar_si_es_publica_o_privada ??
        r.educacion_o_salud_sin_determinar ??
        0
      ) || 0;

      const adminPub = Number(r.administracion_publica_educacion_o_salud_publica ?? 0) || 0;
      const otros = Number(r.otros_servicios_personales_tecnicos_o_profesionales ?? 0) || 0;
      const ign = Number(r.ignorado ?? 0) || 0;

      const rowTotal = agro + ind + constr + com + hotel + transp + banco + elec + edSalPriv + edSalSinDet + adminPub + otros + ign;

      current.total += rowTotal;
      current.agropecuaria_pesca_o_mineria += agro;
      current.industria += ind;
      current.construccion += constr;
      current.comercio += com;
      current.hotel_o_restaurante += hotel;
      current.transporte_o_almacenamiento += transp;
      current.banco_financiera_o_aseguradora += banco;
      current.empresa_de_electricidad_gas_o_agua += elec;
      current.educacion_o_salud_privada += edSalPriv;
      current.educacion_o_salud_sin_determinar += edSalSinDet;
      current.administracion_publica_educacion_o_salud_publica += adminPub;
      current.otros_servicios_personales_tecnicos_o_profesionales += otros;
      current.ignorado += ign;

      grouped.set(key, current);
    }

    const territorios = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
    const totalPoblacion = territorios.reduce((acc, r) => acc + r.total, 0);

    const sectoresMeta = [
      { key: 'otros_servicios_personales_tecnicos_o_profesionales', sector: 'Otros Servicios Personales y Profesionales' },
      { key: 'comercio', sector: 'Comercio Mayorista y Minorista' },
      { key: 'administracion_publica_educacion_o_salud_publica', sector: 'Administración Pública, Educación y Salud Pública' },
      { key: 'educacion_o_salud_sin_determinar', sector: 'Educación o Salud (Sector Sin Determinar)' },
      { key: 'construccion', sector: 'Construcción' },
      { key: 'agropecuaria_pesca_o_mineria', sector: 'Agropecuaria, Pesca y Minería' },
      { key: 'industria', sector: 'Industria Manufacturera' },
      { key: 'educacion_o_salud_privada', sector: 'Educación o Salud Privada' },
      { key: 'transporte_o_almacenamiento', sector: 'Transporte y Almacenamiento' },
      { key: 'hotel_o_restaurante', sector: 'Alojamiento y Servicios de Comida (Hotelería)' },
      { key: 'empresa_de_electricidad_gas_o_agua', sector: 'Electricidad, Gas y Agua (Servicios)' },
      { key: 'banco_financiera_o_aseguradora', sector: 'Bancos, Financieras y Seguros' },
    ];

    const sectoresTotales = sectoresMeta.map((s) => {
      const valor = territorios.reduce((acc, r) => acc + (Number(r[s.key]) || 0), 0);
      const pct = totalPoblacion > 0 ? ((valor / totalPoblacion) * 100).toFixed(1).replace('.', ',') : '0,0';
      return { ...s, valor, pct };
    }).sort((a, b) => b.valor - a.valor);

    return NextResponse.json({
      totalPoblacion,
      principalSector: sectoresTotales[0] || null,
      pctComercioIndustria: (
        ((sectoresTotales.find(s => s.key === 'comercio')?.valor || 0) +
         (sectoresTotales.find(s => s.key === 'industria')?.valor || 0)) / (totalPoblacion || 1) * 100
      ).toFixed(1).replace('.', ','),
      sectores: sectoresTotales,
      territorios,
    });
  } catch (error) {
    console.error('Error al consultar actividad económica:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}