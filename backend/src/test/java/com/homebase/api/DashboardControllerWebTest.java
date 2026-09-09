package com.homebase.api;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(DashboardController.class)
@Import({ SecurityConfig.class, ApiExceptionHandler.class })
class DashboardControllerWebTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserProfileService userProfileService;

    @MockBean
    private DashboardService dashboardService;

    @MockBean
    private HouseholdService householdService;

    @MockBean
    private JwtDecoder jwtDecoder;

    @Test
    void rejectsUnauthenticatedRequests() throws Exception {
        mockMvc.perform(get("/api/dashboard"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void allowsAuthenticatedDashboardRequests() throws Exception {
        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "none")
            .subject("user-1")
            .claim("preferred_username", "brian")
            .claim("name", "Brian Parker")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(300))
            .build();
        UserProfile user = new UserProfile();
        user.setId(java.util.UUID.randomUUID());
        user.setDisplayName("Brian Parker");

        when(jwtDecoder.decode("token")).thenReturn(jwt);
        when(userProfileService.getOrCreateFromJwt(jwt)).thenReturn(user);
        when(dashboardService.getDashboard(user)).thenReturn(Map.of(
            "roommates", List.of(),
            "events", List.of(),
            "chores", List.of(),
            "shopping", List.of()
        ));

        mockMvc.perform(get("/api/dashboard").header("Authorization", "Bearer ".concat("token")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.roommates").isArray())
            .andExpect(jsonPath("$.events").isArray());
    }
}
