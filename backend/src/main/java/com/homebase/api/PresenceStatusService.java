package com.homebase.api;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PresenceStatusService {
    private static final List<String> VALID_STATUSES = List.of("HOME", "AWAY", "AT_WORK", "AT_SCHOOL", "TRAVELING", "DO_NOT_DISTURB");

    private final PresenceStatusRepository repository;
    private final JdbcTemplate jdbcTemplate;

    public PresenceStatusService(PresenceStatusRepository repository, JdbcTemplate jdbcTemplate) {
        this.repository = repository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public PresenceStatus getOrCreate(UserProfile userProfile) {
        return repository.findByUserProfileId(userProfile.getId())
            .orElseGet(() -> {
                jdbcTemplate.update(
                    "INSERT INTO presence_status (user_profile_id, status) VALUES (?, ?) ON CONFLICT (user_profile_id) DO NOTHING",
                    userProfile.getId(),
                    "AWAY"
                );
                return repository.findByUserProfileId(userProfile.getId()).orElseThrow();
            });
    }

    @Transactional
    public PresenceStatus updateStatus(UserProfile userProfile, String status, String note, OffsetDateTime backAt) {
        String normalizedStatus = normalizeStatus(status);
        if (normalizedStatus == null || !VALID_STATUSES.contains(normalizedStatus)) {
            throw new IllegalArgumentException("Status is invalid");
        }

        PresenceStatus current = getOrCreate(userProfile);
        String normalizedNote = note == null ? null : note.trim();
        jdbcTemplate.update(
            "UPDATE presence_status SET status = ?, note = ?, back_at = ?, updated_at = now() WHERE user_profile_id = ?",
            normalizedStatus,
            normalizedNote,
            backAt,
            userProfile.getId()
        );
        current.setStatus(normalizedStatus);
        current.setNote(normalizedNote);
        current.setBackAt(backAt);
        current.setUpdatedAt(OffsetDateTime.now());
        return current;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) return null;
        return switch (status.trim().toUpperCase()) {
            case "WORK" -> "AT_WORK";
            case "SCHOOL" -> "AT_SCHOOL";
            default -> status.trim().toUpperCase();
        };
    }

    @Transactional(readOnly = true)
    public List<PresenceStatus> findAll() {
        return repository.findAll();
    }

    public Optional<PresenceStatus> findByUserProfileId(UUID userProfileId) {
        return repository.findByUserProfileId(userProfileId);
    }
}
