package com.homebase.api;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedPostRepository extends JpaRepository<FeedPost, UUID> {
    List<FeedPost> findAllByOrderByCreatedAtDesc();
}
