package com.homebase.api;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApartmentInfoRepository extends JpaRepository<ApartmentInfo, UUID> {
    Optional<ApartmentInfo> findFirstByOrderByCreatedAtAsc();
}
