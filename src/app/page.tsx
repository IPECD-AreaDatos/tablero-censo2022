'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiPath } from '@/lib/api';
import { 
  Users, 
  Home, 
  Briefcase, 
  GraduationCap, 
  ChevronRight, 
  BarChart2, 
  Layers, 
  HeartPulse, 
  Wifi, 
  Droplets, 
  Flame,
  Loader2
} from 'lucide-react';

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [actividad, setActividad] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResumen() {
      try {
        setLoading(true);
        const [resumenRes, actividadRes] = await Promise.all([
          fetch(apiPath('/api/resumen')),
          fetch(apiPath('/api/actividad-economica')),
        ]);
        if (resumenRes.ok) setData(await resumenRes.json());
        if (actividadRes.ok) setActividad(await actividadRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchResumen();
  }, []);

  const d = data?.demografia;
  const t = data?.trabajo;
  const es = data?.educacionSalud;
  const h = data?.habitat;

  // Cálculos dinámicos de Actividad Económica
  const sectores = actividad?.sectores || [];
  const totalOcupados = actividad?.totalPoblacion || actividad?.totalOcupados || 0;
  
  const industriaComercio = sectores
    .filter((sector: any) => ['Industria Manufacturera', 'Comercio Mayorista y Minorista'].includes(sector.sector))
    .reduce((total: number, sector: any) => total + (Number(sector.valor) || 0), 0);

  const industriaComercioPct = totalOcupados > 0
    ? ((industriaComercio / totalOcupados) * 100).toFixed(1).replace('.', ',')
    : '—';

  const principalSector = actividad?.principalSector || sectores[0];
  const topSectorNombre = principalSector?.sector === 'Otros Servicios Personales y Profesionales'
    ? 'Otros servicios'
    : principalSector?.sector || 'Otros servicios';
  const topSectorPct = principalSector?.pct || '—';

  return (
    <div className="container">
      {/* Título de portada */}
      <div className="titleGroup overview-heading">
        <div>
          <h1>PRINCIPALES INDICADORES CENSO 2022</h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Provincia de Corrientes — Síntesis Estadística Provincial
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', height: 420, alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b' }}>
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Cargando síntesis del Censo 2022...</span>
        </div>
      ) : (
        <div className="gridCards">

          {/* TARJETA 1: Demografía y Población */}
          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Población y Demografía</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}></span>
            </div>
            <div className="cardBody">
              {/* Fila 1: Total y Densidad */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <BarChart2 className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal">{d?.totalPoblacion || '—'}</span>
                  <span className="metricLabel">Población Total</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">100,0 %</span>
                  <span className="metricLabel">Peso Provincial</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">13,6</span>
                  <span className="metricLabel">Hab. / km²</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/poblacion" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">Personas del total provincial; densidad en habitantes por km².</div>
              </div>

              {/* Fila 2: Sexo e Índice de Masculinidad */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Layers className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{d?.mujeresPct || '51,4'} %</span>
                  <span className="metricLabel">Mujeres</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#1e3a8a' }}>{d?.varonesPct || '48,6'} %</span>
                  <span className="metricLabel">Varones</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{d?.indiceMasculinidad || '94,5'}</span>
                  <span className="metricLabel">Índice Masc.</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/piramide" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">Porcentajes sobre la población; índice de masculinidad por cada 100 mujeres.</div>
              </div>

              {/* Fila 3: Hogares */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Home className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal">{d?.totalHogares || '379.129'}</span>
                  <span className="metricLabel">Total Hogares</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{d?.personasPorHogar || '3,19'}</span>
                  <span className="metricLabel">Pers. / Hogar</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">+21,6 %</span>
                  <span className="metricLabel">Crecim. 2010-22</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/poblacion" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">Hogares censados; promedio de personas por hogar y variación entre censos.</div>
              </div>
            </div>
          </div>

          {/* TARJETA 2: Mercado de Trabajo y Economía */}
          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>Mercado de Trabajo y Empleo</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}></span>
            </div>
            <div className="cardBody">
              {/* Fila 1: Tasas de Actividad y Empleo */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <BarChart2 className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal">{t?.actividad || '—'}</span>
                  <span className="metricLabel">Tasa Actividad</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{t?.empleo || '—'}</span>
                  <span className="metricLabel">Tasa Empleo</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#b91c1c' }}>{t?.desocupacion || '—'}</span>
                  <span className="metricLabel">Desocupación</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/mercado-trabajo" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">Tasas sobre población de 14 años y más; desocupación sobre población económicamente activa.</div>
              </div>

              {/* Fila 2: Categorías Ocupacionales */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal">{t?.empleadosObrerosPct || '—'} %</span>
                  <span className="metricLabel">Empleados / Obreros</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{t?.cuentaPropiaPct || '—'} %</span>
                  <span className="metricLabel">Cuenta Propia</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{t?.servicioDomesticoPct || '—'} %</span>
                  <span className="metricLabel">Servicio Doméstico</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/mercado-trabajo" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">Porcentajes sobre la población ocupada, por categoría ocupacional.</div>
              </div>

              {/* Fila 3: Rama Económica */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal">{topSectorPct} %</span>
                  <span className="metricLabel">{topSectorNombre}</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{industriaComercioPct} %</span>
                  <span className="metricLabel">Ind. y Comercio</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{totalOcupados ? Number(totalOcupados).toLocaleString('es-AR') : '—'}</span>
                  <span className="metricLabel">Ocupados Totales</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/actividad-economica" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">Porcentaje de ocupados por rama; industria y comercio se muestran combinados.</div>
              </div>
            </div>
          </div>

          {/* TARJETA 3: Educación y Salud */}
          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <span>Educación y Cobertura de Salud</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}></span>
            </div>
            <div className="cardBody">
              {/* Fila 1: Secundaria Completa */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{es?.secundariaCompleta || '31,3 %'}</span>
                  <span className="metricLabel">Secundaria Ctes</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{es?.secundariaPais || '34,7 %'}</span>
                  <span className="metricLabel">Total País</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{es?.secundariaNea || '29,6 %'}</span>
                  <span className="metricLabel">Región NEA</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/educacion" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">Población de 25 años y más que completó secundaria; comparada con país y NEA.</div>
              </div>

              {/* Fila 2: Clima Educativo */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <BarChart2 className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal">29,4 %</span>
                  <span className="metricLabel">Clima Medio</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">32,1 %</span>
                  <span className="metricLabel">Media Nacional</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{es?.hogaresClimaMedio || '—'}</span>
                  <span className="metricLabel">Hogares Medio</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/clima-educativo" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">Porcentaje de hogares según clima educativo; comparación con el total nacional.</div>
              </div>

              {/* Fila 3: Cobertura de Salud */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <HeartPulse className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{es?.conObraSocial || '—'}</span>
                  <span className="metricLabel">Obra Social/PAMI</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#b91c1c' }}>{es?.sinCobertura || '—'}</span>
                  <span className="metricLabel">Sin Cobertura</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{es?.programasEstatales || '—'}</span>
                  <span className="metricLabel">Planes Estatales</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/salud" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">Porcentajes sobre la población en viviendas particulares.</div>
              </div>
            </div>
          </div>

          {/* TARJETA 4: Hogares, Hábitat y Servicios */}
          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">
                <Home className="w-4 h-4 text-emerald-400" />
                <span>Condiciones de la Vivienda y Servicios</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}></span>
            </div>
            <div className="cardBody">
              {/* Fila 1: NBI y Calidad de Materiales */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Home className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#b91c1c' }}>{h?.nbiPct || '—'} %</span>
                  <span className="metricLabel">Hogares con NBI</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{h?.inmatCal1Pct || '—'} %</span>
                  <span className="metricLabel">INMAT Calidad I</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{h?.hacinamientoPct || '—'} %</span>
                  <span className="metricLabel">Hacinamiento</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/nbi" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">NBI y hacinamiento sobre hogares; INMAT sobre viviendas particulares.</div>
              </div>

              {/* Fila 2: Agua y Saneamiento */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Droplets className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{h?.aguaRedPct || '—'} %</span>
                  <span className="metricLabel">Agua de Red Pública</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{h?.aguaBombaMotorPct || '—'} %</span>
                  <span className="metricLabel">Bomba Motor</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{h?.aguaOtrasFuentesPct || '—'} %</span>
                  <span className="metricLabel">Otras Fuentes</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/agua" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">Porcentaje de viviendas particulares según fuente principal de agua para beber o cocinar.</div>
              </div>

              {/* Fila 3: Conectividad y Combustible */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Wifi className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{h?.internetPct || '—'} %</span>
                  <span className="metricLabel">Acceso a Internet</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{h?.gasGarrafaPct || '—'} %</span>
                  <span className="metricLabel">Gas en Garrafa</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{h?.sinInternetPct || '—'} %</span>
                  <span className="metricLabel">Sin Conexión</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/internet" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="indicatorContext">Porcentaje de viviendas particulares con internet y combustible para cocinar.</div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}