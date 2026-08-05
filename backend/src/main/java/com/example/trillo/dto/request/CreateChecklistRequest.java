package com.example.trillo.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateChecklistRequest(
        @NotBlank(message = "Checklist title is required")
        String title
) {}
