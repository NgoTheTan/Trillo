package com.example.trillo.dto.response;

import java.time.LocalDateTime;

public record LabelResponse(
        String id,
        String boardId,
        String name,
        String color,
        LocalDateTime createdAt
) {}
