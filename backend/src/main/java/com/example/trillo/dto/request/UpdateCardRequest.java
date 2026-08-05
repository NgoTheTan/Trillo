package com.example.trillo.dto.request;

import com.example.trillo.enums.Priority;

import java.time.LocalDateTime;

public record UpdateCardRequest(
        String title,
        String description,
        LocalDateTime deadline,
        Priority priority,
        Boolean completed
) {}
