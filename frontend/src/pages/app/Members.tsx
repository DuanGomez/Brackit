import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import type { MatchCard, Member, Role } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../components/Icon';
import { addDays, formatDateTime, ROLE_LABEL, todayKey } from '../../lib/format';
import { useLoad } from '../../live/hooks';
import { PageHeader, useOrg } from './AppLayout';

const ROLE_HELP: Record<Role, string> = {
  ADMIN: 'Todo: miembros, ajustes, torneos y resultados.',
  COORDINATOR: 'Torneos, equipos, calendario y resultados.',
  REFEREE: 'Ve sus partidos y lleva el marcador en vivo.',
};

/** Miembros de la organización: invitar por correo, cambiar rol o quitar. */
export default function Members() {
  const { org, isAdmin, toast } = useOrg();
  const { session } = useAuth();
  const { data, loading, error, reload } = useLoad(() => api.members(org.slug), `members-${org.slug}`);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('REFEREE');
  const [formError, setFormError] = useState<string | null>(null);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const m = await api.invite(org.slug, email, role);
      toast(m.status === 'ACTIVE' ? `${m.name ?? m.email} ya es ${ROLE_LABEL[m.role].toLowerCase()}` : `Invitación lista: cuando ${m.email} cree su cuenta, entrará como ${ROLE_LABEL[m.role].toLowerCase()}`);
      setEmail('');
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    }
  }
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast(msg);
      reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <PageHeader title="Miembros y roles"><p className="muted">Cada persona entra con su propia cuenta y solo ve esta organización si la invitas.</p></PageHeader>
      {isAdmin && (
        <form className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={invite}>
          <h2 className="h2">Invitar a alguien</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: '1 1 240px' }} type="email" required placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select className="select" style={{ width: 'auto' }} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {(['REFEREE', 'COORDINATOR', 'ADMIN'] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            <button className="btn">Invitar</button>
          </div>
          <small className="muted">{ROLE_HELP[role]} Si la persona aún no tiene cuenta, la invitación se activa cuando se registre con ese correo.</small>
          {formError && <p className="form-error">{formError}</p>}
        </form>
      )}
      {loading ? <div className="skeleton" style={{ height: 240 }} /> : error || !data ? <div className="card empty"><h3>No se pudieron cargar</h3><p>{error}</p></div> : (
        <section className="card" style={{ overflow: 'hidden' }}>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Persona</th><th>Rol</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {data.map((m: Member) => {
                  const me = m.userId === session?.user.id;
                  return (
                    <tr key={m.id}>
                      <td><b style={{ fontWeight: 600 }}>{m.name ?? 'Invitación pendiente'}{me && <span className="muted" style={{ fontWeight: 400 }}> (tú)</span>}</b><br /><small className="muted">{m.email}</small></td>
                      <td>{isAdmin && !me ? (
                        <select className="select" style={{ width: 'auto', height: 34 }} value={m.role} onChange={(e) => act(() => api.changeRole(org.slug, m.id, e.target.value as Role), 'Rol actualizado')}>
                          {(['ADMIN', 'COORDINATOR', 'REFEREE'] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                      ) : ROLE_LABEL[m.role]}</td>
                      <td>{m.status === 'ACTIVE' ? <span className="chip chip-done">Activo</span> : <span className="chip chip-sched">Invitado</span>}</td>
                      <td style={{ textAlign: 'right' }}>{isAdmin && !me && <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.confirm(`¿Quitar a ${m.name ?? m.email}?`) && act(() => api.removeMember(org.slug, m.id), 'Miembro quitado')}>Quitar</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

/** Árbitros: quiénes son y cuántos partidos tienen en los próximos 14 días. */
export function Referees() {
  const { org, isAdmin } = useOrg();
  const from = todayKey();
  const { data, loading, error } = useLoad(async () => {
    const [members, matches] = await Promise.all([api.members(org.slug), api.matches(org.slug, { from, to: addDays(from, 14) })]);
    return { members: members.filter((m) => m.role === 'REFEREE'), matches };
  }, `refs-${org.slug}`);
  const upcoming = (data?.matches ?? []).filter((m) => m.status === 'SCHEDULED');
  const unassigned = upcoming.filter((m) => !m.refereeId);
  const next = (userId: number | null) => upcoming.filter((m) => m.refereeId === userId).sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <PageHeader title="Árbitros" actions={isAdmin && <Link className="btn" to={`/app/${org.slug}/miembros`}><Icon name="plus" size={15} />Invitar árbitro</Link>}>
        <p className="muted">Asigna árbitros desde el calendario o desde cada partido. Cada uno ve sus partidos en su celular.</p>
      </PageHeader>
      {loading ? <div className="skeleton" style={{ height: 240 }} /> : error || !data ? <div className="card empty"><h3>No se pudieron cargar</h3><p>{error}</p></div> : (
        <>
          <div className="stats">
            <div className="stat"><span>Árbitros</span><b>{data.members.length}</b><small>en la organización</small></div>
            <div className="stat"><span>Próximos 14 días</span><b>{upcoming.length}</b><small>partidos programados</small></div>
            <div className="stat"><span>Sin árbitro</span><b style={{ color: unassigned.length ? 'var(--danger)' : undefined }}>{unassigned.length}</b><small>por asignar</small></div>
          </div>
          {!data.members.length ? (
            <div className="card empty"><h3>Aún no hay árbitros</h3><p>Invítalos por correo desde Miembros y roles.</p></div>
          ) : (
            <section className="card" style={{ overflow: 'hidden' }}>
              {data.members.map((m) => {
                const list: MatchCard[] = next(m.userId);
                return (
                  <div key={m.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <span className="side-avatar" style={{ width: 36, height: 36 }}>{(m.name ?? m.email).slice(0, 2).toUpperCase()}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontWeight: 600 }}>{m.name ?? m.email}</b>{m.status === 'INVITED' && <span className="chip chip-sched" style={{ marginLeft: 8 }}>Invitado</span>}<br />
                      <small className="muted">{list.length ? `Próximo: ${list[0].home?.name} vs ${list[0].away?.name} · ${formatDateTime(list[0].scheduledAt)}` : 'Sin partidos asignados'}</small>
                    </span>
                    <span className="chip num">{list.length} partidos</span>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
