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

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Flujos completos contra la API real (H2 en memoria), incluido el aislamiento entre organizaciones. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiFlowTest {

    private static final ZoneId ZONE = ZoneId.of("America/Bogota");

    @Autowired
    MockMvc mvc;

    @MockitoBean
    SimpMessagingTemplate messaging;

    // ---------- Apoyo ----------

    private record Account(String token, String email) {
    }

    private String json(ResultActions result) throws Exception {
        return result.andReturn().getResponse().getContentAsString();
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String token, String body) throws Exception {
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(request);
    }

    private Account register() throws Exception {
        String email = "u-" + UUID.randomUUID() + "@test.co";
        return register(email);
    }

    private Account register(String email) throws Exception {
        String body = "{\"name\":\"Persona\",\"email\":\"" + email + "\",\"password\":\"clave-segura-1\"}";
        return new Account(JsonPath.read(json(send(post("/api/auth/register"), null, body).andExpect(status().isCreated())), "$.token"), email);
    }

    /** Crea una organización (plan Gratis) y devuelve su slug. */
    private String createOrg(String token, String name) throws Exception {
        String body = "{\"name\":\"" + name + "\",\"city\":\"Medellín\"}";
        return JsonPath.read(json(send(post("/api/orgs"), token, body).andExpect(status().isCreated())), "$.slug");
    }

    private Number addVenue(String token, String org) throws Exception {
        return JsonPath.read(json(send(post("/api/orgs/" + org + "/venues"), token, "{\"name\":\"Unidad Deportiva\"}")
                .andExpect(status().isCreated())), "$.id");
    }

    private Number addCourt(String token, String org, Number venue, String name, String sports) throws Exception {
        String body = "{\"name\":\"" + name + "\",\"surface\":\"Grama\",\"sports\":[" + sports + "]}";
        return JsonPath.read(json(send(post("/api/orgs/" + org + "/venues/" + venue + "/courts"), token, body)
                .andExpect(status().isCreated())), "$.id");
    }

    private String createTournament(String token, String org, String sport, String format, int teams, String extra) throws Exception {
        StringBuilder list = new StringBuilder();
        for (int i = 1; i <= teams; i++) list.append(i > 1 ? "," : "").append("{\"name\":\"Equipo ").append(i).append("\"}");
        String body = "{\"name\":\"Copa de prueba\",\"sport\":\"" + sport + "\",\"format\":\"" + format + "\""
                + extra + ",\"teams\":[" + list + "]}";
        return json(send(post("/api/orgs/" + org + "/tournaments"), token, body).andExpect(status().isCreated()));
    }

    private String schedule(String token, String org, Number id) throws Exception {
        String start = LocalDate.now(ZONE).plusDays(1).toString();
        json(send(post("/api/orgs/" + org + "/tournaments/" + id + "/schedule"), token, "{\"startDate\":\"" + start + "\"}")
                .andExpect(status().isOk()));
        return json(send(get("/api/orgs/" + org + "/tournaments/" + id), token, null));
    }

    /** Organización con una sede y una cancha para el deporte dado. */
    private String orgWithCourt(Account admin, String sport) throws Exception {
        String org = createOrg(admin.token(), "Liga " + UUID.randomUUID().toString().substring(0, 6));
        addCourt(admin.token(), org, addVenue(admin.token(), org), "Cancha 1", "\"" + sport + "\"");
        return org;
    }

    // ---------- Pruebas ----------

    @Test
    void organizacionCreaTorneoQueSeProgramaEnCanchasYElArbitroInvitadoLoDirige() throws Exception {
        Account admin = register();
        String org = createOrg(admin.token(), "Liga Barrial de Prueba");
        Number venue = addVenue(admin.token(), org);
        Number c1 = addCourt(admin.token(), org, venue, "Cancha 1", "\"FUTBOL\"");
        Number c2 = addCourt(admin.token(), org, venue, "Cancha 2", "\"FUTBOL\"");

        String created = createTournament(admin.token(), org, "FUTBOL", "LEAGUE", 4,
                ",\"minRestHours\":24,\"courtIds\":[" + c1 + "," + c2 + "]");
        Number id = JsonPath.read(created, "$.id");
        String slug = JsonPath.read(created, "$.slug");
        Number homeTeam = JsonPath.read(created, "$.teams[0].id");
        send(post("/api/orgs/" + org + "/teams/" + homeTeam + "/players"), admin.token(),
                "{\"name\":\"Ana Goleadora\",\"number\":9,\"document\":\"1036000000\"}").andExpect(status().isCreated());

        // Borrador: no es público
        send(get("/api/public/orgs/" + org + "/tournaments/" + slug), null, null).andExpect(status().isNotFound());

        String full = schedule(admin.token(), org, id);
        List<Map<String, Object>> matches = JsonPath.read(full, "$.matches");
        assertThat(matches).hasSize(6);
        assertThat(matches).allMatch(m -> m.get("scheduledAt") != null && m.get("courtId") != null);
        // Dos canchas: nunca dos partidos en la misma cancha a la misma hora
        Set<String> slots = new HashSet<>();
        for (Map<String, Object> m : matches) assertThat(slots.add(m.get("courtId") + "@" + m.get("scheduledAt"))).isTrue();
        send(get("/api/public/orgs/" + org + "/tournaments/" + slug), null, null).andExpect(status().isOk());

        // Invita a un árbitro que aún no tiene cuenta: al registrarse queda activo
        String refEmail = "arbitro-" + UUID.randomUUID() + "@test.co";
        send(post("/api/orgs/" + org + "/members"), admin.token(), "{\"email\":\"" + refEmail + "\",\"role\":\"REFEREE\"}")
                .andExpect(jsonPath("$.status").value("INVITED"));
        Account referee = register(refEmail);
        String session = json(send(get("/api/auth/me"), referee.token(), null));
        assertThat((String) JsonPath.read(session, "$.memberships[0].role")).isEqualTo("REFEREE");

        List<Integer> withTeam = JsonPath.read(full, "$.matches[?(@.homeId == " + homeTeam + " || @.awayId == " + homeTeam + ")].id");
        Number match = withTeam.get(0);
        Number playerId = JsonPath.read(full, "$.teams[0].players[0].id");

        send(post("/api/orgs/" + org + "/matches/" + match + "/start"), referee.token(), null).andExpect(jsonPath("$.match.status").value("LIVE"));
        String goal = "{\"type\":\"GOAL\",\"teamId\":" + homeTeam + ",\"playerId\":" + playerId + "}";
        String afterGoal = json(send(post("/api/orgs/" + org + "/matches/" + match + "/events"), referee.token(), goal).andExpect(status().isOk()));
        assertThat((String) JsonPath.read(afterGoal, "$.events[0].playerName")).isEqualTo("Ana Goleadora");
        send(post("/api/orgs/" + org + "/matches/" + match + "/undo"), referee.token(), null).andExpect(jsonPath("$.events.length()").value(0));
        send(post("/api/orgs/" + org + "/matches/" + match + "/events"), referee.token(), goal).andExpect(status().isOk());
        send(post("/api/orgs/" + org + "/matches/" + match + "/period"), referee.token(), null).andExpect(jsonPath("$.match.periodLabel").value("2T"));
        send(post("/api/orgs/" + org + "/matches/" + match + "/finish"), referee.token(), null).andExpect(jsonPath("$.match.status").value("FINISHED"));

        String after = json(send(get("/api/public/orgs/" + org + "/tournaments/" + slug), null, null));
        List<Integer> points = JsonPath.read(after, "$.standings[0].rows[?(@.teamId == " + homeTeam + ")].points");
        assertThat(points).containsExactly(3);
        assertThat((String) JsonPath.read(after, "$.scorers[0].player")).isEqualTo("Ana Goleadora");

        // Página pública de la organización
        send(get("/api/public/orgs/" + org), null, null).andExpect(jsonPath("$.tournaments.length()").value(1));
        verify(messaging, atLeastOnce()).convertAndSend(eq("/topic/tournaments/" + id), any(Object.class));
        verify(messaging, atLeastOnce()).convertAndSend(eq("/topic/orgs/" + org), any(Object.class));
    }

    @Test
    void unaOrganizacionNoVeNiTocaLoDeOtra() throws Exception {
        Account a = register();
        Account b = register();
        String orgA = orgWithCourt(a, "FUTBOL");
        String orgB = orgWithCourt(b, "FUTBOL");
        Number idA = JsonPath.read(createTournament(a.token(), orgA, "FUTBOL", "LEAGUE", 2, ""), "$.id");
        String fullA = schedule(a.token(), orgA, idA);
        Number matchA = JsonPath.read(fullA, "$.matches[0].id");

        // B no es miembro de A: todo responde como si no existiera
        send(get("/api/orgs/" + orgA + "/tournaments"), b.token(), null).andExpect(status().isNotFound());
        send(get("/api/orgs/" + orgA + "/dashboard"), b.token(), null).andExpect(status().isNotFound());
        // Ni siquiera a través de su propia organización puede tocar recursos de A
        send(get("/api/orgs/" + orgB + "/tournaments/" + idA), b.token(), null).andExpect(status().isNotFound());
        send(post("/api/orgs/" + orgB + "/matches/" + matchA + "/start"), b.token(), null).andExpect(status().isNotFound());
        // Sin sesión: 401
        send(get("/api/orgs/" + orgA + "/tournaments"), null, null).andExpect(status().isUnauthorized());
    }

    @Test
    void elRolLimitaLoQueCadaMiembroPuedeHacer() throws Exception {
        Account admin = register();
        String org = orgWithCourt(admin, "FUTBOL");
        Number id = JsonPath.read(createTournament(admin.token(), org, "FUTBOL", "LEAGUE", 4, ""), "$.id");
        String full = schedule(admin.token(), org, id);
        Number match = JsonPath.read(full, "$.matches[0].id");

        Account ref1 = register();
        Account ref2 = register();
        for (Account r : List.of(ref1, ref2)) {
            send(post("/api/orgs/" + org + "/members"), admin.token(), "{\"email\":\"" + r.email() + "\",\"role\":\"REFEREE\"}")
                    .andExpect(jsonPath("$.status").value("ACTIVE"));
        }
        // Un árbitro no crea torneos, no reprograma ni invita
        send(post("/api/orgs/" + org + "/tournaments"), ref1.token(), "{\"name\":\"X\",\"sport\":\"FUTBOL\",\"format\":\"LEAGUE\"}")
                .andExpect(status().isForbidden());
        send(post("/api/orgs/" + org + "/members"), ref1.token(), "{\"email\":\"x@test.co\",\"role\":\"ADMIN\"}")
                .andExpect(status().isForbidden());

        // Partido asignado a ref1: ref2 no puede dirigirlo
        String members = json(send(get("/api/orgs/" + org + "/members"), admin.token(), null));
        Number ref1Id = ((List<Integer>) JsonPath.read(members, "$[?(@.email == '" + ref1.email() + "')].userId")).get(0);
        send(put("/api/orgs/" + org + "/matches/" + match + "/referee"), admin.token(), "{\"refereeUserId\":" + ref1Id + "}")
                .andExpect(jsonPath("$.refereeName").value("Persona"));
        send(post("/api/orgs/" + org + "/matches/" + match + "/start"), ref2.token(), null).andExpect(status().isForbidden());
        send(post("/api/orgs/" + org + "/matches/" + match + "/start"), ref1.token(), null).andExpect(status().isOk());

        // No se puede dejar la organización sin administrador
        String adminMember = String.valueOf(((List<Integer>) JsonPath.read(members, "$[?(@.role == 'ADMIN')].id")).get(0));
        send(put("/api/orgs/" + org + "/members/" + adminMember), admin.token(), "{\"role\":\"REFEREE\"}").andExpect(status().isBadRequest());
    }

    @Test
    void elPlanGratisLimitaTorneosActivosYSedes() throws Exception {
        Account admin = register();
        String org = orgWithCourt(admin, "FUTBOL");
        createTournament(admin.token(), org, "FUTBOL", "LEAGUE", 2, "");
        send(post("/api/orgs/" + org + "/tournaments"), admin.token(), "{\"name\":\"Otro\",\"sport\":\"FUTBOL\",\"format\":\"LEAGUE\"}")
                .andExpect(status().isForbidden());
        send(post("/api/orgs/" + org + "/venues"), admin.token(), "{\"name\":\"Segunda sede\"}").andExpect(status().isForbidden());
        send(get("/api/orgs/" + org), admin.token(), null)
                .andExpect(jsonPath("$.plan").value("FREE"))
                .andExpect(jsonPath("$.limits.activeTournaments").value(1));
    }

    @Test
    void reprogramarDetectaChoquesYSoloGuardaSiSeConfirma() throws Exception {
        Account admin = register();
        String org = orgWithCourt(admin, "FUTBOL");
        Number id = JsonPath.read(createTournament(admin.token(), org, "FUTBOL", "LEAGUE", 4, ""), "$.id");
        String full = schedule(admin.token(), org, id);
        List<Map<String, Object>> matches = JsonPath.read(full, "$.matches");
        Map<String, Object> first = matches.get(0);
        Map<String, Object> second = matches.stream().filter(m -> !m.get("id").equals(first.get("id"))).findFirst().orElseThrow();

        // Mover el segundo partido a la misma cancha y hora del primero
        String body = "{\"courtId\":" + first.get("courtId") + ",\"startsAt\":\"" + first.get("scheduledAt") + "\",\"force\":false}";
        String conflicts = json(send(post("/api/orgs/" + org + "/matches/" + second.get("id") + "/check"), admin.token(), body).andExpect(status().isOk()));
        assertThat((List<String>) JsonPath.read(conflicts, "$[*].type")).contains("COURT_BUSY");
        send(put("/api/orgs/" + org + "/matches/" + second.get("id") + "/place"), admin.token(), body)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.conflicts[0].type").exists());

        // A las 3 a. m. está fuera del horario de la cancha
        Instant night = LocalDate.now(ZONE).plusDays(30).atTime(3, 0).atZone(ZONE).toInstant();
        String late = "{\"courtId\":" + first.get("courtId") + ",\"startsAt\":\"" + night + "\",\"force\":false}";
        send(put("/api/orgs/" + org + "/matches/" + second.get("id") + "/place"), admin.token(), late)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.conflicts[0].type").value("OUTSIDE_HOURS"));

        // Confirmando, se guarda igual
        String forced = late.replace("\"force\":false", "\"force\":true");
        send(put("/api/orgs/" + org + "/matches/" + second.get("id") + "/place"), admin.token(), forced)
                .andExpect(jsonPath("$.scheduledAt").value(night.toString()));
    }

    @Test
    void cancelarYRestaurarUnPartido() throws Exception {
        Account admin = register();
        String org = orgWithCourt(admin, "FUTBOL");
        Number id = JsonPath.read(createTournament(admin.token(), org, "FUTBOL", "LEAGUE", 4, ""), "$.id");
        Number match = JsonPath.read(schedule(admin.token(), org, id), "$.matches[0].id");
        send(post("/api/orgs/" + org + "/matches/" + match + "/cancel"), admin.token(), "{\"reason\":\"Lluvia\"}")
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.cancelReason").value("Lluvia"));
        send(post("/api/orgs/" + org + "/matches/" + match + "/start"), admin.token(), null).andExpect(status().isBadRequest());
        send(post("/api/orgs/" + org + "/matches/" + match + "/restore"), admin.token(), null).andExpect(jsonPath("$.status").value("SCHEDULED"));
    }

    @Test
    void voleibolConTercerPuestoHastaElCampeon() throws Exception {
        Account admin = register();
        String org = orgWithCourt(admin, "VOLEIBOL");
        Number id = JsonPath.read(createTournament(admin.token(), org, "VOLEIBOL", "KNOCKOUT", 4, ",\"thirdPlace\":true"), "$.id");
        String full = schedule(admin.token(), org, id);
        List<Integer> semis = JsonPath.read(full, "$.matches[?(@.stage == 'KNOCKOUT' && @.round == 1)].id");
        Number third = ((List<Integer>) JsonPath.read(full, "$.matches[?(@.stage == 'THIRD_PLACE')].id")).get(0);
        Number fin = ((List<Integer>) JsonPath.read(full, "$.matches[?(@.stage == 'KNOCKOUT' && @.round == 2)].id")).get(0);
        assertThat((List<String>) JsonPath.read(full, "$.matches[?(@.stage == 'THIRD_PLACE')].roundLabel")).containsExactly("Tercer puesto");

        send(put("/api/orgs/" + org + "/matches/" + semis.get(0) + "/result"), admin.token(),
                "{\"homeScore\":0,\"awayScore\":0,\"sets\":[{\"home\":25,\"away\":24}]}").andExpect(status().isBadRequest());
        String win = "{\"homeScore\":0,\"awayScore\":0,\"sets\":[{\"home\":25,\"away\":10},{\"home\":25,\"away\":10},{\"home\":25,\"away\":10}]}";
        for (Integer semi : semis) send(put("/api/orgs/" + org + "/matches/" + semi + "/result"), admin.token(), win).andExpect(status().isOk());

        String after = json(send(get("/api/orgs/" + org + "/tournaments/" + id), admin.token(), null));
        List<Integer> thirdTeams = JsonPath.read(after, "$.matches[?(@.id == " + third + ")].homeId");
        assertThat(thirdTeams.get(0)).isNotNull();
        send(put("/api/orgs/" + org + "/matches/" + fin + "/result"), admin.token(), win).andExpect(status().isOk());
        String done = json(send(get("/api/orgs/" + org + "/tournaments/" + id), admin.token(), null));
        assertThat((String) JsonPath.read(done, "$.status")).isEqualTo("FINISHED");
        assertThat((Object) JsonPath.read(done, "$.championId")).isNotNull();
    }

    @Test
    void alTerminarLosGruposLaFaseFinalSeArmaYSeProgramaSola() throws Exception {
        Account admin = register();
        String org = orgWithCourt(admin, "BALONMANO");
        Number id = JsonPath.read(createTournament(admin.token(), org, "BALONMANO", "GROUPS_KNOCKOUT", 4,
                ",\"groupsCount\":2,\"advancePerGroup\":1"), "$.id");
        String full = schedule(admin.token(), org, id);
        List<Integer> groupMatches = JsonPath.read(full, "$.matches[?(@.stage == 'GROUP')].id");
        for (Integer m : groupMatches) {
            send(put("/api/orgs/" + org + "/matches/" + m + "/result"), admin.token(), "{\"homeScore\":30,\"awayScore\":25}").andExpect(status().isOk());
        }
        String after = json(send(get("/api/orgs/" + org + "/tournaments/" + id), admin.token(), null));
        List<Map<String, Object>> finals = JsonPath.read(after, "$.matches[?(@.stage == 'KNOCKOUT')]");
        assertThat(finals).hasSize(1);
        assertThat(finals.get(0).get("roundLabel")).isEqualTo("Final");
        assertThat(finals.get(0).get("courtId")).isNotNull();
        assertThat(finals.get(0).get("scheduledAt")).isNotNull();
    }

    @Test
    void reglasDelDeporteBaloncestoYPenales() throws Exception {
        Account admin = register();
        String org = createOrg(admin.token(), "Club Mixto");
        Number venue = addVenue(admin.token(), org);
        addCourt(admin.token(), org, venue, "Coliseo", "\"BALONCESTO\",\"FUTBOL\"");

        Number basket = JsonPath.read(createTournament(admin.token(), org, "BALONCESTO", "LEAGUE", 2, ""), "$.id");
        Number bm = JsonPath.read(schedule(admin.token(), org, basket), "$.matches[0].id");
        send(post("/api/orgs/" + org + "/matches/" + bm + "/start"), admin.token(), null).andExpect(status().isOk());
        send(post("/api/orgs/" + org + "/matches/" + bm + "/finish"), admin.token(), null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("En baloncesto no hay empates: juega la prórroga"));
    }

    @Test
    void elEscudoSePersonalizaConFotoOEscudoGenerado() throws Exception {
        Account admin = register();
        String org = orgWithCourt(admin, "FUTBOL");
        String created = createTournament(admin.token(), org, "FUTBOL", "LEAGUE", 2, "");
        Number team = JsonPath.read(created, "$.teams[0].id");
        String v1 = JsonPath.read(created, "$.teams[0].logo");

        // Sin foto: escudo generado en SVG con la abreviatura
        String svg = mvc.perform(get("/api/public/teams/" + team + "/logo").param("v", v1))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(svg).startsWith("<svg").contains("</text>");

        // Estilo, colores y foto
        String png = "data:image/png;base64," + Base64.getEncoder().encodeToString(new byte[]{(byte) 0x89, 'P', 'N', 'G', 1, 2, 3});
        String updated = json(send(put("/api/orgs/" + org + "/teams/" + team), admin.token(),
                "{\"name\":\"Halcones\",\"shortName\":\"HAL\",\"color\":\"#112233\",\"color2\":\"#f5c542\",\"crestStyle\":3,\"logo\":\"" + png + "\"}"));
        assertThat((String) JsonPath.read(updated, "$.logo")).isNotEqualTo(v1);
        assertThat((Boolean) JsonPath.read(updated, "$.hasPhoto")).isTrue();
        assertThat((Integer) JsonPath.read(updated, "$.crestStyle")).isEqualTo(3);
        mvc.perform(get("/api/public/teams/" + team + "/logo").param("v", "x"))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentType()).isEqualTo("image/png"));

        // Solo imágenes PNG, JPG o WebP (nada de SVG subido ni texto cualquiera)
        send(put("/api/orgs/" + org + "/teams/" + team), admin.token(),
                "{\"name\":\"Halcones\",\"logo\":\"data:image/svg+xml;base64,PHN2Zz4=\"}").andExpect(status().isBadRequest());
        // "" quita la foto y vuelve el escudo generado
        String cleared = json(send(put("/api/orgs/" + org + "/teams/" + team), admin.token(), "{\"name\":\"Halcones\",\"logo\":\"\"}"));
        assertThat((Boolean) JsonPath.read(cleared, "$.hasPhoto")).isFalse();
    }

    @Test
    void validacionesYLimiteDeIntentos() throws Exception {
        send(post("/api/auth/register"), null, "{\"name\":\"\",\"email\":\"malo\",\"password\":\"123\"}").andExpect(status().isBadRequest());
        Account admin = register();
        String org = orgWithCourt(admin, "FUTBOL");
        send(post("/api/orgs/" + org + "/tournaments"), admin.token(),
                "{\"name\":\"X\",\"sport\":\"FUTBOL\",\"format\":\"GROUPS_KNOCKOUT\",\"groupsCount\":3,\"advancePerGroup\":1}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Elige 2, 4 u 8 grupos"));

        String body = "{\"email\":\"" + admin.email() + "\",\"password\":\"incorrecta\"}";
        for (int i = 0; i < 5; i++) {
            send(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.7.7.7"); return r; }), null, body).andExpect(status().isUnauthorized());
        }
        send(post("/api/auth/login").with(r -> { r.setRemoteAddr("10.7.7.7"); return r; }), null, body).andExpect(status().isTooManyRequests());
    }
}
