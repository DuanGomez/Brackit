package com.duangomez.torneos.repo;

import com.duangomez.torneos.domain.Enums.TournamentStatus;
import com.duangomez.torneos.domain.Tournament;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TournamentRepository extends JpaRepository<Tournament, Long> {

    List<Tournament> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    List<Tournament> findByOrganizationIdAndStatusInOrderByCreatedAtDesc(Long organizationId, Collection<TournamentStatus> statuses);

    Optional<Tournament> findByOrganizationIdAndSlug(Long organizationId, String slug);

    boolean existsByOrganizationIdAndSlug(Long organizationId, String slug);

    long countByOrganizationIdAndStatusIn(Long organizationId, Collection<TournamentStatus> statuses);

    List<Tournament> findByOrganizationDemoTrue();
}
