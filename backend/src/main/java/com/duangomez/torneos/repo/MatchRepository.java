package com.duangomez.torneos.repo;

import com.duangomez.torneos.domain.Enums.MatchStatus;
import com.duangomez.torneos.domain.Enums.Stage;
import com.duangomez.torneos.domain.Match;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<Match, Long> {

    List<Match> findByTournamentIdAndStatus(Long tournamentId, MatchStatus status);

    Optional<Match> findByTournamentIdAndStageAndRoundNumberAndBracketPosition(
            Long tournamentId, Stage stage, int roundNumber, Integer bracketPosition);

    long countByStatus(MatchStatus status);
}
