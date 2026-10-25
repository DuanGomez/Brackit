package com.duangomez.torneos.domain;

import com.duangomez.torneos.domain.Enums.MembershipStatus;
import com.duangomez.torneos.domain.Enums.Role;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Pertenencia de una persona a una organización con un rol. */
@Entity
@Table(name = "membership")
@Getter
@Setter
@NoArgsConstructor
public class Membership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id")
    private Organization organization;

    /** Nulo mientras la invitación no se acepta (la persona aún no tiene cuenta). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private AppUser user;

    private String email;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Enumerated(EnumType.STRING)
    private MembershipStatus status;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public Membership(Organization organization, AppUser user, String email, Role role, MembershipStatus status) {
        this.organization = organization;
        this.user = user;
        this.email = email;
        this.role = role;
        this.status = status;
    }
}
