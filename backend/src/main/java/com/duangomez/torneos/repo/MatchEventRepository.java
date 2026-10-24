package com.duangomez.torneos.repo;

import com.duangomez.torneos.domain.MatchEvent;
import com.duangomez.torneos.sport.EventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface MatchEventRepository extends JpaRepository<MatchEvent, Long> {

    /** Eventos que suman para goleadores/anotadores en todo el torneo (con jugador asignado). */
    @Query("""
            select e from MatchEvent e join fetch e.player p join fetch e.team t
            where e.match.tournament.id = :tournamentId and e.type in :types
            """)
    List<MatchEvent> findScoringEvents(@Param("tournamentId") Long tournamentId,
                                       @Param("types") Collection<EventType> types);
}
