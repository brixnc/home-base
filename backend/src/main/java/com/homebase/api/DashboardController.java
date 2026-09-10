package com.homebase.api;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DashboardController {
    private final UserProfileService userProfileService;
    private final DashboardService dashboardService;
    private final HouseholdService householdService;

    public DashboardController(
        UserProfileService userProfileService,
        DashboardService dashboardService,
        HouseholdService householdService
    ) {
        this.userProfileService = userProfileService;
        this.dashboardService = dashboardService;
        this.householdService = householdService;
    }

    @GetMapping("/users/me")
    public Map<String, Object> currentUser(@AuthenticationPrincipal Jwt jwt) {
        UserProfile user = userProfileService.getOrCreateFromJwt(jwt);
        List<Map<String, Object>> presenceRows = householdService.listPresence(user);
        return presenceRows.stream()
            .filter(row -> user.getId().toString().equals(row.get("userId")))
            .findFirst()
            .map(row -> {
                row.put("id", user.getId().toString());
                row.put("keycloakUserId", user.getKeycloakUserId());
                row.put("displayName", user.getDisplayName());
                row.put("nickname", user.getNickname());
                return row;
            })
            .orElseGet(() -> Map.of(
                "id", user.getId().toString(),
                "keycloakUserId", user.getKeycloakUserId(),
                "displayName", user.getDisplayName(),
                "nickname", user.getNickname(),
                "status", "AWAY"
            ));
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@AuthenticationPrincipal Jwt jwt) {
        UserProfile user = userProfileService.getOrCreateFromJwt(jwt);
        return dashboardService.getDashboard(user);
    }

    @GetMapping("/presence")
    public List<Map<String, Object>> listPresence(@AuthenticationPrincipal Jwt jwt) {
        return householdService.listPresence(userProfileService.getOrCreateFromJwt(jwt));
    }

    @PutMapping("/presence/me")
    public Map<String, Object> updateMyPresence(
        @AuthenticationPrincipal Jwt jwt,
        @RequestBody Map<String, Object> request
    ) {
        return householdService.updateMyPresence(userProfileService.getOrCreateFromJwt(jwt), request);
    }

    @GetMapping("/chores")
    public List<Map<String, Object>> listChores(@AuthenticationPrincipal Jwt jwt) {
        userProfileService.getOrCreateFromJwt(jwt);
        return householdService.listChores();
    }

    @PostMapping("/chores")
    public ResponseEntity<Map<String, Object>> createChore(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(householdService.createChore(userProfileService.getOrCreateFromJwt(jwt), request));
    }

    @PutMapping("/chores/{id}")
    public Map<String, Object> updateChore(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody Map<String, Object> request) {
        return householdService.updateChore(userProfileService.getOrCreateFromJwt(jwt), id, request);
    }

    @DeleteMapping("/chores/{id}")
    public ResponseEntity<Void> deleteChore(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        userProfileService.getOrCreateFromJwt(jwt);
        householdService.deleteChore(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/events")
    public List<Map<String, Object>> listEvents(@AuthenticationPrincipal Jwt jwt) {
        userProfileService.getOrCreateFromJwt(jwt);
        return householdService.listEvents();
    }

    @PostMapping("/events")
    public ResponseEntity<Map<String, Object>> createEvent(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(householdService.createEvent(userProfileService.getOrCreateFromJwt(jwt), request));
    }

    @PutMapping("/events/{id}")
    public Map<String, Object> updateEvent(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody Map<String, Object> request) {
        return householdService.updateEvent(userProfileService.getOrCreateFromJwt(jwt), id, request);
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<Void> deleteEvent(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        householdService.deleteEvent(userProfileService.getOrCreateFromJwt(jwt), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/shopping")
    public List<Map<String, Object>> listShopping(@AuthenticationPrincipal Jwt jwt) {
        userProfileService.getOrCreateFromJwt(jwt);
        return householdService.listShopping();
    }

    @PostMapping("/shopping")
    public ResponseEntity<Map<String, Object>> createShoppingItem(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(householdService.createShoppingItem(userProfileService.getOrCreateFromJwt(jwt), request));
    }

    @PutMapping("/shopping/{id}")
    public Map<String, Object> updateShoppingItem(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody Map<String, Object> request) {
        userProfileService.getOrCreateFromJwt(jwt);
        return householdService.updateShoppingItem(id, request);
    }

    @DeleteMapping("/shopping/{id}")
    public ResponseEntity<Void> deleteShoppingItem(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        userProfileService.getOrCreateFromJwt(jwt);
        householdService.deleteShoppingItem(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/notifications")
    public List<Map<String, Object>> listNotifications(@AuthenticationPrincipal Jwt jwt) {
        return householdService.listNotifications(userProfileService.getOrCreateFromJwt(jwt));
    }

    @PutMapping("/notifications/{id}/read")
    public Map<String, Object> markNotificationRead(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return householdService.markNotificationRead(userProfileService.getOrCreateFromJwt(jwt), id);
    }

    @PutMapping("/notifications/read-all")
    public Map<String, Object> markAllNotificationsRead(@AuthenticationPrincipal Jwt jwt) {
        return householdService.markAllNotificationsRead(userProfileService.getOrCreateFromJwt(jwt));
    }

    @GetMapping("/apartment")
    public Map<String, Object> apartment(@AuthenticationPrincipal Jwt jwt) {
        userProfileService.getOrCreateFromJwt(jwt);
        return householdService.getApartment();
    }

    @GetMapping("/apartment/password")
    public Map<String, Object> apartmentPassword(@AuthenticationPrincipal Jwt jwt) {
        userProfileService.getOrCreateFromJwt(jwt);
        return householdService.revealApartmentPassword();
    }

    @PutMapping("/apartment")
    public Map<String, Object> updateApartment(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        userProfileService.getOrCreateFromJwt(jwt);
        return householdService.updateApartment(request);
    }

    @GetMapping("/absences")
    public List<Map<String, Object>> listAbsences(@AuthenticationPrincipal Jwt jwt) {
        return householdService.listAbsences(userProfileService.getOrCreateFromJwt(jwt));
    }

    @PostMapping("/absences")
    public ResponseEntity<Map<String, Object>> createAbsence(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(householdService.createAbsence(userProfileService.getOrCreateFromJwt(jwt), request));
    }

    @PutMapping("/absences/{id}")
    public Map<String, Object> updateAbsence(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody Map<String, Object> request) {
        return householdService.updateAbsence(userProfileService.getOrCreateFromJwt(jwt), id, request);
    }

    @DeleteMapping("/absences/{id}")
    public ResponseEntity<Void> deleteAbsence(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        householdService.deleteAbsence(userProfileService.getOrCreateFromJwt(jwt), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/feed-posts")
    public List<Map<String, Object>> listFeedPosts(@AuthenticationPrincipal Jwt jwt) {
        return householdService.listFeedPosts(userProfileService.getOrCreateFromJwt(jwt));
    }

    @PostMapping("/feed-posts")
    public ResponseEntity<Map<String, Object>> createFeedPost(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(householdService.createFeedPost(userProfileService.getOrCreateFromJwt(jwt), request));
    }

    @DeleteMapping("/feed-posts/{id}")
    public ResponseEntity<Void> deleteFeedPost(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        householdService.deleteFeedPost(userProfileService.getOrCreateFromJwt(jwt), id);
        return ResponseEntity.noContent().build();
    }
}
