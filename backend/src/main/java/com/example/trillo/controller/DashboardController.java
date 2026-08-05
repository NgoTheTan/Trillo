package com.example.trillo.controller;

import com.example.trillo.dto.response.DashboardStatsResponse;
import com.example.trillo.entity.User;
import com.example.trillo.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    // Global stats (across all owned boards)
    @GetMapping
    public ResponseEntity<DashboardStatsResponse> getGlobalDashboard(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.getGlobalDashboard(user));
    }

    // Board-specific stats (must be OWNER)
    @GetMapping("/boards/{boardId}")
    public ResponseEntity<DashboardStatsResponse> getBoardDashboard(
            @PathVariable String boardId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dashboardService.getDashboard(boardId, user));
    }
}
