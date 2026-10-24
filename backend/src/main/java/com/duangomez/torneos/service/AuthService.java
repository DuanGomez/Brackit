package com.duangomez.torneos.service;

import com.duangomez.torneos.domain.AppUser;
import com.duangomez.torneos.domain.Tournament;
import com.duangomez.torneos.repo.TournamentRepository;
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

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository users;
    private final TournamentRepository tournaments;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final LoginAttemptLimiter limiter;

    public AuthService(UserRepository users, TournamentRepository tournaments, PasswordEncoder encoder,
                       JwtService jwt, LoginAttemptLimiter limiter) {
        this.users = users;
        this.tournaments = tournaments;
        this.encoder = encoder;
        this.jwt = jwt;
        this.limiter = limiter;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) throw ApiException.conflict("Ya existe una cuenta con ese correo");
        AppUser user = users.save(new AppUser(req.name().trim(), email, encoder.encode(req.password())));
        return organizerResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req, String origin) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        String key = "login:" + origin + ":" + email;
        if (limiter.isBlocked(key)) throw tooMany();
        AppUser user = users.findByEmailIgnoreCase(email)
                .filter(u -> encoder.matches(req.password(), u.getPasswordHash()))
                .orElse(null);
        if (user == null) {
            limiter.recordFailure(key);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos");
        }
        limiter.reset(key);
        return organizerResponse(user);
    }

    /** El árbitro entra con el código del torneo y el PIN que le compartió el organizador. */
    @Transactional(readOnly = true)
    public AuthResponse refereeLogin(RefereeLoginRequest req, String origin) {
        String code = req.code().trim().toLowerCase(Locale.ROOT);
        String key = "pin:" + origin + ":" + code;
        if (limiter.isBlocked(key)) throw tooMany();
        Tournament t = tournaments.findBySlug(code).orElse(null);
        boolean ok = t != null && t.getRefereePinHash() != null && encoder.matches(req.pin().trim(), t.getRefereePinHash());
        if (!ok) {
            limiter.recordFailure(key);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Código o PIN incorrectos");
        }
        limiter.reset(key);
        String token = jwt.issue(AuthPrincipal.referee(t.getId()));
        return new AuthResponse(token, AuthPrincipal.Role.REFEREE.name(), null, TournamentViews.card(t));
    }

    @Transactional(readOnly = true)
    public UserDto me(AuthPrincipal principal) {
        if (!principal.isOrganizer()) throw ApiException.forbidden("Solo para organizadores");
        AppUser user = users.findById(principal.userId()).orElseThrow(() -> ApiException.notFound("Cuenta no encontrada"));
        return new UserDto(user.getId(), user.getName(), user.getEmail());
    }

    private AuthResponse organizerResponse(AppUser user) {
        String token = jwt.issue(AuthPrincipal.organizer(user.getId(), user.getName()));
        return new AuthResponse(token, AuthPrincipal.Role.ORGANIZER.name(),
                new UserDto(user.getId(), user.getName(), user.getEmail()), null);
    }

    private static ApiException tooMany() {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.");
    }
}
