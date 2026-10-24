package com.duangomez.torneos;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Flujos completos contra la API real (H2 en memoria). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiFlowTest {

    private static final AtomicInteger IP = new AtomicInteger(10);

    @Autowired
    MockMvc mvc;

    @MockitoBean
    SimpMessagingTemplate messaging;

    // ---------- Apoyo ----------

    private String json(ResultActions result) throws Exception {
        return result.andReturn().getResponse().getContentAsString();
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String token, String body) throws Exception {
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(request);
    }

    private String register() throws Exception {
        String email = "org-" + UUID.randomUUID() + "@test.co";
        String body = "{\"name\":\"Organizadora\",\"email\":\"" + email + "\",\"password\":\"clave-segura-1\"}";
        return JsonPath.read(json(send(post("/api/auth/register"), null, body).andExpect(status().isCreated())), "$.token");
    }

    private String createTournament(String token, String sport, String format, int teams, String extra) throws Exception {
        StringBuilder list = new StringBuilder();
        for (int i = 1; i <= teams; i++) list.append(i > 1 ? "," : "").append("{\"name\":\"Equipo ").append(i).append("\"}");
        String body = "{\"name\":\"Copa de prueba\",\"sport\":\"" + sport + "\",\"format\":\"" + format + "\""
                + extra + ",\"teams\":[" + list + "]}";
        return json(send(post("/api/tournaments"), token, body).andExpect(status().isCreated()));
    }

    private String schedule(String token, Number id) throws Exception {
        String body = "{\"startDate\":\"2026-11-07\",\"firstMatchTime\":\"15:00\",\"daysBetweenRounds\":7,"
                + "\"minutesBetweenMatches\":120,\"venues\":[\"Cancha 1\",\"Cancha 2\"],\"timeZone\":\"America/Bogota\"}";
        return json(send(post("/api/tournaments/" + id + "/schedule"), token, body).andExpect(status().isOk()));
    }

    private String refereeToken(String slug, String pin) throws Exception {
        String body = "{\"code\":\"" + slug + "\",\"pin\":\"" + pin + "\"}";
        return JsonPath.read(json(send(post("/api/auth/referee").with(r -> {
            r.setRemoteAddr("10.0.0." + IP.incrementAndGet());
            return r;
        }), null, body).andExpect(status().isOk())), "$.token");
    }

    // ---------- Pruebas ----------

    @Test
    void organizadorCreaLigaYArbitroLlevaElPartidoEnVivo() throws Exception {
        String org = register();
        String created = createTournament(org, "FUTBOL", "LEAGUE", 4, "");
        Number id = JsonPath.read(created, "$.id");
        String slug = JsonPath.read(created, "$.slug");
        Number homeTeam = JsonPath.read(created, "$.teams[0].id");

        // Plantilla para poder asignar goleadores
        send(post("/api/teams/" + homeTeam + "/players"), org, "{\"name\":\"Ana Goleadora\",\"number\":9}")
                .andExpect(status().isCreated());

        // El torneo en borrador no es público
        send(get("/api/public/tournaments/" + slug), null, null).andExpect(status().isNotFound());

        String scheduled = schedule(org, id);
        assertThat((String) JsonPath.read(scheduled, "$.status")).isEqualTo("IN_PROGRESS");
        assertThat((List<?>) JsonPath.read(scheduled, "$.matches")).hasSize(6);
        send(get("/api/public/tournaments/" + slug), null, null).andExpect(status().isOk());

        String pin = JsonPath.read(json(send(post("/api/tournaments/" + id + "/referee-pin"), org, null)), "$.pin");
        assertThat(pin).matches("\\d{6}");
        String ref = refereeToken(slug, pin);

        // Primer partido donde juega el equipo con jugadora
        String full = json(send(get("/api/public/tournaments/" + slug), null, null));
        List<Integer> matchIds = JsonPath.read(full, "$.matches[?(@.homeId == " + homeTeam + " || @.awayId == " + homeTeam + ")].id");
        Number match = matchIds.get(0);
        Number playerId = JsonPath.read(full, "$.teams[0].players[0].id");

        send(post("/api/matches/" + match + "/start"), ref, null).andExpect(jsonPath("$.match.status").value("LIVE"));
        String goal = "{\"type\":\"GOAL\",\"teamId\":" + homeTeam + ",\"playerId\":" + playerId + "}";
        String afterGoal = json(send(post("/api/matches/" + match + "/events"), ref, goal).andExpect(status().isOk()));
        boolean isHome = homeTeam.equals(JsonPath.read(afterGoal, "$.match.homeId"));
        assertThat((Integer) JsonPath.read(afterGoal, isHome ? "$.match.homeScore" : "$.match.awayScore")).isEqualTo(1);
        assertThat((String) JsonPath.read(afterGoal, "$.events[0].playerName")).isEqualTo("Ana Goleadora");

        // Deshacer y volver a marcar
        send(post("/api/matches/" + match + "/undo"), ref, null).andExpect(jsonPath("$.events.length()").value(0));
        send(post("/api/matches/" + match + "/events"), ref, goal).andExpect(status().isOk());

        // Una tarjeta no suma; una canasta no aplica en fútbol
        send(post("/api/matches/" + match + "/events"), ref, "{\"type\":\"POINT_3\",\"teamId\":" + homeTeam + "}")
                .andExpect(status().isBadRequest());

        send(post("/api/matches/" + match + "/period"), ref, null).andExpect(jsonPath("$.match.periodLabel").value("2T"));
        send(post("/api/matches/" + match + "/period"), ref, null).andExpect(status().isBadRequest());
        send(post("/api/matches/" + match + "/finish"), ref, null).andExpect(jsonPath("$.match.status").value("FINISHED"));

        String after = json(send(get("/api/public/tournaments/" + slug), null, null));
        List<Integer> points = JsonPath.read(after, "$.standings[0].rows[?(@.teamId == " + homeTeam + ")].points");
        assertThat(points).containsExactly(3);
        assertThat((String) JsonPath.read(after, "$.scorers[0].player")).isEqualTo("Ana Goleadora");

        // El canal en vivo del torneo recibió el cambio
        verify(messaging, atLeastOnce()).convertAndSend(eq("/topic/tournaments/" + slug), any(Object.class));
        verify(messaging, atLeastOnce()).convertAndSend(eq("/topic/matches/" + match), any(Object.class));
    }

    @Test
    void permisosPorRolYPorTorneo() throws Exception {
        String owner = register();
        String other = register();
        String a = createTournament(owner, "FUTBOL", "LEAGUE", 2, "");
        Number idA = JsonPath.read(a, "$.id");
        String slugA = JsonPath.read(a, "$.slug");
        String b = createTournament(owner, "FUTBOL", "LEAGUE", 2, "");
        Number idB = JsonPath.read(b, "$.id");
        schedule(owner, idA);
        String scheduledB = schedule(owner, idB);
        Number matchB = JsonPath.read(scheduledB, "$.matches[0].id");

        // Otro organizador no puede editar ni ver el panel ajeno
        send(put("/api/tournaments/" + idA), other, "{\"name\":\"Robado\"}").andExpect(status().isForbidden());
        send(get("/api/tournaments/" + idA), other, null).andExpect(status().isForbidden());

        // Sin sesión: 401
        send(post("/api/matches/" + matchB + "/start"), null, null).andExpect(status().isUnauthorized());

        // El árbitro del torneo A no opera partidos del B ni entra al panel de organizador
        String pinA = JsonPath.read(json(send(post("/api/tournaments/" + idA + "/referee-pin"), owner, null)), "$.pin");
        String ref = refereeToken(slugA, pinA);
        send(post("/api/matches/" + matchB + "/start"), ref, null).andExpect(status().isForbidden());
        send(get("/api/tournaments"), ref, null).andExpect(status().isForbidden());
        // Cargar resultados a mano es solo del organizador
        send(put("/api/matches/" + matchB + "/result"), ref, "{\"homeScore\":1,\"awayScore\":0}").andExpect(status().isForbidden());
    }

    @Test
    void pinIncorrectoSeBloqueaTrasCincoIntentos() throws Exception {
        String owner = register();
        String t = createTournament(owner, "TENIS", "KNOCKOUT", 2, "");
        String slug = JsonPath.read(t, "$.slug");
        send(post("/api/tournaments/" + JsonPath.read(t, "$.id") + "/referee-pin"), owner, null);
        String body = "{\"code\":\"" + slug + "\",\"pin\":\"000000\"}";
        for (int i = 0; i < 5; i++) {
            send(post("/api/auth/referee").with(r -> { r.setRemoteAddr("10.9.9.9"); return r; }), null, body)
                    .andExpect(status().isUnauthorized());
        }
        send(post("/api/auth/referee").with(r -> { r.setRemoteAddr("10.9.9.9"); return r; }), null, body)
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void baloncestoNoTerminaEmpatado() throws Exception {
        String org = register();
        Number id = JsonPath.read(createTournament(org, "BALONCESTO", "LEAGUE", 2, ""), "$.id");
        Number match = JsonPath.read(schedule(org, id), "$.matches[0].id");
        send(post("/api/matches/" + match + "/start"), org, null).andExpect(status().isOk());
        send(post("/api/matches/" + match + "/finish"), org, null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("En baloncesto no hay empates: juega la prórroga"));
        // Tras los 4 cuartos empatados se permite la prórroga
        for (int q = 0; q < 4; q++) send(post("/api/matches/" + match + "/period"), org, null).andExpect(status().isOk());
        send(get("/api/public/matches/" + match), null, null).andExpect(jsonPath("$.match.periodLabel").value("Prórroga 1"));
    }

    @Test
    void voleibolCierraSetsYAvanzaEnLaLlaveHastaElCampeon() throws Exception {
        String org = register();
        String created = createTournament(org, "VOLEIBOL", "KNOCKOUT", 4, "");
        Number id = JsonPath.read(created, "$.id");
        String scheduled = schedule(org, id);
        List<Integer> semis = JsonPath.read(scheduled, "$.matches[?(@.round == 1)].id");
        Number finalId = ((List<Integer>) JsonPath.read(scheduled, "$.matches[?(@.round == 2)].id")).get(0);

        // Set mal cerrado (25-24) se rechaza
        send(put("/api/matches/" + semis.get(0) + "/result"), org,
                "{\"homeScore\":0,\"awayScore\":0,\"sets\":[{\"home\":25,\"away\":24},{\"home\":25,\"away\":20},{\"home\":25,\"away\":20}]}")
                .andExpect(status().isBadRequest());

        String sets = "{\"homeScore\":0,\"awayScore\":0,\"sets\":[{\"home\":25,\"away\":20},{\"home\":23,\"away\":25},"
                + "{\"home\":25,\"away\":18},{\"home\":26,\"away\":24}]}";
        String semi1 = json(send(put("/api/matches/" + semis.get(0) + "/result"), org, sets).andExpect(status().isOk()));
        assertThat((Integer) JsonPath.read(semi1, "$.match.homeScore")).isEqualTo(3);

        // En vivo: puntos hasta cerrar el partido de la otra semifinal
        Number semi2 = semis.get(1);
        String start = json(send(post("/api/matches/" + semi2 + "/start"), org, null));
        Number away = JsonPath.read(start, "$.match.awayId");
        String last = null;
        for (int i = 0; i < 75; i++) {
            last = json(send(post("/api/matches/" + semi2 + "/points"), org, "{\"teamId\":" + away + "}").andExpect(status().isOk()));
        }
        assertThat((String) JsonPath.read(last, "$.match.status")).isEqualTo("FINISHED");
        assertThat((Integer) JsonPath.read(last, "$.match.awayScore")).isEqualTo(3);

        String finalMatch = json(send(get("/api/public/matches/" + finalId), null, null));
        assertThat((Integer) JsonPath.read(finalMatch, "$.match.awayId")).isEqualTo(away.intValue());

        String winSets = "{\"homeScore\":0,\"awayScore\":0,\"sets\":[{\"home\":25,\"away\":10},{\"home\":25,\"away\":10},{\"home\":25,\"away\":10}]}";
        send(put("/api/matches/" + finalId + "/result"), org, winSets).andExpect(status().isOk());
        String done = json(send(get("/api/tournaments/" + id), org, null));
        assertThat((String) JsonPath.read(done, "$.status")).isEqualTo("FINISHED");
        assertThat((Object) JsonPath.read(done, "$.championId")).isNotNull();
    }

    @Test
    void eliminacionEnFutbolExigePenalesSiHayEmpate() throws Exception {
        String org = register();
        Number id = JsonPath.read(createTournament(org, "FUTBOL", "KNOCKOUT", 2, ""), "$.id");
        Number match = JsonPath.read(schedule(org, id), "$.matches[0].id");
        send(put("/api/matches/" + match + "/result"), org, "{\"homeScore\":1,\"awayScore\":1}")
                .andExpect(status().isBadRequest());
        send(put("/api/matches/" + match + "/result"), org,
                "{\"homeScore\":1,\"awayScore\":1,\"homePenalties\":4,\"awayPenalties\":3}")
                .andExpect(jsonPath("$.match.homePenalties").value(4));
    }

    @Test
    void alTerminarLosGruposSeArmaLaFaseFinal() throws Exception {
        String org = register();
        String created = createTournament(org, "BALONMANO", "GROUPS_KNOCKOUT", 4, ",\"groupsCount\":2,\"advancePerGroup\":1");
        Number id = JsonPath.read(created, "$.id");
        String scheduled = schedule(org, id);
        List<Integer> groupMatches = JsonPath.read(scheduled, "$.matches[?(@.stage == 'GROUP')].id");
        assertThat(groupMatches).hasSize(2);
        for (Integer m : groupMatches) {
            send(put("/api/matches/" + m + "/result"), org, "{\"homeScore\":30,\"awayScore\":25}").andExpect(status().isOk());
        }
        String after = json(send(get("/api/tournaments/" + id), org, null));
        List<Integer> finals = JsonPath.read(after, "$.matches[?(@.stage == 'KNOCKOUT')].id");
        assertThat(finals).hasSize(1);
        List<String> labels = JsonPath.read(after, "$.matches[?(@.stage == 'KNOCKOUT')].roundLabel");
        assertThat(labels).containsExactly("Final");
        // Con la fase final armada, ya no se corrigen resultados de grupos
        send(put("/api/matches/" + groupMatches.get(0) + "/result"), org, "{\"homeScore\":20,\"awayScore\":25}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void validacionesDeEntrada() throws Exception {
        send(post("/api/auth/register"), null, "{\"name\":\"\",\"email\":\"malo\",\"password\":\"123\"}")
                .andExpect(status().isBadRequest());
        String org = register();
        send(post("/api/tournaments"), org, "{\"name\":\"X\",\"sport\":\"FUTBOL\",\"format\":\"GROUPS_KNOCKOUT\",\"groupsCount\":3,\"advancePerGroup\":1}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Elige 2, 4 u 8 grupos"));
        Number id = JsonPath.read(createTournament(org, "FUTBOL", "LEAGUE", 1, ""), "$.id");
        send(post("/api/tournaments/" + id + "/schedule"), org,
                "{\"startDate\":\"2026-11-07\",\"firstMatchTime\":\"15:00\",\"daysBetweenRounds\":7,\"minutesBetweenMatches\":120}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Inscribe al menos 2 equipos"));
    }
}
