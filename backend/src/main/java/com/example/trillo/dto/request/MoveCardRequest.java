package com.example.trillo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MoveCardRequest(
        @NotBlank(message = "Target list ID is required")
        String targetListId,

        @NotNull(message = "Target position is required")
        Integer targetPosition
) {}
