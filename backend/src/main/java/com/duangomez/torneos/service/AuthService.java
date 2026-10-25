package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.AppUser;
import com.duangomez.torneos.domain.Enums.MembershipStatus;
import com.duangomez.torneos.domain.Membership;
import com.duangomez.torneos.repo.MembershipRepository;
import com.duangomez.torneos.repo.UserRepository;
import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.security.JwtService;
import com.duangomez.torneos.security.LoginAttemptLimiter;
import com.duangomez.torneos.web.ApiException;
import com.duangomez.torneos.web.Dtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository users;
    private final MembershipRepository memberships;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final LoginAttemptLimiter limiter;

    public AuthService(UserRepository users, MembershipRepository memberships, PasswordEncoder encoder,
                       JwtService jwt, LoginAttemptLimiter limiter) {
        this.users = users;
        this.memberships = memberships;
        this.encoder = encoder;
        this.jwt = jwt;
        this.limiter = limiter;
    }

    /** Crea la cuenta y activa las invitaciones que esperaban ese correo. */
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) throw ApiException.conflict("Ya existe una cuenta con ese correo");
        AppUser user = users.save(new AppUser(req.name().trim(), email, encoder.encode(req.password())));
        for (Membership invite : memberships.findByEmailIgnoreCaseAndStatus(email, MembershipStatus.INVITED)) {
            invite.setUser(user);
            invite.setStatus(MembershipStatus.ACTIVE);
        }
        return response(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req, String origin) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        String key = "login:" + origin + ":" + email;
        if (limiter.isBlocked(key)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.");
        }
        AppUser user = users.findByEmailIgnoreCase(email)
                .filter(u -> encoder.matches(req.password(), u.getPasswordHash()))
                .orElse(null);
        if (user == null) {
            limiter.recordFailure(key);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos");
        }
        limiter.reset(key);
        return response(user);
    }

    @Transactional(readOnly = true)
    public SessionDto me(AuthPrincipal principal) {
        AppUser user = users.findById(principal.userId()).orElseThrow(() -> ApiException.notFound("Cuenta no encontrada"));
        return new SessionDto(user(user), membershipsOf(user));
    }

    private AuthResponse response(AppUser user) {
        String token = jwt.issue(new AuthPrincipal(user.getId(), user.getName()));
        return new AuthResponse(token, user(user), membershipsOf(user));
    }

    private static UserDto user(AppUser u) {
        return new UserDto(u.getId(), u.getName(), u.getEmail());
    }

    List<MembershipDto> membershipsOf(AppUser user) {
        return memberships.findByUserIdAndStatusOrderByCreatedAtAsc(user.getId(), MembershipStatus.ACTIVE).stream()
                .map(m -> new MembershipDto(m.getOrganization().getId(), m.getOrganization().getSlug(),
                        m.getOrganization().getName(), m.getOrganization().getShortName(), m.getOrganization().getColor(),
                        m.getOrganization().getPlan().name(), m.getRole().name()))
                .toList();
    }
}
