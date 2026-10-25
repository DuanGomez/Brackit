package com.duangomez.torneos.repo;

import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {

    /** Partidos de la organización con hora dentro del rango (para calendario y panel). */
    @Query("""
            select m from Match m join fetch m.tournament t
            where t.organization.id = :org and m.scheduledAt >= :from and m.scheduledAt < :to and m.bye = false
            order by m.scheduledAt
            """)
    List<Match> findScheduled(@Param("org") Long organizationId, @Param("from") Instant from, @Param("to") Instant to);

    /** Partidos en esas canchas que pueden chocar con un rango de fechas. */
    @Query("""
            select m from Match m
            where m.court.id in :courts and m.scheduledAt >= :from and m.scheduledAt < :to
              and m.status <> com.duangomez.torneos.domain.Enums.MatchStatus.CANCELLED and m.bye = false
            """)
    List<Match> findOnCourts(@Param("courts") Collection<Long> courtIds, @Param("from") Instant from, @Param("to") Instant to);

    /** Partidos por programar de los torneos en juego de la organización. */
    @Query("""
            select m from Match m join fetch m.tournament t
            where t.organization.id = :org and t.status = com.duangomez.torneos.domain.Enums.TournamentStatus.IN_PROGRESS
              and m.status = com.duangomez.torneos.domain.Enums.MatchStatus.SCHEDULED and m.bye = false
              and (m.court is null or m.scheduledAt is null)
            order by t.id, m.roundNumber, m.id
            """)
    List<Match> findUnplaced(@Param("org") Long organizationId);

    @Query("""
            select m from Match m join fetch m.tournament t
            where t.organization.id = :org and m.status in :statuses
            order by m.scheduledAt
            """)
    List<Match> findByOrganizationAndStatus(@Param("org") Long organizationId, @Param("statuses") Collection<MatchStatus> statuses);
}
