package com.homebase.api;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class HouseholdService {
    private static final Set<String> VALID_PRIORITIES = Set.of("LOW", "NORMAL", "HIGH");
    private static final Set<String> VALID_SHOPPING_CATEGORIES =
        Set.of("FOOD", "CLEANING", "BATHROOM", "HOUSEHOLD", "OTHER");

    private final UserProfileRepository userProfileRepository;
    private final ChoreRepository choreRepository;
    private final EventRepository eventRepository;
    private final ShoppingItemRepository shoppingItemRepository;
    private final NotificationRepository notificationRepository;
    private final ApartmentInfoRepository apartmentInfoRepository;
    private final PresenceStatusRepository presenceStatusRepository;
    private final PresenceStatusService presenceStatusService;
    private final AbsenceRepository absenceRepository;
    private final FeedPostRepository feedPostRepository;
    private final NotificationService notificationService;

    public HouseholdService(
        UserProfileRepository userProfileRepository,
        ChoreRepository choreRepository,
        EventRepository eventRepository,
        ShoppingItemRepository shoppingItemRepository,
        NotificationRepository notificationRepository,
        ApartmentInfoRepository apartmentInfoRepository,
        PresenceStatusRepository presenceStatusRepository,
        PresenceStatusService presenceStatusService,
        AbsenceRepository absenceRepository,
        FeedPostRepository feedPostRepository,
        NotificationService notificationService
    ) {
        this.userProfileRepository = userProfileRepository;
        this.choreRepository = choreRepository;
        this.eventRepository = eventRepository;
        this.shoppingItemRepository = shoppingItemRepository;
        this.notificationRepository = notificationRepository;
        this.apartmentInfoRepository = apartmentInfoRepository;
        this.presenceStatusRepository = presenceStatusRepository;
        this.presenceStatusService = presenceStatusService;
        this.absenceRepository = absenceRepository;
        this.feedPostRepository = feedPostRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPresence(UserProfile currentUser) {
        return userProfileRepository.findAll()
            .stream()
            .map(profile -> toPresenceMap(profile, currentUser))
            .toList();
    }

    @Transactional
    public Map<String, Object> updateMyPresence(UserProfile currentUser, Map<String, Object> request) {
        String status = request.getOrDefault("status", "AWAY").toString();
        String note = normalizeOptionalText(request.get("note"), 280);
        OffsetDateTime backAt = parseOffsetDateTime(request.get("backAt"), "backAt");
        PresenceStatus saved = presenceStatusService.updateStatus(currentUser, status, note, backAt);
        return toPresenceMap(currentUser, saved, true);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listChores() {
        return choreRepository.findAllByOrderByDueDateAscCreatedAtDesc()
            .stream()
            .map(this::toChoreMap)
            .toList();
    }

    @Transactional
    public Map<String, Object> createChore(UserProfile currentUser, Map<String, Object> request) {
        String title = requiredTrimmed(request.get("title"), "Title is required");
        Chore chore = new Chore();
        chore.setTitle(title);
        chore.setDescription(normalizeOptionalText(request.get("description"), 500));
        chore.setDueDate(parseLocalDate(request.get("dueDate"), "dueDate"));
        chore.setPriority(normalizePriority(request.get("priority")));
        chore.setAssignee(resolveAssignee(request.get("assigneeId")));
        Chore saved = choreRepository.save(chore);
        if (saved.getAssignee() != null) {
            notificationService.notifyAssignee(
                currentUser,
                saved.getAssignee(),
                "New assigned chore",
                currentUser.getDisplayName() + " assigned you \"" + saved.getTitle() + "\"."
            );
        }
        return toChoreMap(saved);
    }

    @Transactional
    public Map<String, Object> updateChore(UserProfile currentUser, UUID id, Map<String, Object> request) {
        Chore chore = choreRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chore not found"));
        UUID previousAssigneeId = chore.getAssignee() != null ? chore.getAssignee().getId() : null;

        if (request.containsKey("title")) {
            chore.setTitle(requiredTrimmed(request.get("title"), "Title is required"));
        }
        if (request.containsKey("description")) {
            chore.setDescription(normalizeOptionalText(request.get("description"), 500));
        }
        if (request.containsKey("completed")) {
            chore.setCompleted(Boolean.parseBoolean(String.valueOf(request.get("completed"))));
        }
        if (request.containsKey("dueDate")) {
            chore.setDueDate(parseLocalDate(request.get("dueDate"), "dueDate"));
        }
        if (request.containsKey("priority")) {
            chore.setPriority(normalizePriority(request.get("priority")));
        }
        if (request.containsKey("assigneeId")) {
            chore.setAssignee(resolveAssignee(request.get("assigneeId")));
        }

        Chore saved = choreRepository.save(chore);
        UUID newAssigneeId = saved.getAssignee() != null ? saved.getAssignee().getId() : null;
        if (newAssigneeId != null && !newAssigneeId.equals(previousAssigneeId)) {
            notificationService.notifyAssignee(
                currentUser,
                saved.getAssignee(),
                "Chore reassigned",
                currentUser.getDisplayName() + " assigned you \"" + saved.getTitle() + "\"."
            );
        }
        return toChoreMap(saved);
    }

    @Transactional
    public void deleteChore(UUID id) {
        Chore chore = choreRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chore not found"));
        choreRepository.delete(chore);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listEvents() {
        return eventRepository.findAllByOrderByStartsAtAsc()
            .stream()
            .map(this::toEventMap)
            .toList();
    }

    @Transactional
    public Map<String, Object> createEvent(UserProfile currentUser, Map<String, Object> request) {
        Event event = new Event();
        event.setCreator(currentUser);
        applyEventChanges(event, request, true);
        Event saved = eventRepository.save(event);
        if (saved.getAssignee() != null) {
            notificationService.notifyAssignee(
                currentUser,
                saved.getAssignee(),
                "New assigned event",
                currentUser.getDisplayName() + " made you responsible for \"" + saved.getTitle() + "\"."
            );
        }
        notificationService.notifyOtherRoommates(
            currentUser,
            "New apartment event",
            currentUser.getDisplayName() + " added \"" + saved.getTitle() + "\" to the calendar.",
            "EVENT"
        );
        return toEventMap(saved);
    }

    @Transactional
    public Map<String, Object> updateEvent(UserProfile currentUser, UUID id, Map<String, Object> request) {
        Event event = eventRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        if (!event.getCreator().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You can only edit your own events");
        }
        UUID previousAssigneeId = event.getAssignee() != null ? event.getAssignee().getId() : null;
        applyEventChanges(event, request, false);
        Event saved = eventRepository.save(event);
        UUID newAssigneeId = saved.getAssignee() != null ? saved.getAssignee().getId() : null;
        if (newAssigneeId != null && !newAssigneeId.equals(previousAssigneeId)) {
            notificationService.notifyAssignee(
                currentUser,
                saved.getAssignee(),
                "Event reassigned",
                currentUser.getDisplayName() + " made you responsible for \"" + saved.getTitle() + "\"."
            );
        }
        return toEventMap(saved);
    }

    @Transactional
    public void deleteEvent(UserProfile currentUser, UUID id) {
        Event event = eventRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        if (!event.getCreator().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You can only delete your own events");
        }
        eventRepository.delete(event);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listShopping() {
        return shoppingItemRepository.findAllByOrderByCreatedAtDesc()
            .stream()
            .map(this::toShoppingMap)
            .toList();
    }

    @Transactional
    public Map<String, Object> createShoppingItem(UserProfile currentUser, Map<String, Object> request) {
        ShoppingItem item = new ShoppingItem();
        item.setAddedBy(currentUser);
        applyShoppingItemChanges(item, request, true);
        return toShoppingMap(shoppingItemRepository.save(item));
    }

    @Transactional
    public Map<String, Object> updateShoppingItem(UUID id, Map<String, Object> request) {
        ShoppingItem item = shoppingItemRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found"));
        applyShoppingItemChanges(item, request, false);
        return toShoppingMap(shoppingItemRepository.save(item));
    }

    @Transactional
    public void deleteShoppingItem(UUID id) {
        ShoppingItem item = shoppingItemRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found"));
        shoppingItemRepository.delete(item);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listNotifications(UserProfile currentUser) {
        return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(currentUser.getId())
            .stream()
            .map(this::toNotificationMap)
            .toList();
    }

    @Transactional
    public Map<String, Object> markNotificationRead(UserProfile currentUser, UUID id) {
        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!notification.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You can only read your own notifications");
        }
        notification.setReadAt(OffsetDateTime.now());
        return toNotificationMap(notificationRepository.save(notification));
    }

    @Transactional
    public Map<String, Object> markAllNotificationsRead(UserProfile currentUser) {
        List<Notification> notifications = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(currentUser.getId());
        for (Notification notification : notifications) {
            if (notification.getReadAt() == null) {
                notification.setReadAt(OffsetDateTime.now());
            }
        }
        notificationRepository.saveAll(notifications);
        return Map.of("updated", notifications.size());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getApartment() {
        ApartmentInfo info = apartmentInfoRepository.findFirstByOrderByCreatedAtAsc().orElse(null);
        return toApartmentMap(info, false);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> revealApartmentPassword() {
        ApartmentInfo info = apartmentInfoRepository.findFirstByOrderByCreatedAtAsc().orElse(null);
        Map<String, Object> response = new HashMap<>();
        response.put("wifiPassword", info != null ? info.getWifiPassword() : null);
        response.put("hasWifiPassword", info != null && info.getWifiPassword() != null && !info.getWifiPassword().isBlank());
        return response;
    }

    @Transactional
    public Map<String, Object> updateApartment(Map<String, Object> request) {
        ApartmentInfo info = apartmentInfoRepository.findFirstByOrderByCreatedAtAsc().orElseGet(ApartmentInfo::new);
        if (request.containsKey("name")) {
            info.setName(requiredTrimmed(request.get("name"), "Apartment name is required"));
        } else if (info.getName() == null || info.getName().isBlank()) {
            info.setName("Homebase");
        }
        if (request.containsKey("address")) {
            info.setAddress(normalizeOptionalText(request.get("address"), 240));
        }
        if (request.containsKey("wifiName")) {
            info.setWifiName(normalizeOptionalText(request.get("wifiName"), 120));
        }
        // Wi-Fi password rules (see ApartmentInfo handling in the settings UI):
        //   key absent      -> leave the stored password untouched
        //   value null      -> leave the stored password untouched
        //   value ""        -> explicit removal
        //   value "secret"  -> explicit replacement
        // Only a deliberate user action can therefore clear the password.
        if (request.containsKey("wifiPassword") && request.get("wifiPassword") != null) {
            info.setWifiPassword(normalizeOptionalText(request.get("wifiPassword"), 120));
        }
        if (request.containsKey("landlordContact")) {
            info.setLandlordContact(normalizeOptionalText(request.get("landlordContact"), 240));
        }
        if (request.containsKey("emergencyContact")) {
            info.setEmergencyContact(normalizeOptionalText(request.get("emergencyContact"), 240));
        }
        if (request.containsKey("sharedNotes")) {
            info.setSharedNotes(normalizeOptionalText(request.get("sharedNotes"), 2000));
        }
        return toApartmentMap(apartmentInfoRepository.save(info), false);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAbsences(UserProfile currentUser) {
        LocalDate today = LocalDate.now();
        return absenceRepository.findByEndsOnGreaterThanEqualOrderByStartsOnAscCreatedAtAsc(today)
            .stream()
            .map(absence -> toAbsenceMap(absence, currentUser))
            .toList();
    }

    @Transactional
    public Map<String, Object> createAbsence(UserProfile currentUser, Map<String, Object> request) {
        Absence absence = new Absence();
        absence.setUserProfile(currentUser);
        applyAbsenceChanges(absence, request, true);
        return toAbsenceMap(absenceRepository.save(absence), currentUser);
    }

    @Transactional
    public Map<String, Object> updateAbsence(UserProfile currentUser, UUID id, Map<String, Object> request) {
        Absence absence = absenceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Absence not found"));
        if (!absence.getUserProfile().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You can only edit your own absences");
        }
        applyAbsenceChanges(absence, request, false);
        return toAbsenceMap(absenceRepository.save(absence), currentUser);
    }

    @Transactional
    public void deleteAbsence(UserProfile currentUser, UUID id) {
        Absence absence = absenceRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Absence not found"));
        if (!absence.getUserProfile().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You can only delete your own absences");
        }
        absenceRepository.delete(absence);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listFeedPosts(UserProfile currentUser) {
        return feedPostRepository.findAllByOrderByCreatedAtDesc()
            .stream()
            .map(post -> toFeedPostMap(post, currentUser))
            .toList();
    }

    @Transactional
    public Map<String, Object> createFeedPost(UserProfile currentUser, Map<String, Object> request) {
        String body = requiredTrimmed(request.get("body"), "Post text is required");
        if (body.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Post text must be 500 characters or fewer");
        }
        FeedPost post = new FeedPost();
        post.setAuthor(currentUser);
        post.setBody(body);
        FeedPost saved = feedPostRepository.save(post);
        notificationService.notifyOtherRoommates(
            currentUser,
            "New household post",
            currentUser.getDisplayName() + " shared a household update.",
            "FEED"
        );
        return toFeedPostMap(saved, currentUser);
    }

    @Transactional
    public void deleteFeedPost(UserProfile currentUser, UUID id) {
        FeedPost post = feedPostRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
        if (!post.getAuthor().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You can only delete your own posts");
        }
        feedPostRepository.delete(post);
    }

    private void applyEventChanges(Event event, Map<String, Object> request, boolean creating) {
        if (creating || request.containsKey("title")) {
            event.setTitle(requiredTrimmed(request.get("title"), "Title is required"));
        }
        if (request.containsKey("description") || creating) {
            event.setDescription(normalizeOptionalText(request.get("description"), 1000));
        }
        if (request.containsKey("location") || creating) {
            event.setLocation(normalizeOptionalText(request.get("location"), 160));
        }
        if (request.containsKey("assigneeId")) {
            event.setAssignee(resolveAssignee(request.get("assigneeId")));
        }
        if (creating || request.containsKey("startTime")) {
            event.setStartsAt(parseLocalDateTime(request.get("startTime"), "startTime"));
        }
        if (request.containsKey("endTime") || creating) {
            event.setEndsAt(parseLocalDateTimeOrNull(request.get("endTime"), "endTime"));
        }
        if (event.getEndsAt() != null && event.getEndsAt().isBefore(event.getStartsAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endTime must be after startTime");
        }
    }

    private void applyShoppingItemChanges(ShoppingItem item, Map<String, Object> request, boolean creating) {
        if (creating || request.containsKey("name")) {
            item.setName(requiredTrimmed(request.get("name"), "Item name is required"));
        }
        if (creating || request.containsKey("quantity")) {
            item.setQuantity(normalizeOptionalText(request.get("quantity"), 50));
        }
        if (creating || request.containsKey("category")) {
            item.setCategory(normalizeCategory(request.get("category")));
        }
        if (request.containsKey("assigneeId")) {
            item.setAssignee(resolveAssignee(request.get("assigneeId")));
        }
        if (request.containsKey("purchased")) {
            boolean purchased = Boolean.parseBoolean(String.valueOf(request.get("purchased")));
            item.setPurchasedAt(purchased ? OffsetDateTime.now() : null);
        }
    }

    private void applyAbsenceChanges(Absence absence, Map<String, Object> request, boolean creating) {
        LocalDate startsOn = creating || request.containsKey("startsOn")
            ? parseRequiredLocalDate(request.get("startsOn"), "startsOn")
            : absence.getStartsOn();
        LocalDate endsOn = creating || request.containsKey("endsOn")
            ? parseRequiredLocalDate(request.get("endsOn"), "endsOn")
            : absence.getEndsOn();
        if (endsOn.isBefore(startsOn)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endsOn must be on or after startsOn");
        }
        absence.setStartsOn(startsOn);
        absence.setEndsOn(endsOn);
        if (creating || request.containsKey("note")) {
            absence.setNote(normalizeOptionalText(request.get("note"), 280));
        }
    }

    private Map<String, Object> toPresenceMap(UserProfile profile, UserProfile currentUser) {
        PresenceStatus presence = presenceStatusRepository.findByUserProfileId(profile.getId()).orElse(null);
        return toPresenceMap(profile, presence, currentUser != null && profile.getId().equals(currentUser.getId()));
    }

    private Map<String, Object> toPresenceMap(UserProfile profile, PresenceStatus presence, boolean isCurrentUser) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("userId", profile.getId().toString());
        row.put("name", profile.getDisplayName());
        row.put("status", presence != null && presence.getStatus() != null ? presence.getStatus() : "AWAY");
        row.put("note", presence != null ? presence.getNote() : null);
        row.put("backAt", presence != null && presence.getBackAt() != null ? presence.getBackAt().toString() : null);
        row.put("updatedAt", presence != null && presence.getUpdatedAt() != null ? presence.getUpdatedAt().toString() : null);
        row.put("isCurrentUser", isCurrentUser);
        return row;
    }

    private Map<String, Object> toChoreMap(Chore chore) {
        LocalDate today = LocalDate.now();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", chore.getId().toString());
        row.put("title", chore.getTitle());
        row.put("description", chore.getDescription());
        row.put("assigneeId", chore.getAssignee() != null ? chore.getAssignee().getId().toString() : null);
        row.put("assigneeName", chore.getAssignee() != null ? chore.getAssignee().getDisplayName() : null);
        row.put("dueDate", chore.getDueDate() != null ? chore.getDueDate().toString() : null);
        row.put("priority", chore.getPriority());
        row.put("completed", chore.isCompleted());
        row.put("createdAt", chore.getCreatedAt() != null ? chore.getCreatedAt().toString() : null);
        row.put("updatedAt", chore.getUpdatedAt() != null ? chore.getUpdatedAt().toString() : null);
        row.put("overdue", !chore.isCompleted() && chore.getDueDate() != null && chore.getDueDate().isBefore(today));
        row.put("dueToday", !chore.isCompleted() && chore.getDueDate() != null && chore.getDueDate().isEqual(today));
        return row;
    }

    private Map<String, Object> toEventMap(Event event) {
        LocalDateTime startsAt = event.getStartsAt();
        LocalDateTime endsAt = event.getEndsAt();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", event.getId().toString());
        row.put("title", event.getTitle());
        row.put("description", event.getDescription());
        row.put("date", startsAt != null ? startsAt.toLocalDate().toString() : null);
        row.put("startTime", startsAt != null ? startsAt.toString() : null);
        row.put("endTime", endsAt != null ? endsAt.toString() : null);
        row.put("location", event.getLocation());
        row.put("creatorId", event.getCreator() != null ? event.getCreator().getId().toString() : null);
        row.put("creatorName", event.getCreator() != null ? event.getCreator().getDisplayName() : null);
        row.put("assigneeId", event.getAssignee() != null ? event.getAssignee().getId().toString() : null);
        row.put("assigneeName", event.getAssignee() != null ? event.getAssignee().getDisplayName() : null);
        row.put("createdAt", event.getCreatedAt() != null ? event.getCreatedAt().toString() : null);
        row.put("updatedAt", event.getUpdatedAt() != null ? event.getUpdatedAt().toString() : null);
        row.put("past", startsAt != null && startsAt.isBefore(LocalDateTime.now()));
        return row;
    }

    private Map<String, Object> toShoppingMap(ShoppingItem item) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", item.getId().toString());
        row.put("name", item.getName());
        row.put("quantity", item.getQuantity());
        row.put("category", item.getCategory());
        row.put("purchased", item.getPurchasedAt() != null);
        row.put("addedById", item.getAddedBy() != null ? item.getAddedBy().getId().toString() : null);
        row.put("addedByName", item.getAddedBy() != null ? item.getAddedBy().getDisplayName() : null);
        row.put("assigneeId", item.getAssignee() != null ? item.getAssignee().getId().toString() : null);
        row.put("assigneeName", item.getAssignee() != null ? item.getAssignee().getDisplayName() : null);
        row.put("createdAt", item.getCreatedAt() != null ? item.getCreatedAt().toString() : null);
        return row;
    }

    private Map<String, Object> toNotificationMap(Notification notification) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", notification.getId().toString());
        row.put("title", notification.getTitle());
        row.put("message", notification.getMessage());
        row.put("type", notification.getType());
        row.put("read", notification.getReadAt() != null);
        row.put("createdAt", notification.getCreatedAt() != null ? notification.getCreatedAt().toString() : null);
        return row;
    }

    private Map<String, Object> toApartmentMap(ApartmentInfo info, boolean includePassword) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", info != null && info.getId() != null ? info.getId().toString() : null);
        row.put("name", info != null && info.getName() != null ? info.getName() : "Homebase");
        row.put("address", info != null ? info.getAddress() : null);
        row.put("wifiName", info != null ? info.getWifiName() : null);
        row.put("hasWifiPassword", info != null && info.getWifiPassword() != null && !info.getWifiPassword().isBlank());
        if (includePassword) {
            row.put("wifiPassword", info != null ? info.getWifiPassword() : null);
        }
        row.put("landlordContact", info != null ? info.getLandlordContact() : null);
        row.put("emergencyContact", info != null ? info.getEmergencyContact() : null);
        row.put("sharedNotes", info != null ? info.getSharedNotes() : null);
        return row;
    }

    private Map<String, Object> toAbsenceMap(Absence absence, UserProfile currentUser) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", absence.getId().toString());
        row.put("userId", absence.getUserProfile().getId().toString());
        row.put("userName", absence.getUserProfile().getDisplayName());
        row.put("startsOn", absence.getStartsOn().toString());
        row.put("endsOn", absence.getEndsOn().toString());
        row.put("note", absence.getNote());
        row.put("createdAt", absence.getCreatedAt() != null ? absence.getCreatedAt().toString() : null);
        row.put("canEdit", currentUser != null && absence.getUserProfile().getId().equals(currentUser.getId()));
        return row;
    }

    private Map<String, Object> toFeedPostMap(FeedPost post, UserProfile currentUser) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", post.getId().toString());
        row.put("authorId", post.getAuthor().getId().toString());
        row.put("authorName", post.getAuthor().getDisplayName());
        row.put("body", post.getBody());
        row.put("createdAt", post.getCreatedAt() != null ? post.getCreatedAt().toString() : null);
        row.put("canDelete", currentUser != null && post.getAuthor().getId().equals(currentUser.getId()));
        return row;
    }

    private UserProfile resolveAssignee(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        UUID userId;
        try {
            userId = UUID.fromString(value.toString());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assignee ID is invalid", exception);
        }
        return userProfileRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignee not found"));
    }

    private String normalizePriority(Object value) {
        if (value == null || value.toString().isBlank()) {
            return "NORMAL";
        }
        String priority = value.toString().trim().toUpperCase();
        if (!VALID_PRIORITIES.contains(priority)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Priority is invalid");
        }
        return priority;
    }

    private String normalizeCategory(Object value) {
        if (value == null || value.toString().isBlank()) {
            return "OTHER";
        }
        String category = value.toString().trim().toUpperCase();
        if (!VALID_SHOPPING_CATEGORIES.contains(category)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category is invalid");
        }
        return category;
    }

    private String normalizeOptionalText(Object value, int maxLength) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        if (text.isBlank()) {
            return null;
        }
        if (text.length() > maxLength) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Text is too long");
        }
        return text;
    }

    private String requiredTrimmed(Object value, String message) {
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        String text = value.toString().trim();
        if (text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return text;
    }

    private LocalDate parseLocalDate(Object value, String field) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.toString());
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be an ISO-8601 date", exception);
        }
    }

    private LocalDate parseRequiredLocalDate(Object value, String field) {
        LocalDate parsed = parseLocalDate(value, field);
        if (parsed == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
        }
        return parsed;
    }

    private LocalDateTime parseLocalDateTime(Object value, String field) {
        if (value == null || value.toString().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is required");
        }
        try {
            return LocalDateTime.parse(value.toString());
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be an ISO-8601 local datetime", exception);
        }
    }

    private LocalDateTime parseLocalDateTimeOrNull(Object value, String field) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value.toString());
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be an ISO-8601 local datetime", exception);
        }
    }

    private OffsetDateTime parseOffsetDateTime(Object value, String field) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value.toString());
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " must be an ISO-8601 datetime", exception);
        }
    }
}
