package com.example.trillo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "join_requests",
        uniqueConstraints = @UniqueConstraint(columnNames = {"board_id", "requester_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"board", "requester"})
@ToString(exclude = {"board", "requester"})
public class JoinRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    /** PENDING, APPROVED, REJECTED */
    @Builder.Default
    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    /** LINK (via invite link) or PUBLIC (from public board) */
    @Builder.Default
    @Column(nullable = false, length = 20)
    private String source = "PUBLIC";

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime respondedAt;
}
