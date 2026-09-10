package com.homebase.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

class HouseholdServiceTest {
    private UserProfileRepository userProfileRepository;
    private ChoreRepository choreRepository;
    private EventRepository eventRepository;
    private ShoppingItemRepository shoppingItemRepository;
    private NotificationRepository notificationRepository;
    private ApartmentInfoRepository apartmentInfoRepository;
    private PresenceStatusRepository presenceStatusRepository;
    private PresenceStatusService presenceStatusService;
    private AbsenceRepository absenceRepository;
    private FeedPostRepository feedPostRepository;
    private NotificationService notificationService;
    private HouseholdService service;

    @BeforeEach
    void setUp() {
        userProfileRepository = mock(UserProfileRepository.class);
        choreRepository = mock(ChoreRepository.class);
        eventRepository = mock(EventRepository.class);
        shoppingItemRepository = mock(ShoppingItemRepository.class);
        notificationRepository = mock(NotificationRepository.class);
        apartmentInfoRepository = mock(ApartmentInfoRepository.class);
        presenceStatusRepository = mock(PresenceStatusRepository.class);
        presenceStatusService = mock(PresenceStatusService.class);
        absenceRepository = mock(AbsenceRepository.class);
        feedPostRepository = mock(FeedPostRepository.class);
        notificationService = mock(NotificationService.class);
        service = new HouseholdService(
            userProfileRepository,
            choreRepository,
            eventRepository,
            shoppingItemRepository,
            notificationRepository,
            apartmentInfoRepository,
            presenceStatusRepository,
            presenceStatusService,
            absenceRepository,
            feedPostRepository,
            notificationService
        );
    }

    @Test
    void createChoreAssignsPriorityAndNotifiesAssignee() {
        UserProfile current = user("Brian");
        UserProfile assignee = user("Alex");
        when(userProfileRepository.findById(assignee.getId())).thenReturn(Optional.of(assignee));
        when(choreRepository.save(any(Chore.class))).thenAnswer(invocation -> {
            Chore chore = invocation.getArgument(0);
            chore.setId(UUID.randomUUID());
            chore.setCreatedAt(OffsetDateTime.now());
            chore.setUpdatedAt(OffsetDateTime.now());
            return chore;
        });

        Map<String, Object> result = service.createChore(current, Map.of(
            "title", "Kitchen cleanup",
            "description", "Please wipe surfaces",
            "priority", "HIGH",
            "assigneeId", assignee.getId().toString()
        ));

        assertEquals("Kitchen cleanup", result.get("title"));
        assertEquals("HIGH", result.get("priority"));
        verify(notificationService).notifyAssignee(current, assignee, "New assigned chore", "Brian assigned you \"Kitchen cleanup\".");
    }

    @Test
    void updateEventRejectsDifferentCreator() {
        UserProfile creator = user("Brian");
        UserProfile other = user("Alex");
        Event event = new Event();
        event.setId(UUID.randomUUID());
        event.setCreator(creator);
        event.setTitle("Dinner");
        event.setStartsAt(LocalDateTime.now().plusDays(1));
        when(eventRepository.findById(event.getId())).thenReturn(Optional.of(event));

        assertThrows(AccessDeniedException.class, () ->
            service.updateEvent(other, event.getId(), Map.of("title", "Changed"))
        );
    }

    @Test
    void deleteAbsenceRejectsAnotherUser() {
        UserProfile owner = user("Brian");
        UserProfile other = user("Alex");
        Absence absence = new Absence();
        absence.setId(UUID.randomUUID());
        absence.setUserProfile(owner);
        absence.setStartsOn(LocalDate.now().plusDays(1));
        absence.setEndsOn(LocalDate.now().plusDays(2));
        when(absenceRepository.findById(absence.getId())).thenReturn(Optional.of(absence));

        assertThrows(AccessDeniedException.class, () -> service.deleteAbsence(other, absence.getId()));
    }

    @Test
    void createAbsenceValidatesDateRange() {
        UserProfile current = user("Brian");

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () ->
            service.createAbsence(current, Map.of(
                "startsOn", LocalDate.now().plusDays(5).toString(),
                "endsOn", LocalDate.now().plusDays(1).toString()
            ))
        );

        assertEquals(400, error.getStatusCode().value());
    }

    @Test
    void listPresenceIncludesBackAtAndCurrentUserFlag() {
        UserProfile current = user("Brian");
        when(userProfileRepository.findAll()).thenReturn(List.of(current));
        PresenceStatus presence = new PresenceStatus();
        presence.setUserProfile(current);
        presence.setStatus("AT_WORK");
        presence.setNote("Office");
        presence.setBackAt(OffsetDateTime.of(2026, 9, 10, 18, 0, 0, 0, ZoneOffset.UTC));
        presence.setUpdatedAt(OffsetDateTime.now());
        when(presenceStatusRepository.findByUserProfileId(current.getId())).thenReturn(Optional.of(presence));

        List<Map<String, Object>> result = service.listPresence(current);

        assertEquals(1, result.size());
        assertEquals("AT_WORK", result.getFirst().get("status"));
        assertEquals(true, result.getFirst().get("isCurrentUser"));
        assertTrue(String.valueOf(result.getFirst().get("backAt")).contains("2026-09-10T18:00Z"));
    }

    @Test
    void updateShoppingItemAcceptsValidCategory() {
        ShoppingItem item = new ShoppingItem();
        item.setId(UUID.randomUUID());
        item.setName("Soap");
        item.setCategory("OTHER");
        when(shoppingItemRepository.findById(item.getId())).thenReturn(Optional.of(item));
        when(shoppingItemRepository.save(any(ShoppingItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> result = service.updateShoppingItem(item.getId(), Map.of("category", "BATHROOM"));

        assertEquals("BATHROOM", result.get("category"));
        assertFalse((Boolean) result.get("purchased"));
    }

    @Test
    void revealApartmentPasswordDoesNotFailWithoutApartment() {
        when(apartmentInfoRepository.findFirstByOrderByCreatedAtAsc()).thenReturn(Optional.empty());

        Map<String, Object> result = service.revealApartmentPassword();

        assertEquals(false, result.get("hasWifiPassword"));
    }

    @Test
    void createFeedPostNotifiesOtherRoommates() {
        UserProfile current = user("Brian");
        when(feedPostRepository.save(any(FeedPost.class))).thenAnswer(invocation -> {
            FeedPost post = invocation.getArgument(0);
            post.setId(UUID.randomUUID());
            post.setCreatedAt(OffsetDateTime.now());
            return post;
        });

        Map<String, Object> result = service.createFeedPost(current, Map.of("body", "Laundry is done."));

        assertEquals("Laundry is done.", result.get("body"));
        verify(notificationService).notifyOtherRoommates(current, "New household post", "Brian shared a household update.", "FEED");
    }

    @Test
    void updateChoreDoesNotNotifyWhenAssigneeDoesNotChange() {
        UserProfile current = user("Brian");
        UserProfile assignee = user("Alex");
        Chore chore = new Chore();
        chore.setId(UUID.randomUUID());
        chore.setTitle("Bins");
        chore.setAssignee(assignee);
        chore.setPriority("NORMAL");
        chore.setCreatedAt(OffsetDateTime.now());
        chore.setUpdatedAt(OffsetDateTime.now());
        when(choreRepository.findById(chore.getId())).thenReturn(Optional.of(chore));
        when(choreRepository.save(any(Chore.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userProfileRepository.findById(assignee.getId())).thenReturn(Optional.of(assignee));

        service.updateChore(current, chore.getId(), Map.of("assigneeId", assignee.getId().toString()));

        verify(notificationService, never()).notifyAssignee(any(), any(), any(), any());
    }

    // ---- Apartment Wi-Fi password contract ----
    // Regression: saving any other field used to send an empty wifiPassword,
    // which nulled the stored one.

    @Test
    void updateApartmentKeepsWifiPasswordWhenKeyIsAbsent() {
        ApartmentInfo info = apartmentWithPassword("homebase123");
        when(apartmentInfoRepository.findFirstByOrderByCreatedAtAsc()).thenReturn(Optional.of(info));
        when(apartmentInfoRepository.save(any(ApartmentInfo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateApartment(Map.of("name", "New name", "wifiName", "vog69"));

        assertEquals("homebase123", info.getWifiPassword());
    }

    @Test
    void updateApartmentKeepsWifiPasswordWhenValueIsNull() {
        ApartmentInfo info = apartmentWithPassword("homebase123");
        when(apartmentInfoRepository.findFirstByOrderByCreatedAtAsc()).thenReturn(Optional.of(info));
        when(apartmentInfoRepository.save(any(ApartmentInfo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> request = new HashMap<>();
        request.put("name", "New name");
        request.put("wifiPassword", null);
        service.updateApartment(request);

        assertEquals("homebase123", info.getWifiPassword());
    }

    @Test
    void updateApartmentReplacesWifiPasswordWhenProvided() {
        ApartmentInfo info = apartmentWithPassword("homebase123");
        when(apartmentInfoRepository.findFirstByOrderByCreatedAtAsc()).thenReturn(Optional.of(info));
        when(apartmentInfoRepository.save(any(ApartmentInfo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateApartment(Map.of("name", "vog69", "wifiPassword", "a-new-secret"));

        assertEquals("a-new-secret", info.getWifiPassword());
    }

    @Test
    void updateApartmentClearsWifiPasswordOnExplicitEmptyString() {
        ApartmentInfo info = apartmentWithPassword("homebase123");
        when(apartmentInfoRepository.findFirstByOrderByCreatedAtAsc()).thenReturn(Optional.of(info));
        when(apartmentInfoRepository.save(any(ApartmentInfo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.updateApartment(Map.of("name", "vog69", "wifiPassword", ""));

        assertNull(info.getWifiPassword());
    }

    @Test
    void getApartmentNeverExposesThePlaintextPassword() {
        when(apartmentInfoRepository.findFirstByOrderByCreatedAtAsc())
            .thenReturn(Optional.of(apartmentWithPassword("homebase123")));

        Map<String, Object> result = service.getApartment();

        assertFalse(result.containsKey("wifiPassword"));
        assertEquals(true, result.get("hasWifiPassword"));
    }

    // ---- Presence status contract ----

    @Test
    void presenceKeepsCanonicalStatusValues() {
        UserProfile current = user("Brian");
        when(userProfileRepository.findAll()).thenReturn(List.of(current));
        PresenceStatus presence = new PresenceStatus();
        presence.setUserProfile(current);
        presence.setStatus("DO_NOT_DISTURB");
        presence.setUpdatedAt(OffsetDateTime.now());
        when(presenceStatusRepository.findByUserProfileId(current.getId())).thenReturn(Optional.of(presence));

        assertEquals("DO_NOT_DISTURB", service.listPresence(current).getFirst().get("status"));
    }

    // ---- Assignment on events and shopping items ----

    @Test
    void createEventStoresAssigneeAndNotifiesThem() {
        UserProfile current = user("Brian");
        UserProfile assignee = user("Alex");
        when(userProfileRepository.findById(assignee.getId())).thenReturn(Optional.of(assignee));
        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> {
            Event event = invocation.getArgument(0);
            event.setId(UUID.randomUUID());
            event.setCreatedAt(OffsetDateTime.now());
            event.setUpdatedAt(OffsetDateTime.now());
            return event;
        });

        Map<String, Object> result = service.createEvent(current, Map.of(
            "title", "Flat dinner",
            "startTime", LocalDateTime.now().plusDays(1).withNano(0).toString(),
            "assigneeId", assignee.getId().toString()
        ));

        assertEquals(assignee.getId().toString(), result.get("assigneeId"));
        assertEquals("Alex", result.get("assigneeName"));
        verify(notificationService).notifyAssignee(
            current, assignee, "New assigned event", "Brian made you responsible for \"Flat dinner\".");
    }

    @Test
    void eventWithoutAssigneeStaysUnassigned() {
        UserProfile current = user("Brian");
        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> {
            Event event = invocation.getArgument(0);
            event.setId(UUID.randomUUID());
            event.setCreatedAt(OffsetDateTime.now());
            event.setUpdatedAt(OffsetDateTime.now());
            return event;
        });

        Map<String, Object> result = service.createEvent(current, Map.of(
            "title", "Inspection",
            "startTime", LocalDateTime.now().plusDays(2).withNano(0).toString()
        ));

        assertNull(result.get("assigneeId"));
        verify(notificationService, never()).notifyAssignee(any(), any(), any(), any());
    }

    @Test
    void shoppingItemStoresAssigneeAlongsideAddedBy() {
        UserProfile current = user("Brian");
        UserProfile assignee = user("Alex");
        when(userProfileRepository.findById(assignee.getId())).thenReturn(Optional.of(assignee));
        when(shoppingItemRepository.save(any(ShoppingItem.class))).thenAnswer(invocation -> {
            ShoppingItem item = invocation.getArgument(0);
            item.setId(UUID.randomUUID());
            item.setCreatedAt(OffsetDateTime.now());
            return item;
        });

        Map<String, Object> result = service.createShoppingItem(current, Map.of(
            "name", "Bin bags",
            "category", "HOUSEHOLD",
            "assigneeId", assignee.getId().toString()
        ));

        assertEquals("Brian", result.get("addedByName"));
        assertEquals("Alex", result.get("assigneeName"));
        assertFalse((Boolean) result.get("purchased"));
    }

    private ApartmentInfo apartmentWithPassword(String password) {
        ApartmentInfo info = new ApartmentInfo();
        info.setId(UUID.randomUUID());
        info.setName("vog69");
        info.setWifiName("vog69");
        info.setWifiPassword(password);
        return info;
    }

    private UserProfile user(String name) {
        UserProfile user = new UserProfile();
        user.setId(UUID.randomUUID());
        user.setDisplayName(name);
        user.setKeycloakUserId(name.toLowerCase());
        return user;
    }
}
