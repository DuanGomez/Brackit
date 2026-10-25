import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, type ResultInput } from '../../api/client';
import type { MatchDetail, Member } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Scoreboard, Timeline } from '../../components/match';
import { Sheet } from '../../components/Sheet';
import { useNow } from '../../lib/clock';
import { dayKey } from '../../lib/format';
import { useMatchLive } from '../../live/hooks';
import { useOrg } from './AppLayout';

export default function MatchAdmin() {
  const { id } = useParams();
  const matchId = Number(id);
  const { org, canManage, toast } = useOrg();
  const { data, error, loading, reload } = useMatchLive(() => api.match(org.slug, matchId), matchId);
  const now = useNow(data?.match.status === 'LIVE');
  const [members, setMembers] = useState<Member[]>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const base = `/app/${org.slug}`;

  useEffect(() => {
    if (canManage) api.members(org.slug).then((l) => setMembers(l.filter((m) => m.status === 'ACTIVE' && m.userId))).catch(() => {});
  }, [org.slug, canManage]);

  if (loading) return <div className="page"><div className="skeleton" style={{ height: 320 }} /></div>;
  if (error || !data) return <div className="page"><div className="card empty"><h3>No se pudo abrir el partido</h3><p>{error}</p></div></div>;
  const { match, tournament, sport } = data;
  const act = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast(message);
      reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <nav aria-label="Ruta" style={{ fontSize: 13, color: 'var(--faint)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link to={`${base}/torneos`}>Torneos</Link><span>›</span><Link to={`${base}/torneos/${tournament.id}`}>{tournament.name}</Link><span>›</span><span>{match.roundLabel}</span>
      </nav>
      <section className="card"><Scoreboard detail={data} now={now} /></section>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {(match.status === 'SCHEDULED' || match.status === 'LIVE') && match.homeId && match.awayId && (
          <Link to={`${base}/consola/${match.id}`} className="btn"><Icon name="whistle" size={16} />{match.status === 'LIVE' ? 'Seguir en la consola' : 'Dirigir en vivo'}</Link>
        )}
        {canManage && match.status !== 'LIVE' && match.status !== 'CANCELLED' && match.homeId && match.awayId && (
          <button type="button" className="btn btn-secondary" onClick={() => setResultOpen(true)}>{match.status === 'FINISHED' ? 'Corregir resultado' : 'Cargar resultado'}</button>
        )}
        {canManage && match.status === 'SCHEDULED' && (
          <Link to={`${base}/calendario`} state={{ day: match.scheduledAt ? dayKey(match.scheduledAt) : undefined }} className="btn btn-secondary"><Icon name="calendar" size={16} />Reprogramar en el calendario</Link>
        )}
        {canManage && match.status === 'SCHEDULED' && match.stage !== 'KNOCKOUT' && match.stage !== 'THIRD_PLACE' && (
          <button type="button" className="btn btn-danger" onClick={() => {
            const reason = window.prompt('Motivo de la cancelación (opcional)', 'Lluvia');
            if (reason !== null) act(() => api.cancel(org.slug, match.id, reason), 'Partido cancelado');
          }}>Cancelar partido</button>
        )}
        {canManage && match.status === 'CANCELLED' && <button type="button" className="btn btn-secondary" onClick={() => act(() => api.restore(org.slug, match.id), 'Partido restaurado')}>Restaurar partido</button>}
      </div>

      {match.status === 'CANCELLED' && <p className="form-error">Cancelado{match.cancelReason ? `: ${match.cancelReason}` : ''}.</p>}

      {canManage && match.status !== 'FINISHED' && match.status !== 'CANCELLED' && (
        <section className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ flex: '1 1 200px' }}><b>Árbitro</b><br /><small className="muted">Lo verá en "Mis partidos" y podrá dirigir desde su celular.</small></span>
          <select className="select" style={{ width: 'auto', minWidth: 220 }} value={match.refereeId ?? ''}
            onChange={(e) => act(() => api.assignReferee(org.slug, match.id, e.target.value ? Number(e.target.value) : null), 'Árbitro actualizado')}>
            <option value="">Sin asignar</option>
            {members.map((m) => <option key={m.id} value={m.userId!}>{m.name ?? m.email}{m.role !== 'REFEREE' ? ' (organizador)' : ''}</option>)}
          </select>
        </section>
      )}

      {sport.scoring !== 'SETS' && (
        <section className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head"><h3>Minuto a minuto</h3><span className="muted">{data.events.length} acciones</span></div>
          <Timeline detail={data} />
        </section>
      )}

      {resultOpen && <ResultSheet detail={data} onClose={() => setResultOpen(false)} onSaved={() => { setResultOpen(false); toast('Resultado guardado'); reload(); }} />}
    </div>
  );
}

/** Resultado a mano: goles/puntos, penales en eliminación o sets válidos. */
export function ResultSheet({ detail, onClose, onSaved }: { detail: MatchDetail; onClose: () => void; onSaved: () => void }) {
  const { org } = useOrg();
  const { match, sport, home, away } = detail;
  const sets = sport.scoring === 'SETS';
  const maxSets = sport.setsToWin * 2 - 1;
  const [h, setH] = useState(String(match.homeScore));
  const [a, setA] = useState(String(match.awayScore));
  const [rows, setRows] = useState(() => Array.from({ length: maxSets }, (_, i) => ({ home: match.sets[i] ? String(match.sets[i].home) : '', away: match.sets[i] ? String(match.sets[i].away) : '' })));
  const [pens, setPens] = useState({ home: match.homePenalties?.toString() ?? '', away: match.awayPenalties?.toString() ?? '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const knockout = match.stage === 'KNOCKOUT' || match.stage === 'THIRD_PLACE';
  const needsPens = !sets && knockout && sport.scoring === 'GOALS' && h !== '' && h === a;
  const digits = (v: string, n = 3) => v.replace(/\D/g, '').slice(0, n);

  async function save() {
    setBusy(true);
    setError(null);
    const input: ResultInput = sets
      ? { homeScore: 0, awayScore: 0, sets: rows.filter((r) => r.home !== '' && r.away !== '').map((r) => ({ home: Number(r.home), away: Number(r.away) })) }
      : { homeScore: Number(h), awayScore: Number(a), homePenalties: needsPens ? Number(pens.home) : null, awayPenalties: needsPens ? Number(pens.away) : null };
    try {
      await api.setResult(org.slug, match.id, input);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Sheet title="Resultado" onClose={onClose}>
      {sets ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 8, alignItems: 'center' }}>
          <span /><b style={{ textAlign: 'center' }}>{home?.shortName}</b><b style={{ textAlign: 'center' }}>{away?.shortName}</b>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <span className="muted" style={{ fontSize: 14 }}>Set {i + 1}</span>
              <input className="input num" style={{ textAlign: 'center' }} inputMode="numeric" value={r.home} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, home: digits(e.target.value, 2) } : x)))} />
              <input className="input num" style={{ textAlign: 'center' }} inputMode="numeric" value={r.away} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, away: digits(e.target.value, 2) } : x)))} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid-2">
          <label className="field"><span>{home?.name}</span><input className="input num" inputMode="numeric" value={h} onChange={(e) => setH(digits(e.target.value))} /></label>
          <label className="field"><span>{away?.name}</span><input className="input num" inputMode="numeric" value={a} onChange={(e) => setA(digits(e.target.value))} /></label>
        </div>
      )}
      {needsPens && (
        <div className="grid-2">
          <label className="field"><span>Penales {home?.shortName}</span><input className="input num" inputMode="numeric" value={pens.home} onChange={(e) => setPens({ ...pens, home: digits(e.target.value) })} /></label>
          <label className="field"><span>Penales {away?.shortName}</span><input className="input num" inputMode="numeric" value={pens.away} onChange={(e) => setPens({ ...pens, away: digits(e.target.value) })} /></label>
        </div>
      )}
      {sets && <p className="faint" style={{ fontSize: 13 }}>Llena solo los sets jugados. Gana quien llegue a {sport.setsToWin}.</p>}
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn btn-lg btn-block" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar resultado'}</button>
    </Sheet>
  );
}
