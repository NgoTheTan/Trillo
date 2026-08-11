package com.example.trillo.entity;

import com.example.trillo.enums.BoardRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "board_members",
        uniqueConstraints = @UniqueConstraint(columnNames = {"board_id", "user_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"board", "user"})
@ToString(exclude = {"board", "user"})
public class BoardMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BoardRole role;

    /**
     * JSON array of granted BoardPermission values, e.g. ["CREATE_CARD","EDIT_CARD"].
     * OWNER members ignore this field — they always have full access.
     * For MEMBER role, empty/null means view-only.
     */
    @Builder.Default
    @Column(columnDefinition = "TEXT")
    private String permissions = "[]";

    /**
     * Whether the current user has starred (bookmarked) this board.
     * This is per-user — each BoardMember row tracks the star independently.
     */
    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean starred = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime joinedAt;
}
