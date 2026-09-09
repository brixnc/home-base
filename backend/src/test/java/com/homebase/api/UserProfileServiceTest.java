package com.homebase.api;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.security.oauth2.jwt.Jwt;

class UserProfileServiceTest {

    @Test
    void createsUserProfileFromKeycloakJwt() {
        UserProfileRepository repository = mock(UserProfileRepository.class);
        UserProfile profile = new UserProfile();
        profile.setKeycloakUserId("keycloak-123");
        profile.setDisplayName("Brian Parker");
        profile.setNickname("brian");
        profile.setFunFact("brian@example.com");

        when(repository.findByKeycloakUserId("keycloak-123")).thenReturn(Optional.empty());
        when(repository.saveAndFlush(any(UserProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "RS256")
            .claim("sub", "keycloak-123")
            .claim("preferred_username", "brian")
            .claim("name", "Brian Parker")
            .claim("email", "brian@example.com")
            .build();

        UserProfileService service = new UserProfileService(repository);
        UserProfile user = service.fromJwt(jwt);

        assertNotNull(user);
        assertEquals("keycloak-123", user.getKeycloakUserId());
        assertEquals("Brian Parker", user.getDisplayName());
        assertEquals("brian", user.getNickname());
        verify(repository).saveAndFlush(any(UserProfile.class));
    }
}
