package com.duangomez.torneos.web;

import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.service.AuthService;
import com.duangomez.torneos.web.Dtos.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return auth.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
        return auth.login(req, http.getRemoteAddr());
    }

    @PostMapping("/referee")
    public AuthResponse referee(@Valid @RequestBody RefereeLoginRequest req, HttpServletRequest http) {
        return auth.refereeLogin(req, http.getRemoteAddr());
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AuthPrincipal principal) {
        return auth.me(principal);
    }
}
