package com.duangomez.torneos.repo;

import com.duangomez.torneos.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<Team, Long> {
}
