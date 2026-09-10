package com.homebase.api;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
    private final UserProfileRepository userProfileRepository;
    private final PresenceStatusRepository presenceStatusRepository;
    private final ChoreRepository choreRepository;
    private final EventRepository eventRepository;
    private final ShoppingItemRepository shoppingItemRepository;
    private final NotificationRepository notificationRepository;
    private final ApartmentInfoRepository apartmentInfoRepository;
    private final AbsenceRepository absenceRepository;

    public DashboardService(
        UserProfileRepository userProfileRepository,
        PresenceStatusRepository presenceStatusRepository,
        ChoreRepository choreRepository,
        EventRepository eventRepository,
        ShoppingItemRepository shoppingItemRepository,
        NotificationRepository notificationRepository,
        ApartmentInfoRepository apartmentInfoRepository,
        AbsenceRepository absenceRepository
    ) {
        this.userProfileRepository = userProfileRepository;
        this.presenceStatusRepository = presenceStatusRepository;
        this.choreRepository = choreRepository;
        this.eventRepository = eventRepository;
        this.shoppingItemRepository = shoppingItemRepository;
        this.notificationRepository = notificationRepository;
        this.apartmentInfoRepository = apartmentInfoRepository;
        this.absenceRepository = absenceRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard(UserProfile currentUser) {
        List<Map<String, Object>> roommateList = new ArrayList<>();
        for (UserProfile profile : userProfileRepository.findAll()) {
            PresenceStatus status = presenceStatusRepository.findByUserProfileId(profile.getId()).orElse(null);
            Map<String, Object> row = new HashMap<>();
            row.put("id", profile.getId().toString());
            row.put("name", profile.getDisplayName());
            row.put("nickname", profile.getNickname());
            row.put("status", status != null && status.getStatus() != null ? status.getStatus() : "AWAY");
            row.put("detail", status != null && status.getNote() != null ? status.getNote() : "No update yet");
            row.put("note", status != null ? status.getNote() : null);
            row.put("backAt", status != null && status.getBackAt() != null ? status.getBackAt().toString() : null);
            row.put("email", profile.getFunFact());
            row.put("isCurrentUser", profile.getId().equals(currentUser.getId()));
            roommateList.add(row);
        }

        List<Map<String, Object>> chores = choreRepository.findAllByOrderByDueDateAscCreatedAtDesc().stream()
            .limit(5)
            .map(chore -> {
                Map<String, Object> row = new HashMap<>();
                row.put("id", chore.getId().toString());
                row.put("title", chore.getTitle());
                row.put("description", chore.getDescription());
                row.put("assignee", chore.getAssignee() != null ? chore.getAssignee().getDisplayName() : "Unassigned");
                row.put("assigneeId", chore.getAssignee() != null ? chore.getAssignee().getId().toString() : null);
                row.put("dueDate", chore.getDueDate() != null ? chore.getDueDate().toString() : null);
                row.put("priority", chore.getPriority());
                row.put("completed", chore.isCompleted());
                row.put("overdue", !chore.isCompleted() && chore.getDueDate() != null && chore.getDueDate().isBefore(LocalDate.now()));
                row.put("dueToday", !chore.isCompleted() && chore.getDueDate() != null && chore.getDueDate().isEqual(LocalDate.now()));
                row.put("createdAt", chore.getCreatedAt().toString());
                return row;
            })
            .collect(Collectors.toList());

        List<Map<String, Object>> events = eventRepository.findAllByOrderByStartsAtAsc().stream()
            .limit(4)
            .map(event -> {
                Map<String, Object> row = new HashMap<>();
                row.put("id", event.getId().toString());
                row.put("title", event.getTitle());
                row.put("description", event.getDescription());
                row.put("date", event.getStartsAt().toLocalDate().toString());
                row.put("startTime", event.getStartsAt().toString());
                row.put("endTime", event.getEndsAt() != null ? event.getEndsAt().toString() : null);
                row.put("location", event.getLocation());
                row.put("creatorId", event.getCreator() != null ? event.getCreator().getId().toString() : null);
                row.put("creatorName", event.getCreator() != null ? event.getCreator().getDisplayName() : "Unknown");
                row.put("assigneeId", event.getAssignee() != null ? event.getAssignee().getId().toString() : null);
                row.put("assigneeName", event.getAssignee() != null ? event.getAssignee().getDisplayName() : null);
                row.put("past", event.getStartsAt().isBefore(LocalDateTime.now()));
                return row;
            })
            .collect(Collectors.toList());

        List<Map<String, Object>> shopping = shoppingItemRepository.findAllByOrderByCreatedAtDesc().stream()
            .limit(10)
            .map(item -> {
                Map<String, Object> row = new HashMap<>();
                row.put("id", item.getId().toString());
                row.put("name", item.getName());
                row.put("quantity", item.getQuantity());
                row.put("category", item.getCategory());
                row.put("purchased", item.getPurchasedAt() != null);
                row.put("createdAt", item.getCreatedAt().toString());
                row.put("addedBy", item.getAddedBy() != null ? item.getAddedBy().getDisplayName() : "Unknown");
                row.put("assigneeId", item.getAssignee() != null ? item.getAssignee().getId().toString() : null);
                row.put("assigneeName", item.getAssignee() != null ? item.getAssignee().getDisplayName() : null);
                return row;
            })
            .collect(Collectors.toList());

        List<Map<String, Object>> notifications = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
            .limit(5)
            .map(note -> {
                Map<String, Object> row = new HashMap<>();
                row.put("id", note.getId().toString());
                row.put("title", note.getTitle());
                row.put("message", note.getMessage());
                row.put("read", note.getReadAt() != null);
                row.put("type", note.getType());
                row.put("createdAt", note.getCreatedAt().toString());
                return row;
            })
            .collect(Collectors.toList());

        long unreadCount = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
            .filter(note -> note.getReadAt() == null)
            .count();

        String status = presenceStatusRepository.findByUserProfileId(currentUser.getId())
            .map(PresenceStatus::getStatus)
            .orElse("AWAY");
        LocalDate today = LocalDate.now();
        boolean hasOpenChores = choreRepository.findAllByOrderByDueDateAscCreatedAtDesc().stream().anyMatch(chore -> !chore.isCompleted());

        List<Map<String, Object>> absences = absenceRepository
            .findByEndsOnGreaterThanEqualOrderByStartsOnAscCreatedAtAsc(today)
            .stream()
            .limit(5)
            .map(absence -> {
                Map<String, Object> row = new HashMap<>();
                row.put("id", absence.getId().toString());
                row.put("userId", absence.getUserProfile().getId().toString());
                row.put("userName", absence.getUserProfile().getDisplayName());
                row.put("startsOn", absence.getStartsOn().toString());
                row.put("endsOn", absence.getEndsOn().toString());
                row.put("note", absence.getNote());
                row.put("active", !absence.getStartsOn().isAfter(today) && !absence.getEndsOn().isBefore(today));
                return row;
            })
            .collect(Collectors.toList());

        Map<String, Object> apartment = new HashMap<>();
        apartmentInfoRepository.findFirstByOrderByCreatedAtAsc().ifPresent(info -> {
            apartment.put("id", info.getId().toString());
            apartment.put("name", info.getName());
            apartment.put("address", info.getAddress());
            apartment.put("wifiName", info.getWifiName());
            apartment.put("hasWifiPassword", info.getWifiPassword() != null && !info.getWifiPassword().isBlank());
            apartment.put("landlordContact", info.getLandlordContact());
            apartment.put("emergencyContact", info.getEmergencyContact());
            apartment.put("sharedNotes", info.getSharedNotes());
        });

        Map<String, Object> response = new HashMap<>();
        response.put("roommates", roommateList);
        response.put("events", events);
        response.put("chores", chores);
        response.put("shopping", shopping);
        response.put("notifications", notifications);
        response.put("unreadNotifications", unreadCount);
        response.put("myStatus", status);
        response.put("today", today.toString());
        response.put("hasOpenChores", hasOpenChores);
        response.put("overdueChoreCount", choreRepository.findAllByOrderByDueDateAscCreatedAtDesc().stream()
            .filter(chore -> !chore.isCompleted() && chore.getDueDate() != null && chore.getDueDate().isBefore(today))
            .count());
        response.put("todayChoreCount", choreRepository.findAllByOrderByDueDateAscCreatedAtDesc().stream()
            .filter(chore -> !chore.isCompleted() && chore.getDueDate() != null && chore.getDueDate().isEqual(today))
            .count());
        response.put("outstandingShoppingCount", shoppingItemRepository.findAllByOrderByCreatedAtDesc().stream()
            .filter(item -> item.getPurchasedAt() == null)
            .count());
        response.put("purchasedShoppingCount", shoppingItemRepository.findAllByOrderByCreatedAtDesc().stream()
            .filter(item -> item.getPurchasedAt() != null)
            .count());
        response.put("absences", absences);
        response.put("apartment", apartment);
        response.put("generatedAt", OffsetDateTime.now().toString());
        return response;
    }
}
