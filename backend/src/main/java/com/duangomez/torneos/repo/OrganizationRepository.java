package com.duangomez.torneos.repo;

import com.duangomez.torneos.domain.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    Optional<Organization> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Organization> findByDemoTrue();

    List<Organization> findAllByOrderByNameAsc();
}
