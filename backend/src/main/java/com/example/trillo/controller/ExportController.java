package com.example.trillo.controller;

import com.example.trillo.entity.User;
import com.example.trillo.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/boards/{boardId}/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;

    @GetMapping
    public ResponseEntity<String> exportBoard(
            @PathVariable String boardId,
            @RequestParam(defaultValue = "json") String format,
            @AuthenticationPrincipal User user) throws Exception {

        if ("csv".equalsIgnoreCase(format)) {
            String csv = exportService.exportBoardAsCsv(boardId, user);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"board-" + boardId + ".csv\"")
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(csv);
        } else {
            String json = exportService.exportBoardAsJson(boardId, user);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"board-" + boardId + ".json\"")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(json);
        }
    }
}
