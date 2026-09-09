package com.homebase.api;

import java.util.Optional;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {
    private final UserProfileRepository userProfileRepository;

    public UserProfileService(UserProfileRepository userProfileRepository) {
        this.userProfileRepository = userProfileRepository;
    }

    @Transactional
    public synchronized UserProfile getOrCreateFromJwt(Jwt jwt) {
        String keycloakUserId = jwt.getSubject();
        String preferredUsername = Optional.ofNullable(jwt.getClaimAsString("preferred_username")).orElse("roommate");
        String displayName = Optional.ofNullable(jwt.getClaimAsString("name")).orElse(preferredUsername);
        String email = jwt.getClaimAsString("email");

        return userProfileRepository.findByKeycloakUserId(keycloakUserId)
            .map(existing -> {
                boolean changed = false;
                if (!displayName.equals(existing.getDisplayName())) {
                    existing.setDisplayName(displayName);
                    changed = true;
                }
                if (!preferredUsername.equals(existing.getNickname())) {
                    existing.setNickname(preferredUsername);
                    changed = true;
                }
                if (email != null && !email.equals(existing.getFunFact())) {
                    existing.setFunFact(email);
                    changed = true;
                }
                return changed ? userProfileRepository.save(existing) : existing;
            })
            .orElseGet(() -> {
                UserProfile profile = new UserProfile();
                profile.setKeycloakUserId(keycloakUserId);
                profile.setDisplayName(displayName);
                profile.setNickname(preferredUsername);
                profile.setAvatarUrl(null);
                profile.setFunFact(email);
                return userProfileRepository.saveAndFlush(profile);
            });
    }

    public UserProfile fromJwt(Jwt jwt) {
        return getOrCreateFromJwt(jwt);
    }
}
