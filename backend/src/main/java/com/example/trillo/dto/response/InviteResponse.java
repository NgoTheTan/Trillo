package com.example.trillo.dto.response;

/**
 * Returned when an invite is generated.
 * - If target user already exists: directlyAdded = true, inviteUrl = null
 * - If target user does NOT exist: directlyAdded = false, inviteUrl = shareable link
 */
public record InviteResponse(
        boolean directlyAdded,
        String message,
        String inviteUrl  // null when directlyAdded = true
) {}
