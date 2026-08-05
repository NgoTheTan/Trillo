package com.example.trillo.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateChecklistItemRequest(
        @NotBlank(message = "Item content is required")
        String content
) {}
