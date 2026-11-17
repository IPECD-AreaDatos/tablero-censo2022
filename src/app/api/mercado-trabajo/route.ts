import { NextResponse } from 'next/server';
import { queryDatalake } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rowsTasas, rowsCat] = await Promise.all([
      queryDatalake(`
        SELECT 
          COALESCE(p.depto_p18, 'Sin Departamento') AS departamento,
          COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') AS municipio,
          SUM(COALESCE(b.ocupado, 0))::bigint AS ocupado,
          SUM(COALESCE(b.desocupado, 0))::bigint AS desocupado,
          SUM(COALESCE(b.inactivo, 0))::bigint AS inactivo,
          SUM(COALESCE(b.total_poblacion, 0))::bigint AS total_poblacion,
          COUNT(*)::int AS cantidad_registros,
          AVG(b."%_actividad") AS tasa_actividad,
          AVG(b."%_empleo") AS tasa_empleo,
          AVG(b."%_desocupacion") AS tasa_desocupacion
        FROM base_tasas_mercado_trabajo b
        INNER JOIN base_p18_corrientes p ON b.codigo = p.codigo_p18
        GROUP BY 
          COALESCE(p.depto_p18, 'Sin Departamento'), 
          COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar')
        ORDER BY total_poblacion DESC
      `),
      queryDatalake(`
        SELECT 
          COALESCE(p.depto_p18, 'Sin Departamento') AS departamento,
          COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar') AS municipio,
          SUM(COALESCE(c.empleado_u_obrero, 0))::bigint AS empleado_obrero,
          SUM(COALESCE(c.cuenta_propia, 0))::bigint AS cuenta_propia,
          SUM(COALESCE(c.patron_o_empleador, 0))::bigint AS patron_empleador,
          SUM(COALESCE(c.trabajador_familiar, 0))::bigint AS trabajador_familiar,
          SUM(COALESCE(c.servicio_domestico, 0))::bigint AS servicio_domestico
        FROM base_categoria_ocupacional c
        INNER JOIN base_p18_corrientes p ON c.codigo = p.codigo_p18
        GROUP BY 
          COALESCE(p.depto_p18, 'Sin Departamento'), 
          COALESCE(p.municipio_p1, p.depto_p18, 'Sin Identificar')
      `).catch(() => []),
    ]);

    const catMap = new Map<
      string,
      {
        servicio_domestico: number;
        empleado_obrero: number;
        cuenta_propia: number;
        patron_empleador: number;
        trabajador_familiar: number;
      }
    >();
    for (const c of rowsCat) {
      catMap.set(`${c.departamento}::${c.municipio}`, c);
    }

    let provRegistros = 0;
    let provActividad = 0;
    let provEmpleo = 0;
    let provDesocupacion = 0;

    const detalle = rowsTasas.map((r) => {
      const ocupado = Number(r.ocupado) || 0;
      const desocupado = Number(r.desocupado) || 0;
      const inactivo = Number(r.inactivo) || 0;
      const pob = Number(r.total_poblacion) || ocupado + desocupado + inactivo;
      const cantidadRegistros = Number(r.cantidad_registros) || 0;

      provRegistros += cantidadRegistros;
      provActividad += (Number(r.tasa_actividad) || 0) * cantidadRegistros;
      provEmpleo += (Number(r.tasa_empleo) || 0) * cantidadRegistros;
      provDesocupacion += (Number(r.tasa_desocupacion) || 0) * cantidadRegistros;

      const actividad = (Number(r.tasa_actividad) || 0) * 100;
      const empleo = (Number(r.tasa_empleo) || 0) * 100;
      const desocupacion = (Number(r.tasa_desocupacion) || 0) * 100;

      const cat = catMap.get(`${r.departamento}::${r.municipio}`);

      return {
        departamento: r.departamento,
        municipio: r.municipio,
        nombre: r.municipio,
        ocupado,
        desocupado,
        inactivo,
        poblacion: pob,
        cantidad_registros: cantidadRegistros,
        actividad,
        empleo,
        desocupacion,
        servicio_domestico: Number(cat?.servicio_domestico) || 0,
        empleado_obrero: Number(cat?.empleado_obrero ?? ocupado) || 0,
        cuenta_propia: Number(cat?.cuenta_propia ?? desocupado) || 0,
        patron_empleador: Number(cat?.patron_empleador) || 0,
        trabajador_familiar: Number(cat?.trabajador_familiar) || 0,
      };
    });

    const provAct = provRegistros > 0 ? (provActividad / provRegistros) * 100 : 0;
    const provEmp = provRegistros > 0 ? (provEmpleo / provRegistros) * 100 : 0;
    const provDes = provRegistros > 0 ? (provDesocupacion / provRegistros) * 100 : 0;

    return NextResponse.json({
      totalesProvincia: {
        actividad: `${provAct.toFixed(1).replace('.', ',')} %`,
        empleo: `${provEmp.toFixed(1).replace('.', ',')} %`,
        desocupacion: `${provDes.toFixed(1).replace('.', ',')} %`,
      },
      detalle,
    });
  } catch (error) {
    console.error('Error al consultar mercado de trabajo:', error);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}