package com.duangomez.torneos.repo;

import com.duangomez.torneos.domain.Enums.TournamentStatus;
import com.duangomez.torneos.domain.Tournament;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TournamentRepository extends JpaRepository<Tournament, Long> {

    Optional<Tournament> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Tournament> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    List<Tournament> findByStatusInOrderByUpdatedAtDesc(Collection<TournamentStatus> statuses);

    List<Tournament> findByDemoTrue();
}
