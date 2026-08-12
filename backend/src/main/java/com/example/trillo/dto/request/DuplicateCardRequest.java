package com.example.trillo.dto.request;

public record DuplicateCardRequest(
        String title,
        String targetListId,
        Integer position
) {}
