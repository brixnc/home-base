package com.homebase.api;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "presence_status")
public class PresenceStatus {
    @Id
    @Column(name = "user_profile_id", nullable = false)
    private UUID userProfileId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_profile_id")
    private UserProfile userProfile;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "AWAY";

    @Column(name = "back_at")
    private OffsetDateTime backAt;

    @Column(name = "note", length = 280)
    private String note;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;


    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = OffsetDateTime.now();
    }


    public UUID getUserProfileId() {
        return userProfileId;
    }

    public void setUserProfileId(UUID userProfileId) {
        this.userProfileId = userProfileId;
    }

    public UserProfile getUserProfile() {
        return userProfile;
    }

    public void setUserProfile(UserProfile userProfile) {
        this.userProfile = userProfile;
        this.userProfileId = userProfile != null ? userProfile.getId() : null;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getBackAt() {
        return backAt;
    }

    public void setBackAt(OffsetDateTime backAt) {
        this.backAt = backAt;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
