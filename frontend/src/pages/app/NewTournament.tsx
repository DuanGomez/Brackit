import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, ApiError } from '../../api/client';
import type { Format, SportCode, Venue } from '../../api/types';
import { Icon } from '../../components/Icon';
import { whatsappLink } from '../../config';
import { SPORT_ORDER, SPORTS } from '../../lib/sports';
import { PageHeader, useOrg } from './AppLayout';

const FORMATS: { id: Format; title: string; text: string }[] = [
  { id: 'LEAGUE', title: 'Liga', text: 'Todos contra todos. El primero de la tabla es el campeón.' },
  { id: 'KNOCKOUT', title: 'Eliminación directa', text: 'Llaves: quien pierde queda fuera. Si no son potencia de 2, los mejores pasan directo.' },
  { id: 'GROUPS_KNOCKOUT', title: 'Grupos y fase final', text: 'Fase de grupos y luego llaves con los clasificados. La fase final se arma y se programa sola.' },
];
const STEPS = ['Deporte', 'Formato', 'Canchas y reglas', 'Datos', 'Participantes'];
const DEFAULT_BLOCK: Record<SportCode, number> = { FUTBOL: 120, FUTBOL_SALA: 60, BALONCESTO: 105, BALONMANO: 90, VOLEIBOL: 90, TENIS: 120, PADEL: 90 };

export default function NewTournament() {
  const { org, reloadOrg } = useOrg();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [sport, setSport] = useState<SportCode | null>(null);
  const [format, setFormat] = useState<Format>('LEAGUE');
  const [doubleRound, setDoubleRound] = useState(false);
  const [groupsCount, setGroupsCount] = useState(2);
  const [advance, setAdvance] = useState(2);
  const [thirdPlace, setThirdPlace] = useState(true);
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [courtIds, setCourtIds] = useState<number[]>([]);
  const [blockMinutes, setBlockMinutes] = useState(120);
  const [minRestHours, setMinRestHours] = useState(24);
  const [daysBetween, setDaysBetween] = useState(7);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [teamsText, setTeamsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.venues(org.slug).then(setVenues).catch(() => setVenues([]));
  }, [org.slug]);

  // Al elegir deporte: canchas compatibles marcadas y duración sugerida
  useEffect(() => {
    if (!sport || !venues) return;
    setBlockMinutes(DEFAULT_BLOCK[sport]);
    setCourtIds(venues.flatMap((v) => v.courts).filter((c) => !c.sports.length || c.sports.includes(sport)).map((c) => c.id));
  }, [sport, venues]);

  const compatible = useMemo(() => venues?.map((v) => ({ ...v, courts: v.courts.filter((c) => !sport || !c.sports.length || c.sports.includes(sport)) })).filter((v) => v.courts.length) ?? [], [venues, sport]);
  const teams = teamsText.split('\n').map((s) => s.trim()).filter(Boolean);
  const unique = new Set(teams.map((t) => t.toLowerCase())).size === teams.length;
  const minTeams = format === 'GROUPS_KNOCKOUT' ? groupsCount * (advance + 1) : 2;
  const participant = sport ? SPORTS[sport].participant.toLowerCase() : 'equipo';
  const canNext = [sport != null, true, courtIds.length > 0, name.trim().length > 0, teams.length >= minTeams && teams.length <= 64 && unique][step];

  async function create() {
    if (!sport) return;
    setBusy(true);
    setError(null);
    try {
      const t = await api.createTournament(org.slug, {
        name: name.trim(), category: category.trim() || undefined, sport, format, description: description.trim() || undefined,
        doubleRound, groupsCount: format === 'GROUPS_KNOCKOUT' ? groupsCount : 0, advancePerGroup: format === 'GROUPS_KNOCKOUT' ? advance : 0,
        thirdPlace: format !== 'LEAGUE' && thirdPlace, blockMinutes, minRestHours, daysBetween, courtIds, teams: teams.map((n) => ({ name: n })),
      });
      await reloadOrg();
      navigate(`/app/${org.slug}/torneos/${t.id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setLimit(e instanceof ApiError && e.status === 403);
      setBusy(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <PageHeader eyebrow={`Nuevo torneo · paso ${step + 1} de ${STEPS.length}`}
        title={['¿Qué deporte?', '¿Cómo se juega?', '¿Dónde y con qué reglas?', 'Datos del torneo', `Inscribe a cada ${participant}`][step]} />
      <ol className="steps">
        {STEPS.map((s, i) => <li key={s} className={i === step ? 'current' : i < step ? 'done' : ''}><span>{i < step ? <Icon name="check" size={13} strokeWidth={2.6} /> : i + 1}</span>{s}</li>)}
      </ol>

      {step === 0 && (
        <div className="pick-grid">
          {SPORT_ORDER.map((code) => (
            <button key={code} type="button" className={`pick ${sport === code ? 'active' : ''}`} onClick={() => setSport(code)} aria-pressed={sport === code}>
              <img src={SPORTS[code].photo} alt="" />
              <span><Icon name={code} size={18} />{SPORTS[code].label}</span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FORMATS.map((f) => (
            <button key={f.id} type="button" className={`option ${format === f.id ? 'active' : ''}`} onClick={() => setFormat(f.id)}>
              <span className="option-radio" /><span><strong>{f.title}</strong><small>{f.text}</small></span>
            </button>
          ))}
          <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {format === 'LEAGUE' && (
              <label style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={doubleRound} onChange={(e) => setDoubleRound(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--primary)' }} />
                <span><b>Ida y vuelta</b><br /><small className="muted">Cada pareja se enfrenta dos veces.</small></span>
              </label>
            )}
            {format === 'GROUPS_KNOCKOUT' && (
              <div className="grid-2">
                <label className="field"><span>Grupos</span>
                  <select className="select" value={groupsCount} onChange={(e) => setGroupsCount(Number(e.target.value))}>{[2, 4, 8].map((n) => <option key={n} value={n}>{n} grupos</option>)}</select>
                </label>
                <label className="field"><span>Clasifican por grupo</span>
                  <select className="select" value={advance} onChange={(e) => setAdvance(Number(e.target.value))}><option value={1}>El primero</option><option value={2}>Los dos primeros</option></select>
                </label>
              </div>
            )}
            {format !== 'LEAGUE' && (
              <label style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={thirdPlace} onChange={(e) => setThirdPlace(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--primary)' }} />
                <span><b>Partido por el tercer puesto</b><br /><small className="muted">Entre los perdedores de las semifinales.</small></span>
              </label>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="h2">Canchas</h2>
            {!venues ? <div className="skeleton" style={{ height: 60 }} /> : compatible.length === 0 ? (
              <div className="form-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span>No tienes canchas para {sport ? SPORTS[sport].label.toLowerCase() : 'este deporte'}.</span>
                <Link to={`/app/${org.slug}/canchas`} className="btn btn-sm">Crear sede y canchas</Link>
              </div>
            ) : compatible.map((v) => (
              <div key={v.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{v.name}</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {v.courts.map((c) => {
                    const on = courtIds.includes(c.id);
                    return (
                      <button key={c.id} type="button" className={`check-chip ${on ? 'active' : ''}`} aria-pressed={on}
                        onClick={() => setCourtIds(on ? courtIds.filter((x) => x !== c.id) : [...courtIds, c.id])}>
                        {on && <Icon name="check" size={14} strokeWidth={2.4} />}{c.name}{c.surface && <span className="faint" style={{ fontWeight: 400 }}>· {c.surface}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
          <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 className="h2">Reglas de programación</h2>
            <div className="grid-3">
              <label className="field"><span>Tiempo en cancha</span>
                <select className="select" value={blockMinutes} onChange={(e) => setBlockMinutes(Number(e.target.value))}>
                  {[45, 60, 75, 90, 105, 120, 150].map((m) => <option key={m} value={m}>{m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`}</option>)}
                </select>
                <small>Juego, descansos y cambio de equipos.</small>
              </label>
              <label className="field"><span>Descanso mínimo</span>
                <select className="select" value={minRestHours} onChange={(e) => setMinRestHours(Number(e.target.value))}>
                  {[0, 2, 4, 12, 24, 48, 72].map((h) => <option key={h} value={h}>{h === 0 ? 'Sin mínimo' : `${h} h por equipo`}</option>)}
                </select>
              </label>
              <label className="field"><span>Entre jornadas</span>
                <select className="select" value={daysBetween} onChange={(e) => setDaysBetween(Number(e.target.value))}>
                  {[1, 2, 3, 4, 7, 14].map((d) => <option key={d} value={d}>{d === 1 ? 'Cada día' : d === 7 ? 'Cada semana' : d === 14 ? 'Cada 2 semanas' : `Cada ${d} días`}</option>)}
                </select>
              </label>
            </div>
          </section>
        </div>
      )}

      {step === 3 && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-2">
            <label className="field"><span>Nombre</span>
              <input className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Copa Verano 2026" autoFocus />
            </label>
            <label className="field"><span>Categoría</span>
              <input className="input" maxLength={40} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Mayores, Sub-15, Femenino…" />
            </label>
          </div>
          <label className="field"><span>Descripción (opcional)</span>
            <textarea className="textarea" maxLength={400} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Premios, inscripción, reglas especiales…" />
          </label>
        </div>
      )}

      {step === 4 && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field">
            <span>Un {participant} por línea, en orden de siembra (el primero es el favorito)</span>
            <textarea className="textarea" style={{ minHeight: 230 }} value={teamsText} onChange={(e) => setTeamsText(e.target.value)} autoFocus
              placeholder={sport === 'TENIS' ? 'Santiago Restrepo\nMariana Ochoa\nJulián Zapata\nValentina Arango' : 'Atlético Robledo\nDeportivo Belén\nClub Laureles\nUnión Itagüí'} />
          </label>
          <p className={teams.length >= minTeams && unique ? 'muted' : 'faint'} style={{ fontSize: 14 }}>
            {teams.length} inscritos · mínimo {minTeams}{!unique && ' · hay nombres repetidos'}
            {format === 'KNOCKOUT' && teams.length > 2 && (teams.length & (teams.length - 1)) !== 0 && ` · ${2 ** Math.ceil(Math.log2(teams.length)) - teams.length} pasan directo a la segunda ronda`}
          </p>
          <p className="faint" style={{ fontSize: 13 }}>Después podrás agregar jugadores con su número y documento, colores y abreviaturas.</p>
        </div>
      )}

      {error && (
        <div className="form-error" role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>{error}</span>
          {limit && <a className="btn btn-sm btn-whatsapp" href={whatsappLink(`Hola Duan, quiero pasar ${org.name} al plan Liga de Brackit.`)} target="_blank" rel="noreferrer"><Icon name="whatsapp" size={15} />Mejorar plan</a>}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button type="button" className="btn btn-secondary" onClick={() => (step === 0 ? navigate(`/app/${org.slug}/torneos`) : setStep(step - 1))}>{step === 0 ? 'Cancelar' : 'Atrás'}</button>
        {step < STEPS.length - 1
          ? <button type="button" className="btn" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuar</button>
          : <button type="button" className="btn" disabled={!canNext || busy} onClick={create}>{busy ? 'Creando…' : 'Crear torneo'}</button>}
      </div>
    </div>
  );
}
