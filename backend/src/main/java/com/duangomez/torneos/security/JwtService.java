package com.duangomez.torneos.security;

import com.duangomez.torneos.security.AuthPrincipal.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration organizerTtl;
    private final Duration refereeTtl;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.organizer-hours:168}") long organizerHours,
                      @Value("${app.jwt.referee-hours:12}") long refereeHours) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) throw new IllegalStateException("app.jwt.secret debe tener al menos 32 caracteres");
        this.key = Keys.hmacShaKeyFor(bytes);
        this.organizerTtl = Duration.ofHours(organizerHours);
        this.refereeTtl = Duration.ofHours(refereeHours);
    }

    public String issue(AuthPrincipal principal) {
        Instant now = Instant.now();
        Duration ttl = principal.isOrganizer() ? organizerTtl : refereeTtl;
        var builder = Jwts.builder()
                .subject(principal.isOrganizer() ? String.valueOf(principal.userId()) : "referee")
                .claim("name", principal.name())
                .claim("role", principal.role().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)));
        if (principal.tournamentId() != null) builder.claim("tid", principal.tournamentId());
        return builder.signWith(key).compact();
    }

    public Optional<AuthPrincipal> parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            Role role = Role.valueOf(claims.get("role", String.class));
            String name = claims.get("name", String.class);
            if (role == Role.ORGANIZER) {
                return Optional.of(AuthPrincipal.organizer(Long.valueOf(claims.getSubject()), name));
            }
            Number tid = claims.get("tid", Number.class);
            return tid == null ? Optional.empty() : Optional.of(AuthPrincipal.referee(tid.longValue()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
