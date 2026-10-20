'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResumen() {
      try {
        setLoading(true);
        const res = await fetch('/api/resumen');
        const json = await res.json();
        setData(json);
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

  return (
    <div className="container">
      {/* Título de portada */}
      <div className="titleGroup" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>PRINCIPALES INDICADORES CENSO 2022</h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Provincia de Corrientes — Síntesis Estadística Provincial
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>DATOS OFICIALES INDEC / IPECD</span>
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
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>3 Indicadores</span>
            </div>
            <div className="cardBody">
              {/* Fila 1: Total y Densidad */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <BarChart2 className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal">{d?.totalPoblacion || '1.209.671'}</span>
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
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>3 Indicadores</span>
            </div>
            <div className="cardBody">
              {/* Fila 1: Tasas de Actividad y Empleo */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <BarChart2 className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal">{t?.actividad || '55,3 %'}</span>
                  <span className="metricLabel">Tasa Actividad</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{t?.empleo || '51,0 %'}</span>
                  <span className="metricLabel">Tasa Empleo</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#b91c1c' }}>{t?.desocupacion || '7,9 %'}</span>
                  <span className="metricLabel">Desocupación</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/mercado-trabajo" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Fila 2: Categorías Ocupacionales */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal">{t?.empleadosObreros || '218.420'}</span>
                  <span className="metricLabel">Empleados / Obreros</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{t?.cuentaPropia || '104.150'}</span>
                  <span className="metricLabel">Cuenta Propia</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">68,4 %</span>
                  <span className="metricLabel">Asalariados</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/mercado-trabajo" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Fila 3: Ramas Económicas */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal">Comercio</span>
                  <span className="metricLabel">Mayor Empleador</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">27,4 %</span>
                  <span className="metricLabel">Ind. y Comercio</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">373.250</span>
                  <span className="metricLabel">Ocupados Totales</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/actividad-economica" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
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
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>3 Indicadores</span>
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
                  <span className="metricVal">111.450</span>
                  <span className="metricLabel">Hogares Medio</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/clima-educativo" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Fila 3: Cobertura de Salud */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <HeartPulse className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{es?.conObraSocial || '51,2'} %</span>
                  <span className="metricLabel">Obra Social/PAMI</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#b91c1c' }}>{es?.sinCobertura || '42,8'} %</span>
                  <span className="metricLabel">Sin Cobertura</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">6,0 %</span>
                  <span className="metricLabel">Planes Estatales</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/salud" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
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
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>3 Indicadores</span>
            </div>
            <div className="cardBody">
              {/* Fila 1: NBI y Calidad de Materiales */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Home className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#b91c1c' }}>{h?.nbiPct || '14,2'} %</span>
                  <span className="metricLabel">Hogares con NBI</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{h?.inmatCal1Pct || '68,1'} %</span>
                  <span className="metricLabel">INMAT Calidad I</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">5,4 %</span>
                  <span className="metricLabel">Hacinamiento</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/nbi" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Fila 2: Agua y Saneamiento */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Droplets className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{h?.aguaRedPct || '76,8'} %</span>
                  <span className="metricLabel">Agua de Red Pública</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">18,3 %</span>
                  <span className="metricLabel">Bomba Motor</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">4,9 %</span>
                  <span className="metricLabel">Otras Fuentes</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/agua" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Fila 3: Conectividad y Combustible */}
              <div className="indicatorRow">
                <div className="metricCol">
                  <Wifi className="w-4 h-4 text-slate-400" />
                </div>
                <div className="metricCol">
                  <span className="metricVal" style={{ color: '#047857' }}>{h?.internetPct || '62,4'} %</span>
                  <span className="metricLabel">Acceso a Internet</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">{h?.gasGarrafaPct || '88,9'} %</span>
                  <span className="metricLabel">Gas en Garrafa</span>
                </div>
                <div className="metricCol">
                  <span className="metricVal">37,6 %</span>
                  <span className="metricLabel">Sin Conexión</span>
                </div>
                <div className="actionGroup">
                  <span className="dateBadge">2022</span>
                  <Link href="/internet" className="arrowLink">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}