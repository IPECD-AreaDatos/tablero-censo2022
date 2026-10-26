import { NextRequest, NextResponse } from 'next/server';
import { queryDwh } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sql = `
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
    `;

    const rows = await queryDwh(sql);

    // Separamos la fila provincial "Total" si existe en la base
    const filaTotal = rows.find((r: any) => (r.departamento || '').toLowerCase().includes('total'));
    const rowsDeptos = rows.filter((r: any) => !(r.departamento || '').toLowerCase().includes('total'));

    const formatPct = (val: any) => {
      if (val === undefined || val === null) return '—';
      let num = Number(val);
      if (isNaN(num)) return '—';
      if (num > 0 && num <= 1) num *= 100;
      return `${num.toFixed(1).replace('.', ',')} %`;
    };

    return NextResponse.json({
      totalesProvincia: {
        actividad: filaTotal ? formatPct(filaTotal.actividad) : '55,3 %',
        empleo: filaTotal ? formatPct(filaTotal.empleo) : '51,0 %',
        desocupacion: filaTotal ? formatPct(filaTotal.desocupacion) : '7,9 %',
      },
      departamentos: rowsDeptos.map((r: any) => ({
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
    });
  } catch (error) {
    console.error('Error al consultar mercado de trabajo:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}