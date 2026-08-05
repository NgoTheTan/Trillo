package com.example.trillo.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record ChecklistResponse(
        String id,
        String title,
        List<ChecklistItemResponse> items,
        int totalItems,
        int completedItems,
        LocalDateTime createdAt
) {}
