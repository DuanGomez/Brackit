package com.duangomez.torneos.web;

import com.duangomez.torneos.domain.Team;
import com.duangomez.torneos.repo.TeamRepository;
import com.duangomez.torneos.service.CrestRenderer;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

/** Escudos de los equipos: la foto subida o, si no hay, un escudo generado. Son públicos y se guardan en caché. */
@RestController
@RequestMapping("/api/public")
public class TeamLogoController {

    private static final MediaType SVG = MediaType.parseMediaType("image/svg+xml");
    private final TeamRepository teams;

    public TeamLogoController(TeamRepository teams) {
        this.teams = teams;
    }

    /** Con ?v= (la versión del escudo) se guarda en caché un año; cambia sola cuando el escudo cambia. */
    @GetMapping("/teams/{id}/logo")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> logo(@PathVariable Long id, @RequestParam(required = false) String v) {
        Team team = teams.findById(id).orElseThrow(() -> ApiException.notFound("Equipo no encontrado"));
        CacheControl cache = v != null ? CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable() : CacheControl.maxAge(Duration.ofMinutes(5));
        String photo = team.getLogo();
        if (photo != null) {
            int comma = photo.indexOf(',');
            String type = photo.substring("data:".length(), photo.indexOf(';'));
            return image(Base64.getDecoder().decode(photo.substring(comma + 1)), MediaType.parseMediaType(type), cache);
        }
        String svg = CrestRenderer.svg(team.getCrestStyle(), team.getColor(), team.getColor2(), team.getShortName());
        return image(svg.getBytes(StandardCharsets.UTF_8), SVG, cache);
    }

    /** Vista previa de un escudo generado, para el editor del equipo. */
    @GetMapping("/crest")
    public ResponseEntity<byte[]> crest(@RequestParam(defaultValue = "0") int style, @RequestParam(required = false) String color,
                                        @RequestParam(required = false) String color2, @RequestParam(defaultValue = "") String label) {
        String svg = CrestRenderer.svg(style, color, color2, label.length() > 4 ? label.substring(0, 4) : label);
        return image(svg.getBytes(StandardCharsets.UTF_8), SVG, CacheControl.maxAge(Duration.ofDays(30)).cachePublic());
    }

    private static ResponseEntity<byte[]> image(byte[] body, MediaType type, CacheControl cache) {
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(cache)
                .header("X-Content-Type-Options", "nosniff")
                // Una imagen no ejecuta nada aunque alguien la abra directamente
                .header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")
                .header("Cross-Origin-Resource-Policy", "cross-origin")
                .body(body);
    }
}
