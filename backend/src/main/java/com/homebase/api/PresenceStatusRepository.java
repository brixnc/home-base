package com.homebase.api;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PresenceStatusRepository extends JpaRepository<PresenceStatus, UUID> {
    Optional<PresenceStatus> findByUserProfileId(UUID userProfileId);
}
