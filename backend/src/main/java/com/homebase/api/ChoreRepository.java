package com.homebase.api;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChoreRepository extends JpaRepository<Chore, UUID> {
    List<Chore> findByAssigneeIdOrderByDueDateAscCreatedAtDesc(UUID assigneeId);

    List<Chore> findAllByOrderByDueDateAscCreatedAtDesc();
}
