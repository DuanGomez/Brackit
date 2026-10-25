import { useEffect, useMemo, type ReactNode } from 'react';
import { Link, NavLink, useParams, useSearchParams } from 'react-router';
import { api } from '../../api/client';
import type { MatchCard, OrgRef, Team, Tournament } from '../../api/types';
import { Icon, Logo, OrgBadge } from '../../components/Icon';
import { Bracket, Scoreboard, Standings, Timeline } from '../../components/match';
import { TeamBadge } from '../../components/TeamBadge';
import { BRAND } from '../../config';
import { liveClockLabel, useNow } from '../../lib/clock';
import { FORMAT_LABEL, formatDate, formatDateTime, formatTime, plural } from '../../lib/format';
import { SPORTS } from '../../lib/sports';
import { useLoad, useMatchLive, useOrgChanges, useTournamentLive } from '../../live/hooks';
import { toCard } from '../../lib/cards';
import '../app/app.css';
import './public.css';

function PubHeader({ org, tournaments, children }: { org: OrgRef; tournaments?: { slug: string; name: string }[]; children?: ReactNode }) {
  return (
    <header className="pub-head">
      <nav className="pub-nav" aria-label="Organización">
        <Link to={`/l/${org.slug}`} className="pub-org"><OrgBadge shortName={org.shortName} color={org.color} size={34} />{org.name}</Link>
        {tournaments && tournaments.length > 0 && (
          <div className="pub-tabs">
            {tournaments.map((t) => <NavLink key={t.slug} to={`/l/${org.slug}/${t.slug}`} className={({ isActive }) => (isActive ? 'active' : '')}>{t.name}</NavLink>)}
          </div>
        )}
      </nav>
      {children}
    </header>
  );
}

function PubFooter({ org }: { org: OrgRef }) {
  return (
    <footer className="pub-foot">
      <div>
        <span>{org.name}{org.city ? ` · ${org.city}` : ''}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Con la tecnología de <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Logo size={18} />{BRAND.name}</Link></span>
      </div>
    </footer>
  );
}

/** Tarjeta de partido de la página pública. */
function PubGame({ m, now, to }: { m: MatchCard; now: number; to: string }) {
  const live = m.status === 'LIVE';
  const done = m.status === 'FINISHED';
  const status = live ? <span className="num" style={{ color: '#B25E00', display: 'flex', alignItems: 'center', gap: 7 }}><span className="dot dot-live" />En vivo · {liveClockLabel(m, SPORTS[m.sport], now)}</span>
    : done ? <span style={{ color: '#1E7D45' }}>Finalizado</span>
    : m.status === 'CANCELLED' ? <span style={{ color: '#D70015' }}>Cancelado</span>
    : <span className="num" style={{ color: '#48546B' }}>{formatTime(m.scheduledAt)}{m.courtName ? ` · ${m.courtName}` : ''}</span>;
  return (
    <Link to={to} className={`pub-game ${live ? 'live' : ''}`}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{status}</span>
      <div className={`row ${done && m.winnerId && m.winnerId !== m.home?.id ? 'lost' : ''}`}><span><TeamBadge team={m.home} size={24} />{m.home?.name}</span>{(live || done) && <span className="num">{m.homeScore}</span>}</div>
      <div className={`row ${done && m.winnerId && m.winnerId !== m.away?.id ? 'lost' : ''}`}><span><TeamBadge team={m.away} size={24} />{m.away?.name}</span>{(live || done) && <span className="num">{m.awayScore}</span>}</div>
      <small>{m.tournamentName} · {m.roundLabel}</small>
    </Link>
  );
}

export function PublicOrgPage() {
  const { org: slug } = useParams();
  const { data, error, loading, reload } = useLoad(() => api.publicOrg(slug!), `pub-${slug}`);
  useOrgChanges(slug, reload);
  const now = useNow(!!data?.today.some((m) => m.status === 'LIVE'));
  useEffect(() => {
    if (data) document.title = `${data.organization.name} · en vivo`;
  }, [data]);

  if (loading) return <div className="pub"><div className="pub-head" style={{ height: 320 }} /></div>;
  if (error || !data) return <div className="pub app-center"><div className="pub-card" style={{ padding: 32, textAlign: 'center' }}><h1 style={{ fontSize: 22 }}>No encontramos esta organización</h1><p style={{ color: '#6E6E73', margin: '8px 0 16px' }}>{error}</p><Link to="/" className="btn">Ir a {BRAND.name}</Link></div></div>;

  const org = data.organization;
  const f = data.featured;
  return (
    <div className="pub">
      <PubHeader org={org} tournaments={data.tournaments.map((t) => ({ slug: t.slug, name: t.name }))}>
        {f ? (
          <Link to={`/l/${org.slug}/partido/${f.id}`} className="pub-feature" style={{ color: '#F5F5F7' }}>
            <span className="pf-chip num"><span className="dot dot-live" />En vivo · {liveClockLabel(f, SPORTS[f.sport], now)}</span>
            <div className="pf-teams">
              <div className="pf-team"><TeamBadge team={f.home} size={92} /><b>{f.home?.name}</b></div>
              <div className="pf-score">{f.homeScore}<span>:</span>{f.awayScore}</div>
              <div className="pf-team"><TeamBadge team={f.away} size={92} /><b>{f.away?.name}</b></div>
            </div>
            <span style={{ fontSize: 13, color: 'rgba(245,245,247,.55)' }}>{f.tournamentName} · {f.roundLabel}{f.courtName ? ` · ${f.courtName}` : ''}{f.venueName ? ` · ${f.venueName}` : ''}</span>
          </Link>
        ) : (
          <div className="pub-hero-text">
            <h1>{org.name}</h1>
            <p>{data.description ?? 'Calendario, tabla y resultados de nuestros torneos.'}</p>
          </div>
        )}
      </PubHeader>

      <main className="pub-main">
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2>Hoy</h2>
          {data.today.length ? (
            <div className="pub-today">{data.today.map((m) => <PubGame key={m.id} m={m} now={now} to={`/l/${org.slug}/partido/${m.id}`} />)}</div>
          ) : <p style={{ color: '#6E6E73' }}>Hoy no hay partidos. Mira el calendario de cada torneo.</p>}
        </section>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2>Torneos</h2>
          <div className="pub-tournaments">
            {data.tournaments.map((t) => (
              <Link key={t.id} to={`/l/${org.slug}/${t.slug}`} className="pub-t">
                <img src={SPORTS[t.sport].photo} alt="" loading="lazy" />
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.liveCount ? '#B25E00' : t.status === 'FINISHED' ? '#1E7D45' : '#1F5BFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t.liveCount ? <><span className="dot dot-live" />En vivo</> : t.status === 'FINISHED' ? 'Finalizado' : 'En curso'} · {SPORTS[t.sport].label}
                  </span>
                  <h3>{t.name}</h3>
                  <p style={{ color: '#6E6E73', fontSize: 14 }}>{FORMAT_LABEL[t.format]}{t.category ? ` · ${t.category}` : ''} · {plural(t.teams, 'participante', 'participantes')}</p>
                  {t.championName && <p style={{ color: '#A67C00', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="trophy" size={15} />Campeón: {t.championName}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <PubFooter org={org} />
    </div>
  );
}

type PubTab = 'resumen' | 'partidos' | 'tabla' | 'llaves' | 'goleadores';

export function PublicTournamentPage() {
  const { org: orgSlug, slug } = useParams();
  const { data: t, teams, error, loading } = useTournamentLive(() => api.publicTournament(orgSlug!, slug!), `pubt-${orgSlug}-${slug}`);
  const orgData = useLoad(() => api.publicOrg(orgSlug!), `pub-${orgSlug}`);
  const [params, setParams] = useSearchParams();
  const now = useNow(!!t?.matches.some((m) => m.status === 'LIVE'));
  useEffect(() => {
    if (t) document.title = `${t.name} · ${t.organization.name}`;
  }, [t]);

  if (loading) return <div className="pub"><div className="pub-head" style={{ height: 200 }} /></div>;
  if (error || !t) return <div className="pub app-center"><div className="pub-card" style={{ padding: 32, textAlign: 'center' }}><h1 style={{ fontSize: 22 }}>No encontramos este torneo</h1><p style={{ color: '#6E6E73', margin: '8px 0 16px' }}>{error}</p><Link to={`/l/${orgSlug}`} className="btn">Volver</Link></div></div>;

  const tabs: { id: PubTab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' }, { id: 'partidos', label: 'Partidos' },
    ...(t.format !== 'KNOCKOUT' ? [{ id: 'tabla' as PubTab, label: t.format === 'LEAGUE' ? 'Tabla' : 'Grupos' }] : []),
    ...(t.format !== 'LEAGUE' ? [{ id: 'llaves' as PubTab, label: 'Llaves' }] : []),
    ...(t.sport.scoring !== 'SETS' ? [{ id: 'goleadores' as PubTab, label: t.sport.scorersTitle }] : []),
  ];
  const tab = (params.get('vista') as PubTab) || 'resumen';
  const link = (id: number) => `/l/${t.organization.slug}/partido/${id}`;
  const champion = t.championId ? teams.get(t.championId) : null;

  return (
    <div className="pub">
      <PubHeader org={t.organization} tournaments={orgData.data?.tournaments.map((x) => ({ slug: x.slug, name: x.name }))}>
        <div className="pub-hero-text" style={{ paddingBottom: 28 }}>
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13, color: 'rgba(245,245,247,.7)' }}>
            <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}><Icon name={t.sport.code} size={13} />{t.sport.label}</span>
            <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>{FORMAT_LABEL[t.format]}</span>
            {t.category && <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>{t.category}</span>}
          </span>
          <h1>{t.name}</h1>
          {t.description && <p>{t.description}</p>}
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div className="tabs-line" role="tablist" style={{ color: 'rgba(245,245,247,.6)' }}>
            {tabs.map((x) => <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'active' : ''}
              style={{ color: tab === x.id ? '#fff' : undefined, borderBottomColor: tab === x.id ? '#fff' : 'transparent' }}
              onClick={() => setParams(x.id === 'resumen' ? {} : { vista: x.id }, { replace: true })}>{x.label}</button>)}
          </div>
        </div>
      </PubHeader>

      <main className="pub-main">
        {champion && (
          <section className="pub-card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ color: '#D4A017' }}><Icon name="trophy" size={30} /></span>
            <div style={{ flex: 1 }}><span style={{ color: '#6E6E73', fontSize: 13 }}>Campeón</span><p style={{ fontSize: 22, fontWeight: 700 }}>{champion.name}</p></div>
            <TeamBadge team={champion} size={46} />
          </section>
        )}
        {tab === 'resumen' && <PubSummary t={t} teams={teams} now={now} link={link} />}
        {tab === 'partidos' && <PubFixtures t={t} teams={teams} now={now} link={link} />}
        {tab === 'tabla' && t.standings.map((g) => (
          <section key={g.group ?? 'tabla'} className="pub-card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 650, marginBottom: 6 }}>{g.group ? `Grupo ${g.group}` : 'Tabla de posiciones'}</h3>
            <Standings group={g} teams={teams} sport={t.sport.code} highlight={t.format === 'LEAGUE' ? 1 : t.advancePerGroup} />
          </section>
        ))}
        {tab === 'llaves' && (t.matches.some((m) => m.stage === 'KNOCKOUT')
          ? <section className="pub-card" style={{ padding: 20 }}><Bracket matches={t.matches} teams={teams} sport={t.sport.code} now={now} linkTo={(m) => link(m.id)} /></section>
          : <p style={{ color: '#6E6E73' }}>La fase final se arma al terminar los grupos.</p>)}
        {tab === 'goleadores' && <PubScorers t={t} teams={teams} />}
      </main>
      <PubFooter org={t.organization} />
    </div>
  );
}

function PubSummary({ t, teams, now, link }: { t: Tournament; teams: Map<number, Team>; now: number; link: (id: number) => string }) {
  const cards = useMemo(() => t.matches.filter((m) => !m.bye && m.homeId && m.awayId).map((m) => toCard(m, t, teams)), [t, teams]);
  const live = cards.filter((m) => m.status === 'LIVE');
  const next = cards.filter((m) => m.status === 'SCHEDULED' && m.scheduledAt).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!)).slice(0, 6);
  const recent = cards.filter((m) => m.status === 'FINISHED').sort((a, b) => (b.scheduledAt ?? '').localeCompare(a.scheduledAt ?? '')).slice(0, 6);
  return (
    <>
      {live.length > 0 && <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><h2>En vivo</h2><div className="pub-today">{live.map((m) => <PubGame key={m.id} m={m} now={now} to={link(m.id)} />)}</div></section>}
      <div className="two-col">
        {t.standings[0] ? (
          <section className="pub-card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 650, marginBottom: 6 }}>{t.standings[0].group ? `Grupo ${t.standings[0].group}` : 'Tabla de posiciones'}</h3>
            <Standings group={t.standings[0]} teams={teams} sport={t.sport.code} highlight={t.format === 'LEAGUE' ? 1 : t.advancePerGroup} />
          </section>
        ) : <section className="pub-card" style={{ padding: 20 }}><Bracket matches={t.matches} teams={teams} sport={t.sport.code} now={now} linkTo={(m) => link(m.id)} /></section>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: 18, fontWeight: 650 }}>Próximos partidos</h3>
          {next.length ? next.map((m) => <PubGame key={m.id} m={m} now={now} to={link(m.id)} />) : <p style={{ color: '#6E6E73' }}>No hay partidos pendientes.</p>}
        </div>
      </div>
      {recent.length > 0 && <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><h2>Últimos resultados</h2><div className="pub-today">{recent.map((m) => <PubGame key={m.id} m={m} now={now} to={link(m.id)} />)}</div></section>}
    </>
  );
}

function PubFixtures({ t, teams, now, link }: { t: Tournament; teams: Map<number, Team>; now: number; link: (id: number) => string }) {
  const groups = useMemo(() => {
    const map = new Map<string, MatchCard[]>();
    t.matches.filter((m) => !m.bye).sort((a, b) => (a.scheduledAt ?? 'z').localeCompare(b.scheduledAt ?? 'z')).forEach((m) => {
      const k = m.roundLabel;
      map.set(k, [...(map.get(k) ?? []), toCard(m, t, teams)]);
    });
    return [...map.entries()];
  }, [t, teams]);
  return (
    <>
      {groups.map(([label, list]) => (
        <section key={label} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 650 }}>{label} <span style={{ color: '#6E6E73', fontWeight: 400, fontSize: 14 }}>{list[0].scheduledAt ? formatDate(list[0].scheduledAt) : ''}</span></h3>
          <div className="pub-today">{list.map((m) => <PubGame key={m.id} m={m} now={now} to={link(m.id)} />)}</div>
        </section>
      ))}
    </>
  );
}

function PubScorers({ t, teams }: { t: Tournament; teams: Map<number, Team> }) {
  if (!t.scorers.length) return <p style={{ color: '#6E6E73' }}>Aún no hay {t.sport.scorersTitle.toLowerCase()}.</p>;
  return (
    <section className="pub-card" style={{ overflow: 'hidden' }}>
      {t.scorers.map((s, i) => (
        <div key={s.playerId} className="list-row" style={{ borderTopColor: 'rgba(0,0,0,.05)' }}>
          <span className="num" style={{ width: 20, color: '#8E8E93', fontWeight: 600 }}>{i + 1}</span>
          <TeamBadge team={teams.get(s.teamId)} size={28} />
          <span style={{ flex: 1 }}><b>{s.player}</b><br /><small style={{ color: '#6E6E73' }}>{teams.get(s.teamId)?.name}</small></span>
          <b className="num" style={{ fontSize: 22 }}>{s.value}</b>
        </div>
      ))}
    </section>
  );
}

export function PublicMatchPage() {
  const { org: orgSlug, id } = useParams();
  const matchId = Number(id);
  const { data, error, loading } = useMatchLive(() => api.publicMatch(matchId), matchId);
  const now = useNow(data?.match.status === 'LIVE');
  if (loading) return <div className="pub"><div className="pub-head" style={{ height: 200 }} /></div>;
  if (error || !data) return <div className="pub app-center"><div className="pub-card" style={{ padding: 32 }}><h1 style={{ fontSize: 22 }}>No encontramos el partido</h1></div></div>;
  const org = data.tournament.organization;
  return (
    <div className="pub">
      <PubHeader org={org} />
      <main className="pub-main" style={{ maxWidth: 860 }}>
        <Link to={`/l/${orgSlug ?? org.slug}/${data.tournament.slug}`} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontWeight: 500 }}><Icon name="back" size={16} />{data.tournament.name}</Link>
        <section className="pub-card"><Scoreboard detail={data} now={now} /></section>
        {data.sport.scoring !== 'SETS' && (
          <section className="pub-card" style={{ overflow: 'hidden' }}>
            <div className="card-head" style={{ borderBottomColor: 'rgba(0,0,0,.06)' }}><h3>Minuto a minuto</h3><span style={{ color: '#6E6E73' }}>{formatDateTime(data.match.scheduledAt)}</span></div>
            <Timeline detail={data} />
          </section>
        )}
      </main>
      <PubFooter org={org} />
    </div>
  );
}
