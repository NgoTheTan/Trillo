package com.example.trillo.dto.request;

import jakarta.validation.constraints.Pattern;

public record UpdateLabelRequest(
        String name,

        @Pattern(regexp = "^#([A-Fa-f0-9]{6})$", message = "Color must be a valid HEX color (e.g. #FF5733)")
        String color
) {}
