package com.duangomez.torneos.security;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Frena la adivinación de PINs y contraseñas: tras 5 fallos en 15 minutos para la misma
 * clave (origen + torneo o correo) se bloquean los intentos hasta que pase la ventana.
 */
@Component
public class LoginAttemptLimiter {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final Clock clock;

    public LoginAttemptLimiter() {
        this(Clock.systemUTC());
    }

    LoginAttemptLimiter(Clock clock) {
        this.clock = clock;
    }

    public boolean isBlocked(String key) {
        Deque<Instant> list = failures.get(key);
        if (list == null) return false;
        synchronized (list) {
            prune(list);
            return list.size() >= MAX_FAILURES;
        }
    }

    public void recordFailure(String key) {
        Deque<Instant> list = failures.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (list) {
            prune(list);
            list.addLast(clock.instant());
        }
    }

    public void reset(String key) {
        failures.remove(key);
    }

    private void prune(Deque<Instant> list) {
        Instant limit = clock.instant().minus(WINDOW);
        while (!list.isEmpty() && list.peekFirst().isBefore(limit)) list.removeFirst();
    }
}
