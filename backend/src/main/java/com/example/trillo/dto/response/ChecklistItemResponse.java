package com.example.trillo.dto.response;

import java.time.LocalDateTime;

public record ChecklistItemResponse(
        String id,
        String content,
        boolean completed,
        int position,
        LocalDateTime createdAt
) {}
