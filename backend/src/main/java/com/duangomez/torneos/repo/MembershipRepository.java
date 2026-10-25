package com.duangomez.torneos.repo;

import com.duangomez.torneos.domain.Enums.MembershipStatus;
import com.duangomez.torneos.domain.Enums.Role;
import com.duangomez.torneos.domain.Membership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MembershipRepository extends JpaRepository<Membership, Long> {

    Optional<Membership> findByOrganizationIdAndUserIdAndStatus(Long organizationId, Long userId, MembershipStatus status);

    Optional<Membership> findByOrganizationIdAndEmailIgnoreCase(Long organizationId, String email);

    List<Membership> findByUserIdAndStatusOrderByCreatedAtAsc(Long userId, MembershipStatus status);

    List<Membership> findByEmailIgnoreCaseAndStatus(String email, MembershipStatus status);

    List<Membership> findByOrganizationIdOrderByCreatedAtAsc(Long organizationId);

    long countByOrganizationIdAndRoleAndStatus(Long organizationId, Role role, MembershipStatus status);
}
