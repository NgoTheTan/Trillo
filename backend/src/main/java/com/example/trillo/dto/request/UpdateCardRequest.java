package com.example.trillo.dto.request;

import java.time.LocalDateTime;

public record UpdateCardRequest(
        String title,
        String description,
        LocalDateTime deadline,
        Boolean completed
) {}
