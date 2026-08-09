package com.example.trillo.controller;

import com.example.trillo.dto.response.NotificationResponse;
import com.example.trillo.entity.NotificationSetting;
import com.example.trillo.entity.User;
import com.example.trillo.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.getNotifications(user));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<NotificationResponse>> getUnread(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.getUnreadNotifications(user));
    }

    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(user)));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable String notificationId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.markAsRead(notificationId, user));
    }

    @PatchMapping("/{notificationId}/unread")
    public ResponseEntity<NotificationResponse> markAsUnread(
            @PathVariable String notificationId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.markAsUnread(notificationId, user));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal User user) {
        notificationService.markAllAsRead(user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/settings")
    public ResponseEntity<NotificationSetting> getSettings(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.getSettings(user.getId()));
    }

    @PutMapping("/settings")
    public ResponseEntity<NotificationSetting> updateSettings(
            @RequestBody NotificationSetting settings,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(notificationService.updateSettings(user.getId(), settings));
    }
}