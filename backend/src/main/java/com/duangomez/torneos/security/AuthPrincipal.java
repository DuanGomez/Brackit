package com.duangomez.torneos.security;

/**
 * Quién hace la petición. El token solo identifica a la persona: el rol depende de cada
 * organización y se consulta en la base de datos ({@code OrgAccess}).
 */
public record AuthPrincipal(Long userId, String name) {
}
