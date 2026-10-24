package com.duangomez.torneos.repo;

import com.duangomez.torneos.domain.Player;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlayerRepository extends JpaRepository<Player, Long> {
}
