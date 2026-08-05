package com.example.trillo.dto.request;

import com.example.trillo.enums.Priority;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

public record CreateCardRequest(
        @NotBlank(message = "Card title is required")
        String title,

        String description,

        LocalDateTime deadline,

        Priority priority
) {}
