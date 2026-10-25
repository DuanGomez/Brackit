package com.duangomez.torneos.repo;

import com.duangomez.torneos.domain.Venue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VenueRepository extends JpaRepository<Venue, Long> {

    List<Venue> findByOrganizationIdOrderByNameAsc(Long organizationId);

    long countByOrganizationId(Long organizationId);
}
