package com.homebase.api;

import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class DashboardController {
    private final UserProfileService userProfileService;
    private final UserProfileRepository userProfileRepository;
    private final PresenceStatusRepository presenceStatusRepository;
    private final PresenceStatusService presenceStatusService;
    private final ChoreRepository choreRepository;
    private final EventRepository eventRepository;
    private final ShoppingItemRepository shoppingItemRepository;
    private final NotificationRepository notificationRepository;
    private final ApartmentInfoRepository apartmentInfoRepository;
    private final DashboardService dashboardService;

    public DashboardController(
        UserProfileService userProfileService,
        UserProfileRepository userProfileRepository,
        PresenceStatusRepository presenceStatusRepository,
        PresenceStatusService presenceStatusService,
        ChoreRepository choreRepository,
        EventRepository eventRepository,
        ShoppingItemRepository shoppingItemRepository,
        NotificationRepository notificationRepository,
        ApartmentInfoRepository apartmentInfoRepository,
        DashboardService dashboardService
    ) {
        this.userProfileService = userProfileService;
        this.userProfileRepository = userProfileRepository;
        this.presenceStatusRepository = presenceStatusRepository;
        this.presenceStatusService = presenceStatusService;
        this.choreRepository = choreRepository;
        this.eventRepository = eventRepository;
        this.shoppingItemRepository = shoppingItemRepository;
        this.notificationRepository = notificationRepository;
        this.apartmentInfoRepository = apartmentInfoRepository;
        this.dashboardService = dashboardService;
    }

    @GetMapping("/users/me")
    public Map<String, Object> currentUser(@AuthenticationPrincipal Jwt jwt) {
        UserProfile user = userProfileService.getOrCreateFromJwt(jwt);
        PresenceStatus presence = presenceStatusRepository.findByUserProfileId(user.getId()).orElse(null);
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId().toString());
        response.put("keycloakUserId", user.getKeycloakUserId());
        response.put("displayName", user.getDisplayName());
        response.put("nickname", user.getNickname());
        response.put("status", presence != null ? presence.getStatus() : "AWAY");
        return response;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@AuthenticationPrincipal Jwt jwt) {
        UserProfile user = userProfileService.getOrCreateFromJwt(jwt);
        return dashboardService.getDashboard(user);
    }

    @GetMapping("/presence")
    public List<Map<String, Object>> listPresence() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (PresenceStatus status : presenceStatusRepository.findAll()) {
            Map<String, Object> row = new HashMap<>();
            row.put("userId", status.getUserProfile().getId().toString());
            row.put("name", status.getUserProfile().getDisplayName());
            row.put("status", status.getStatus());
            row.put("note", status.getNote());
            row.put("backAt", status.getBackAt() != null ? status.getBackAt().toString() : null);
            row.put("updatedAt", status.getUpdatedAt().toString());
            result.add(row);
        }
        return result;
    }

    @PutMapping("/presence/me")
    public Map<String, Object> updateMyPresence(
        @AuthenticationPrincipal Jwt jwt,
        @RequestBody Map<String, Object> request
    ) {
        UserProfile user = userProfileService.getOrCreateFromJwt(jwt);
        String status = request.getOrDefault("status", "AWAY").toString();
        String note = request.get("note") != null ? request.get("note").toString() : null;
        String backAt = request.get("backAt") != null ? request.get("backAt").toString() : null;
        OffsetDateTime parsedBackAt = parseOffsetDateTime(backAt, "backAt");
        PresenceStatus saved = presenceStatusService.updateStatus(user, status, note, parsedBackAt);
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getId().toString());
        response.put("status", saved.getStatus());
        response.put("note", saved.getNote());
        response.put("backAt", saved.getBackAt() != null ? saved.getBackAt().toString() : null);
        response.put("updatedAt", saved.getUpdatedAt().toString());
        return response;
    }

    @GetMapping("/chores")
    public List<Map<String, Object>> listChores(@AuthenticationPrincipal Jwt jwt) {
        userProfileService.getOrCreateFromJwt(jwt);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Chore chore : choreRepository.findAllByOrderByDueDateAscCreatedAtDesc()) {
            Map<String, Object> row = new HashMap<>();
            row.put("id", chore.getId().toString());
            row.put("title", chore.getTitle());
            row.put("description", chore.getDescription());
            row.put("assigneeId", chore.getAssignee() != null ? chore.getAssignee().getId().toString() : null);
            row.put("assigneeName", chore.getAssignee() != null ? chore.getAssignee().getDisplayName() : null);
            row.put("dueDate", chore.getDueDate() != null ? chore.getDueDate().toString() : null);
            row.put("completed", chore.isCompleted());
            row.put("createdAt", chore.getCreatedAt().toString());
            row.put("updatedAt", chore.getUpdatedAt().toString());
            result.add(row);
        }
        return result;
    }

    @PostMapping("/chores")
    public ResponseEntity<Map<String, Object>> createChore(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Map<String, Object> request) {
        UserProfile current = userProfileService.getOrCreateFromJwt(jwt);
        String title = request.get("title") == null ? "" : request.get("title").toString().trim();
        if (title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }
        String description = request.get("description") != null ? request.get("description").toString() : null;
        String assigneeId = request.get("assigneeId") != null ? request.get("assigneeId").toString() : null;
        LocalDate dueDate = request.get("dueDate") != null && !request.get("dueDate").toString().isBlank() ? LocalDate.parse(request.get("dueDate").toString()) : null;

        Chore chore = new Chore();
        chore.setTitle(title);
        chore.setDescription(description);
        chore.setDueDate(dueDate);
        if (assigneeId != null && !assigneeId.isBlank()) {
            chore.setAssignee(userProfileRepository.findById(UUID.fromString(assigneeId)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignee not found")));
        }
        Chore saved = choreRepository.save(chore);
        return ResponseEntity.created(URI.create("/api/chores/" + saved.getId())).body(Map.of("id", saved.getId().toString(), "title", saved.getTitle()));
    }

    @PutMapping("/chores/{id}")
    public Map<String, Object> updateChore(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody Map<String, Object> request) {
        UserProfile current = userProfileService.getOrCreateFromJwt(jwt);
        Chore chore = choreRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chore not found"));
        if (request.get("title") != null) chore.setTitle(request.get("title").toString());
        if (request.get("description") != null) chore.setDescription(request.get("description").toString());
        if (request.containsKey("completed")) chore.setCompleted(Boolean.parseBoolean(request.get("completed").toString()));
        if (request.get("dueDate") != null && !request.get("dueDate").toString().isBlank()) chore.setDueDate(LocalDate.parse(request.get("dueDate").toString()));
        if (request.get("assigneeId") != null) {
            String assigneeId = request.get("assigneeId").toString();
            if (assigneeId.isBlank()) chore.setAssignee(null); else chore.setAssignee(userProfileRepository.findById(UUID.fromString(assigneeId)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignee not found")));
        }
        Chore saved = choreRepository.save(chore);
        return Map.of("id", saved.getId().toString(), "title", saved.getTitle(), "completed", saved.isCompleted());
    }

    @DeleteMapping("/chores/{id}")
    public ResponseEntity<Void> deleteChore(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        userProfileService.getOrCreateFromJwt(jwt);
        Chore chore = choreRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chore not found"));
        choreRepository.delete(chore);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/events")
    public List<Map<String, Object>> listEvents(@AuthenticationPrincipal Jwt jwt) {
        userProfileService.getOrCreateFromJwt(jwt);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Event event : eventRepository.findAllByOrderByStartsAtAsc()) {
            Map<String, Object> row = new HashMap<>();
            row.put("id", event.getId().toString());
            row.put("title", event.getTitle());
            row.put("description", event.getDescription());
            row.put("date", event.getStartsAt().toLocalDate().toString());
            row.put("startTime", event.getStartsAt().toLocalTime().toString());
            row.put("endTime", event.getEndsAt() != null ? event.getEndsAt().toLocalTime().toString() : null);
            row.put("location", event.getLocation());
            row.put("creatorId", event.getCreator().getId().toString());
            row.put("creatorName", event.getCreator().getDisplayName());
            row.put("createdAt", event.getCreatedAt().toString());
            result.add(row);
        }
        return result;
    }

    @PostMapping("/events")
    public ResponseEntity<Map<String, Object>> createEvent(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        UserProfile current = userProfileService.getOrCreateFromJwt(jwt);
        String title = String.valueOf(request.getOrDefault("title", "")).trim();
        if (title.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        String startTime = request.get("startTime") == null ? null : request.get("startTime").toString();
        if (startTime == null || startTime.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startTime is required");
        Event event = new Event();
        event.setCreator(current);
        event.setTitle(title);
        event.setDescription(request.get("description") != null ? request.get("description").toString() : null);
        event.setLocation(request.get("location") != null ? request.get("location").toString() : null);
        event.setStartsAt(parseLocalDateTime(startTime, "startTime"));
        if (request.get("endTime") != null && !request.get("endTime").toString().isBlank()) event.setEndsAt(parseLocalDateTime(request.get("endTime").toString(), "endTime"));
        Event saved = eventRepository.save(event);
        return ResponseEntity.created(URI.create("/api/events/" + saved.getId())).body(Map.of("id", saved.getId().toString(), "title", saved.getTitle()));
    }

    @PutMapping("/events/{id}")
    public Map<String, Object> updateEvent(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody Map<String, Object> request) {
        UserProfile current = userProfileService.getOrCreateFromJwt(jwt);
        Event event = eventRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        if (!event.getCreator().getId().equals(current.getId())) throw new AccessDeniedException("You can only edit your own events");
        if (request.get("title") != null) event.setTitle(request.get("title").toString());
        if (request.get("description") != null) event.setDescription(request.get("description").toString());
        if (request.get("location") != null) event.setLocation(request.get("location").toString());
        if (request.get("startTime") != null && !request.get("startTime").toString().isBlank()) event.setStartsAt(parseLocalDateTime(request.get("startTime").toString(), "startTime"));
        if (request.containsKey("endTime")) event.setEndsAt(request.get("endTime") == null || request.get("endTime").toString().isBlank() ? null : parseLocalDateTime(request.get("endTime").toString(), "endTime"));
        Event saved = eventRepository.save(event);
        return Map.of("id", saved.getId().toString(), "title", saved.getTitle());
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<Void> deleteEvent(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UserProfile current = userProfileService.getOrCreateFromJwt(jwt);
        Event event = eventRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        if (!event.getCreator().getId().equals(current.getId())) throw new AccessDeniedException("You can only delete your own events");
        eventRepository.delete(event);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/shopping")
    public List<Map<String, Object>> listShopping(@AuthenticationPrincipal Jwt jwt) {
        userProfileService.getOrCreateFromJwt(jwt);
        List<Map<String, Object>> result = new ArrayList<>();
        for (ShoppingItem item : shoppingItemRepository.findAllByOrderByCreatedAtDesc()) {
            Map<String, Object> row = new HashMap<>();
            row.put("id", item.getId().toString());
            row.put("name", item.getName());
            row.put("quantity", item.getQuantity());
            row.put("category", item.getCategory());
            row.put("purchased", item.getPurchasedAt() != null);
            row.put("addedById", item.getAddedBy() != null ? item.getAddedBy().getId().toString() : null);
            row.put("addedByName", item.getAddedBy() != null ? item.getAddedBy().getDisplayName() : null);
            row.put("createdAt", item.getCreatedAt().toString());
            result.add(row);
        }
        return result;
    }

    @PostMapping("/shopping")
    public ResponseEntity<Map<String, Object>> createShoppingItem(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        UserProfile current = userProfileService.getOrCreateFromJwt(jwt);
        String name = request.get("name") == null ? "" : request.get("name").toString().trim();
        if (name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item name is required");
        ShoppingItem item = new ShoppingItem();
        item.setName(name);
        item.setQuantity(request.get("quantity") != null ? request.get("quantity").toString() : null);
        item.setCategory(request.get("category") != null ? request.get("category").toString() : "OTHER");
        item.setAddedBy(current);
        ShoppingItem saved = shoppingItemRepository.save(item);
        return ResponseEntity.created(URI.create("/api/shopping/" + saved.getId())).body(Map.of("id", saved.getId().toString(), "name", saved.getName()));
    }

    @PutMapping("/shopping/{id}")
    public Map<String, Object> updateShoppingItem(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody Map<String, Object> request) {
        userProfileService.getOrCreateFromJwt(jwt);
        ShoppingItem item = shoppingItemRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found"));
        if (request.get("name") != null) item.setName(request.get("name").toString());
        if (request.get("quantity") != null) item.setQuantity(request.get("quantity").toString());
        if (request.get("category") != null) item.setCategory(request.get("category").toString());
        if (request.containsKey("purchased")) {
            item.setPurchasedAt(Boolean.parseBoolean(request.get("purchased").toString()) ? OffsetDateTime.now() : null);
        }
        ShoppingItem saved = shoppingItemRepository.save(item);
        return Map.of("id", saved.getId().toString(), "purchased", saved.getPurchasedAt() != null);
    }

    @DeleteMapping("/shopping/{id}")
    public ResponseEntity<Void> deleteShoppingItem(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        userProfileService.getOrCreateFromJwt(jwt);
        ShoppingItem item = shoppingItemRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found"));
        shoppingItemRepository.delete(item);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/notifications")
    public List<Map<String, Object>> listNotifications(@AuthenticationPrincipal Jwt jwt) {
        UserProfile current = userProfileService.getOrCreateFromJwt(jwt);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Notification note : notificationRepository.findAllByUserIdOrderByCreatedAtDesc(current.getId())) {
            Map<String, Object> row = new HashMap<>();
            row.put("id", note.getId().toString());
            row.put("title", note.getTitle());
            row.put("message", note.getMessage());
            row.put("type", note.getType());
            row.put("read", note.getReadAt() != null);
            row.put("createdAt", note.getCreatedAt().toString());
            result.add(row);
        }
        return result;
    }

    @PutMapping("/notifications/{id}/read")
    public Map<String, Object> markNotificationRead(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        UserProfile current = userProfileService.getOrCreateFromJwt(jwt);
        Notification notification = notificationRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!notification.getUser().getId().equals(current.getId())) throw new AccessDeniedException("You can only read your own notifications");
        notification.setReadAt(OffsetDateTime.now());
        notificationRepository.save(notification);
        return Map.of("id", notification.getId().toString(), "read", true);
    }

    @PutMapping("/notifications/read-all")
    public Map<String, Object> markAllNotificationsRead(@AuthenticationPrincipal Jwt jwt) {
        UserProfile current = userProfileService.getOrCreateFromJwt(jwt);
        List<Notification> notifications = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(current.getId());
        notifications.stream().filter(note -> note.getReadAt() == null).forEach(note -> note.setReadAt(OffsetDateTime.now()));
        notificationRepository.saveAll(notifications);
        return Map.of("updated", notifications.size());
    }

    @GetMapping("/apartment")
    public Map<String, Object> apartment(@AuthenticationPrincipal Jwt jwt) {
        userProfileService.getOrCreateFromJwt(jwt);
        return apartmentInfoRepository.findFirstByOrderByCreatedAtAsc().map(info -> {
            Map<String, Object> row = new HashMap<>();
            row.put("id", info.getId().toString());
            row.put("name", info.getName());
            row.put("address", info.getAddress());
            row.put("wifiName", info.getWifiName());
            row.put("landlordContact", info.getLandlordContact());
            row.put("emergencyContact", info.getEmergencyContact());
            row.put("sharedNotes", info.getSharedNotes());
            return row;
        }).orElseGet(() -> {
            Map<String, Object> row = new HashMap<>();
            row.put("name", "Homebase");
            row.put("address", "");
            row.put("wifiName", "");
            row.put("landlordContact", "");
            row.put("emergencyContact", "");
            row.put("sharedNotes", "");
            return row;
        });
    }

    @PutMapping("/apartment")
    public Map<String, Object> updateApartment(@AuthenticationPrincipal Jwt jwt, @RequestBody Map<String, Object> request) {
        userProfileService.getOrCreateFromJwt(jwt);
        ApartmentInfo info = apartmentInfoRepository.findFirstByOrderByCreatedAtAsc().orElseGet(ApartmentInfo::new);
        if (request.containsKey("name")) {
            String name = request.get("name") == null ? "" : request.get("name").toString().trim();
            if (name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Apartment name is required");
            info.setName(name);
        } else if (info.getName() == null) {
            info.setName("Homebase");
        }
        info.setAddress(request.get("address") != null ? request.get("address").toString() : info.getAddress());
        info.setWifiName(request.get("wifiName") != null ? request.get("wifiName").toString() : info.getWifiName());
        info.setWifiPassword(request.get("wifiPassword") != null ? request.get("wifiPassword").toString() : info.getWifiPassword());
        info.setLandlordContact(request.get("landlordContact") != null ? request.get("landlordContact").toString() : info.getLandlordContact());
        info.setEmergencyContact(request.get("emergencyContact") != null ? request.get("emergencyContact").toString() : info.getEmergencyContact());
        info.setSharedNotes(request.get("sharedNotes") != null ? request.get("sharedNotes").toString() : info.getSharedNotes());
        ApartmentInfo saved = apartmentInfoRepository.save(info);
        return Map.of("id", saved.getId().toString(), "name", saved.getName());
    }

    private OffsetDateTime parseOffsetDateTime(String value, String field) {
        if (value == null || value.isBlank()) return null;
        try {
            return OffsetDateTime.parse(value);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be an ISO-8601 datetime", exception);
        }
    }

    private LocalDateTime parseLocalDateTime(String value, String field) {
        try {
            return LocalDateTime.parse(value);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be an ISO-8601 local datetime", exception);
        }
    }
}
