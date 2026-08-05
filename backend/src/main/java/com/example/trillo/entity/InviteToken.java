package com.example.trillo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "invite_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InviteToken {

    @Id
    private String token; // UUID token as PK

    @Column(nullable = false)
    private String email; // Invitee's email

    @Column(nullable = false)
    private String boardId;

    @Column(nullable = false)
    private String invitedByUserId;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Builder.Default
    private boolean used = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
