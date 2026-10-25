import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import type { Format, SportCode } from '../../api/types';
import { Icon } from '../../components/Icon';
import { SPORT_ORDER, SPORTS } from '../../lib/sports';
import './panel.css';

const FORMATS: { id: Format; title: string; text: string }[] = [
  { id: 'LEAGUE', title: 'Liga', text: 'Todos contra todos. El primero de la tabla es el campeón.' },
  { id: 'KNOCKOUT', title: 'Eliminación directa', text: 'Llaves: quien pierde queda fuera. Si no son potencia de 2, los mejores pasan directo.' },
  { id: 'GROUPS_KNOCKOUT', title: 'Grupos y fase final', text: 'Fase de grupos y luego llaves con los clasificados. La fase final se arma sola.' },
];

const STEPS = ['Deporte', 'Formato', 'Datos', 'Participantes'];

/** Asistente de creación: deporte → formato → datos → participantes. */
export default function NewTournament() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [sport, setSport] = useState<SportCode | null>(null);
  const [format, setFormat] = useState<Format>('LEAGUE');
  const [doubleRound, setDoubleRound] = useState(false);
  const [groupsCount, setGroupsCount] = useState(2);
  const [advance, setAdvance] = useState(2);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [teamsText, setTeamsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const teams = teamsText.split('\n').map((s) => s.trim()).filter(Boolean);
  const unique = new Set(teams.map((t) => t.toLowerCase())).size === teams.length;
  const minTeams = format === 'GROUPS_KNOCKOUT' ? groupsCount * (advance + 1) : 2;
  const participant = sport && (sport === 'TENIS' ? 'jugador' : sport === 'PADEL' ? 'pareja' : 'equipo');

  const canNext = [sport != null, true, name.trim().length > 0, teams.length >= minTeams && teams.length <= 64 && unique][step];

  async function create() {
    if (!sport) return;
    setBusy(true);
    setError(null);
    try {
      const t = await api.createTournament({
        name: name.trim(), sport, format, description: description.trim() || undefined, location: location.trim() || undefined,
        startDate: startDate || null, doubleRound, groupsCount: format === 'GROUPS_KNOCKOUT' ? groupsCount : 0,
        advancePerGroup: format === 'GROUPS_KNOCKOUT' ? advance : 0, teams: teams.map((n) => ({ name: n })),
      });
      navigate(`/panel/t/${t.id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="container container-narrow page stack" style={{ gap: 24 }}>
      <div>
        <p className="eyebrow">Nuevo torneo · paso {step + 1} de {STEPS.length}</p>
        <h1 className="title">{['¿Qué deporte?', '¿Cómo se juega?', 'Datos del torneo', `Inscribe a cada ${participant ?? 'equipo'}`][step]}</h1>
      </div>
      <ol className="steps">
        {STEPS.map((s, i) => <li key={s} className={i === step ? 'current' : i < step ? 'done' : ''}><span>{i < step ? <Icon name="check" size={14} /> : i + 1}</span>{s}</li>)}
      </ol>

      {step === 0 && (
        <div className="pick-sport">
          {SPORT_ORDER.map((code) => (
            <button key={code} type="button" className={`pick-sport-tile ${sport === code ? 'active' : ''}`} onClick={() => setSport(code)}>
              <img src={SPORTS[code].photo} alt="" />
              <span><Icon name={code} size={18} />{SPORTS[code].label}</span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          {FORMATS.map((f) => (
            <button key={f.id} type="button" className={`option card ${format === f.id ? 'active' : ''}`} onClick={() => setFormat(f.id)}>
              <span className="option-radio" />
              <span><strong>{f.title}</strong><small className="muted">{f.text}</small></span>
            </button>
          ))}
          {format === 'LEAGUE' && (
            <label className="toggle card card-pad">
              <input type="checkbox" checked={doubleRound} onChange={(e) => setDoubleRound(e.target.checked)} />
              <span><strong>Ida y vuelta</strong><small className="muted">Cada pareja se enfrenta dos veces, una de local y otra de visitante.</small></span>
            </label>
          )}
          {format === 'GROUPS_KNOCKOUT' && (
            <div className="card card-pad grid-2">
              <label className="field"><span>Número de grupos</span>
                <select className="select" value={groupsCount} onChange={(e) => setGroupsCount(Number(e.target.value))}>
                  {[2, 4, 8].map((n) => <option key={n} value={n}>{n} grupos</option>)}
                </select>
              </label>
              <label className="field"><span>Clasifican por grupo</span>
                <select className="select" value={advance} onChange={(e) => setAdvance(Number(e.target.value))}>
                  <option value={1}>El primero</option>
                  <option value={2}>Los dos primeros</option>
                </select>
              </label>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card card-pad stack">
          <label className="field"><span>Nombre</span>
            <input className="input" maxLength={80} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Copa Verano 2026" autoFocus />
          </label>
          <div className="grid-2">
            <label className="field"><span>Ciudad o sede</span>
              <input className="input" maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Medellín" />
            </label>
            <label className="field"><span>Fecha de inicio</span>
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
          </div>
          <label className="field"><span>Descripción (opcional)</span>
            <textarea className="textarea" maxLength={400} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Reglas especiales, premios, inscripción…" />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="card card-pad stack">
          <label className="field">
            <span>Un {participant} por línea, en orden de siembra (el primero es el favorito)</span>
            <textarea className="textarea" style={{ minHeight: 240 }} value={teamsText} onChange={(e) => setTeamsText(e.target.value)}
              placeholder={sport === 'TENIS' ? 'Santiago Restrepo\nMariana Ochoa\nJulián Zapata\nValentina Arango' : 'Atlético Robledo\nDeportivo Belén\nClub Laureles\nUnión Itagüí'} autoFocus />
          </label>
          <p className={teams.length >= minTeams && unique ? 'muted' : 'faint'}>
            {teams.length} inscritos · mínimo {minTeams}
            {!unique && ' · hay nombres repetidos'}
            {format === 'KNOCKOUT' && teams.length > 2 && (teams.length & (teams.length - 1)) !== 0 &&
              ` · ${2 ** Math.ceil(Math.log2(teams.length)) - teams.length} pasan directo a la segunda ronda`}
          </p>
          <p className="faint" style={{ fontSize: 14 }}>Podrás agregar jugadores, colores y abreviaturas después.</p>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="row-between">
        <button type="button" className="btn btn-secondary" onClick={() => (step === 0 ? navigate('/panel') : setStep(step - 1))}>
          {step === 0 ? 'Cancelar' : 'Atrás'}
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuar</button>
        ) : (
          <button type="button" className="btn" disabled={!canNext || busy} onClick={create}>{busy ? 'Creando…' : 'Crear torneo'}</button>
        )}
      </div>
    </div>
  );
}
