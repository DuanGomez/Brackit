import { Link } from 'react-router';
import type { TournamentCard as Card } from '../api/types';
import { FORMAT_LABEL, plural } from '../lib/format';
import { SPORTS } from '../lib/sports';
import { Icon } from './Icon';
import './cards.css';

/** Tarjeta de torneo con la foto del deporte, estado y avance. */
export function TournamentCard({ t, to }: { t: Card; to?: string }) {
  const look = SPORTS[t.sport];
  const progress = t.matchesTotal ? Math.round((t.matchesPlayed / t.matchesTotal) * 100) : 0;
  return (
    <Link to={to ?? `/t/${t.slug}`} className="t-card">
      <div className="t-card-photo">
        <img src={look.photo} alt="" loading="lazy" />
        <span className="t-card-sport" style={{ color: look.color }}>
          <Icon name={t.sport} size={15} />{look.label}
        </span>
        {t.liveCount > 0 ? (
          <span className="chip chip-live t-card-status"><span className="live-dot" />{t.liveCount === 1 ? 'En vivo' : `${t.liveCount} en vivo`}</span>
        ) : t.status === 'FINISHED' ? (
          <span className="chip chip-done t-card-status">Finalizado</span>
        ) : t.status === 'DRAFT' ? (
          <span className="chip t-card-status">Borrador</span>
        ) : null}
      </div>
      <div className="t-card-body">
        <h3>{t.name}</h3>
        <p className="muted">
          {FORMAT_LABEL[t.format]} · {plural(t.teams, 'participante', 'participantes')}
          {t.location ? ` · ${t.location}` : ''}
        </p>
        {t.status === 'FINISHED' && t.championName ? (
          <p className="t-card-champion"><Icon name="trophy" size={16} />Campeón: {t.championName}</p>
        ) : t.matchesTotal > 0 ? (
          <div className="t-card-progress">
            <div className="bar"><span style={{ width: `${progress}%`, background: look.color }} /></div>
            <small className="muted num">{t.matchesPlayed}/{t.matchesTotal} partidos</small>
          </div>
        ) : (
          <p className="faint">Sin calendario todavía</p>
        )}
      </div>
    </Link>
  );
}
