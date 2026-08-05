package com.example.trillo.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ReorderRequest(
        @NotNull
        List<String> orderedIds
) {}
