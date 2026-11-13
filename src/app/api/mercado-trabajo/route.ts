import { NextRequest, NextResponse } from 'next/server';
import { queryDwh, queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [rowsDeptos, rowsMunicipios] = await Promise.all([
      queryDwh(`
        SELECT 
          departamento,
          poblacion_2022::bigint as poblacion,
          tasa_de_actividad::numeric as actividad,
          tasa_de_empleo::numeric as empleo,
          tasa_de_desocup::numeric as desocupacion,
          categoria_ocupacional_servicio_domestico::bigint as servicio_domestico,
          categoria_ocupacional_empleado_u_obrero::bigint as empleado_obrero,
          categoria_ocupacional_cuenta_propia::bigint as cuenta_propia,
          categoria_ocupacional_patron_o_empleador::bigint as patron_empleador,
          categoria_ocupacional_trabajador_familiar::bigint as trabajador_familiar
        FROM censo_ipecd_departamentos
        ORDER BY poblacion_2022 DESC
      `),
      queryDatalake(`
        SELECT DISTINCT
          COALESCE(depto_p18, 'Sin Departamento') as departamento,
          COALESCE(municipio_p1, depto_p18, 'Sin Identificar') as municipio
        FROM base_p18_corrientes
        WHERE municipio_p1 IS NOT NULL
      `).catch(() => []),
    ]);

    const filaTotal = rowsDeptos.find((r: any) => (r.departamento || '').toLowerCase().includes('total'));
    const soloDeptos = rowsDeptos.filter((r: any) => !(r.departamento || '').toLowerCase().includes('total'));

    const formatPct = (val: any) => {
      if (val === undefined || val === null) return '—';
      let num = Number(val);
      if (isNaN(num)) return '—';
      if (num > 0 && num <= 1) num *= 100;
      return `${num.toFixed(1).replace('.', ',')} %`;
    };

    const normalize = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Construimos la lista jerárquica (Municipio + Departamento) para el TerritoryFilter
    const detalleTerritorial: any[] = [];

    for (const d of soloDeptos) {
      const munisDelDepto = rowsMunicipios.filter(
        (m: any) => normalize(m.departamento) === normalize(d.departamento)
      );

      const baseMetrics = {
        poblacion: Number(d.poblacion) || 0,
        actividad: Number(d.actividad) || 0,
        empleo: Number(d.empleo) || 0,
        desocupacion: Number(d.desocupacion) || 0,
        servicio_domestico: Number(d.servicio_domestico) || 0,
        empleado_obrero: Number(d.empleado_obrero) || 0,
        cuenta_propia: Number(d.cuenta_propia) || 0,
        patron_empleador: Number(d.patron_empleador) || 0,
        trabajador_familiar: Number(d.trabajador_familiar) || 0,
      };

      if (munisDelDepto.length > 0) {
        for (const m of munisDelDepto) {
          detalleTerritorial.push({
            departamento: d.departamento,
            municipio: m.municipio,
            nombre: m.municipio,
            ...baseMetrics,
          });
        }
      } else {
        detalleTerritorial.push({
          departamento: d.departamento,
          municipio: d.departamento,
          nombre: d.departamento,
          ...baseMetrics,
        });
      }
    }

    return NextResponse.json({
      totalesProvincia: {
        actividad: filaTotal ? formatPct(filaTotal.actividad) : '56,0 %',
        empleo: filaTotal ? formatPct(filaTotal.empleo) : '50,8 %',
        desocupacion: filaTotal ? formatPct(filaTotal.desocupacion) : '9,2 %',
      },
      departamentos: soloDeptos.map((r: any) => ({
        departamento: r.departamento,
        poblacion: Number(r.poblacion) || 0,
        actividad: Number(r.actividad) || 0,
        empleo: Number(r.empleo) || 0,
        desocupacion: Number(r.desocupacion) || 0,
        servicio_domestico: Number(r.servicio_domestico) || 0,
        empleado_obrero: Number(r.empleado_obrero) || 0,
        cuenta_propia: Number(r.cuenta_propia) || 0,
        patron_empleador: Number(r.patron_empleador) || 0,
        trabajador_familiar: Number(r.trabajador_familiar) || 0,
      })),
      detalle: detalleTerritorial,
    });
  } catch (error) {
    console.error('Error al consultar mercado de trabajo:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}