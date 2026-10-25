package com.duangomez.torneos.web;

import com.duangomez.torneos.security.AuthPrincipal;
import com.duangomez.torneos.service.OrgService;
import com.duangomez.torneos.service.OrgViewService;
import com.duangomez.torneos.web.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** La organización: datos, miembros, panel de inicio, calendario y partidos. */
@RestController
@RequestMapping("/api/orgs")
public class OrgController {

    private final OrgService orgs;
    private final OrgViewService views;

    public OrgController(OrgService orgs, OrgViewService views) {
        this.orgs = orgs;
        this.views = views;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrgDto create(@Valid @RequestBody CreateOrgRequest req, @AuthenticationPrincipal AuthPrincipal me) {
        return orgs.create(req, me);
    }

    @GetMapping("/{org}")
    public OrgDto get(@PathVariable String org, @AuthenticationPrincipal AuthPrincipal me) {
        return orgs.get(org, me);
    }

    @PutMapping("/{org}")
    public OrgDto update(@PathVariable String org, @Valid @RequestBody UpdateOrgRequest req, @AuthenticationPrincipal AuthPrincipal me) {
        return orgs.update(org, req, me);
    }

    @GetMapping("/{org}/members")
    public List<MemberDto> members(@PathVariable String org, @AuthenticationPrincipal AuthPrincipal me) {
        return orgs.members(org, me);
    }

    @PostMapping("/{org}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberDto invite(@PathVariable String org, @Valid @RequestBody InviteRequest req, @AuthenticationPrincipal AuthPrincipal me) {
        return orgs.invite(org, req, me);
    }

    @PutMapping("/{org}/members/{id}")
    public MemberDto role(@PathVariable String org, @PathVariable Long id, @Valid @RequestBody RoleRequest req,
                          @AuthenticationPrincipal AuthPrincipal me) {
        return orgs.changeRole(org, id, req, me);
    }

    @DeleteMapping("/{org}/members/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable String org, @PathVariable Long id, @AuthenticationPrincipal AuthPrincipal me) {
        orgs.remove(org, id, me);
    }

    @GetMapping("/{org}/dashboard")
    public DashboardDto dashboard(@PathVariable String org, @AuthenticationPrincipal AuthPrincipal me) {
        return views.dashboard(org, me);
    }

    @GetMapping("/{org}/calendar")
    public CalendarDto calendar(@PathVariable String org,
                                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                @RequestParam(required = false) Long venueId,
                                @AuthenticationPrincipal AuthPrincipal me) {
        return views.calendar(org, date, venueId, me);
    }

    @GetMapping("/{org}/matches")
    public List<MatchCardDto> matches(@PathVariable String org,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                      @RequestParam(required = false) String status,
                                      @RequestParam(required = false) Long tournamentId,
                                      @RequestParam(defaultValue = "false") boolean mine,
                                      @AuthenticationPrincipal AuthPrincipal me) {
        return views.matches(org, from, to, status, tournamentId, mine, me);
    }
}
