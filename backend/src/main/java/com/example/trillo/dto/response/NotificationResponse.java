package com.example.trillo.dto.response;

import com.example.trillo.enums.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(
        String id,
        NotificationType type,
        String message,
        String referenceId,
        String referenceType,
        boolean read,
        LocalDateTime createdAt
) {}
