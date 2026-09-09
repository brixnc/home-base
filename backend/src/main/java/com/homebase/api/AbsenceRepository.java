package com.homebase.api;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AbsenceRepository extends JpaRepository<Absence, UUID> {
    List<Absence> findAllByOrderByStartsOnAscCreatedAtAsc();

    List<Absence> findByUserProfileIdOrderByStartsOnAscCreatedAtAsc(UUID userProfileId);

    List<Absence> findByEndsOnGreaterThanEqualOrderByStartsOnAscCreatedAtAsc(LocalDate date);
}
