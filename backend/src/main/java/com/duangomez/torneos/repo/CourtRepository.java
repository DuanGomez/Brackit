package com.duangomez.torneos.repo;

import com.duangomez.torneos.domain.Court;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CourtRepository extends JpaRepository<Court, Long> {

    @Query("select c from Court c join fetch c.venue v where v.organization.id = :org order by v.name, c.position, c.id")
    List<Court> findByOrganization(@Param("org") Long organizationId);
}
