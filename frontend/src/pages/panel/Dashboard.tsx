import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import type { TournamentCard as Card } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../components/Icon';
import { TournamentCard } from '../../components/TournamentCard';

export default function Dashboard() {
  const { session } = useAuth();
  const [list, setList] = useState<Card[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.myTournaments().then(setList).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="container page stack" style={{ gap: 24 }}>
      <div className="row-between">
        <div>
          <p className="eyebrow">Hola, {session?.user?.name}</p>
          <h1 className="title">Mis torneos</h1>
        </div>
        <Link to="/panel/nuevo" className="btn"><Icon name="plus" size={17} />Crear torneo</Link>
      </div>
      {error && <p className="form-error">{error}</p>}
      {!list ? (
        <div className="grid-cards">{[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 280 }} />)}</div>
      ) : list.length === 0 ? (
        <div className="card empty">
          <h3>Todavía no tienes torneos</h3>
          <p>Crea el primero: eliges deporte, formato y equipos, y el calendario se arma solo.</p>
          <Link to="/panel/nuevo" className="btn" style={{ marginTop: 16 }}>Crear mi primer torneo</Link>
        </div>
      ) : (
        <div className="grid-cards">{list.map((t) => <TournamentCard key={t.id} t={t} to={`/panel/t/${t.id}`} />)}</div>
      )}
    </div>
  );
}
