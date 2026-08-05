package com.example.trillo.dto.response;

import com.example.trillo.enums.BoardRole;
import com.example.trillo.enums.Visibility;

import java.time.LocalDateTime;

public record BoardSummaryResponse(
        String id,
        String title,
        String description,
        Visibility visibility,
        String coverColor,
        UserResponse owner,
        BoardRole currentUserRole,
        int memberCount,
        int cardCount,
        LocalDateTime createdAt
) {}
