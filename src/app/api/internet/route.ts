import { NextRequest, NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Comparativa Provincial, NEA y País desde censo_nea_nacion_internet
    const rowsComparativa = await queryDwh(`
      SELECT 
        division_geo,
        "Si_Internet"::numeric as si_internet,
        "No_Internet"::numeric as no_internet
      FROM censo_nea_nacion_internet
    `).catch(() => []);

    const cleanStr = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const formatPct = (val: any) => {
      if (val === undefined || val === null) return '—';
      let num = Number(val);
      if (isNaN(num)) return '—';
      if (num > 0 && num <= 1) num *= 100;
      return `${num.toFixed(1).replace('.', ',')} %`;
    };

    const filaNea = rowsComparativa.find((c: any) => cleanStr(c.division_geo).includes('nea'));
    const filaPais = rowsComparativa.find((c: any) => {
      const nom = cleanStr(c.division_geo);
      return nom.includes('pais') || nom.includes('total') || nom.includes('nacion');
    });

    // 2. Detalle territorial consolidado por departamento y municipio
    const rowsRaw = await queryDatalake(`
      SELECT 
        b.*,
        COALESCE(p.depto_p18, 'Sin Departamento') as depto_geo,
        COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') as muni_geo
      FROM base_internet b
      INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
    `);

    const grouped = new Map<string, any>();

    for (const r of rowsRaw) {
      const depto = r.depto_geo;
      const muni = r.muni_geo;
      const key = `${depto}::${muni}`;

      const current = grouped.get(key) || {
        departamento: depto,
        municipio: muni,
        nombre: muni,
        total_viviendas: 0,
        con_internet: 0,
        sin_internet: 0,
      };

      const tot = Number(r.total_viviendas ?? r.total_vivienda ?? 0) || 0;
      const con = Number(r.si_internet ?? r.con_internet ?? r.tiene_internet ?? 0) || 0;
      const sin = Number(r.no_internet ?? r.sin_internet ?? r.no_tiene_internet ?? 0) || 0;

      current.total_viviendas += tot;
      current.con_internet += con;
      current.sin_internet += sin;

      grouped.set(key, current);
    }

    const rowsDetalle = Array.from(grouped.values()).sort(
      (a, b) => b.total_viviendas - a.total_viviendas
    );

    const totalViviendas = rowsDetalle.reduce((acc, r) => acc + r.total_viviendas, 0);
    const sumConInternet = rowsDetalle.reduce((acc, r) => acc + r.con_internet, 0);
    const sumSinInternet = rowsDetalle.reduce((acc, r) => acc + r.sin_internet, 0);

    return NextResponse.json({
      totalesProvincia: {
        totalViviendas,
        sumConInternet,
        sumSinInternet,
      },
      kpis: {
        pais: {
          con_internet: filaPais ? formatPct(filaPais.si_internet) : '76,5 %',
          sin_internet: filaPais ? formatPct(filaPais.no_internet) : '23,5 %',
        },
        nea: {
          con_internet: filaNea ? formatPct(filaNea.si_internet) : '59,6 %',
          sin_internet: filaNea ? formatPct(filaNea.no_internet) : '40,4 %',
        },
      },
      detalle: rowsDetalle.map((r) => {
        const tot = r.total_viviendas || 1;
        return {
          ...r,
          pct_con_internet: ((r.con_internet / tot) * 100).toFixed(1),
          pct_sin_internet: ((r.sin_internet / tot) * 100).toFixed(1),
        };
      }),
    });
  } catch (error) {
    console.error('Error al consultar internet:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}