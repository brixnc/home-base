package com.homebase.api;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserProfileRepository userProfileRepository;

    public NotificationService(
        NotificationRepository notificationRepository,
        UserProfileRepository userProfileRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.userProfileRepository = userProfileRepository;
    }

    @Transactional
    public void createForUser(UserProfile user, String title, String message, String type) {
        if (user == null) {
            return;
        }
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyAssignee(UserProfile actor, UserProfile assignee, String title, String message) {
        if (assignee == null || actor == null || assignee.getId().equals(actor.getId())) {
            return;
        }
        createForUser(assignee, title, message, "CHORE");
    }

    @Transactional
    public void notifyOtherRoommates(UserProfile actor, String title, String message, String type) {
        List<UserProfile> roommates = userProfileRepository.findAll();
        for (UserProfile roommate : roommates) {
            if (actor != null && actor.getId().equals(roommate.getId())) {
                continue;
            }
            createForUser(roommate, title, message, type);
        }
    }
}
