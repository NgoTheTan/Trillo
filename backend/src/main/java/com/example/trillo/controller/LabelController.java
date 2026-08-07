package com.example.trillo.controller;

import com.example.trillo.dto.request.CreateLabelRequest;
import com.example.trillo.dto.request.UpdateLabelRequest;
import com.example.trillo.dto.response.LabelResponse;
import com.example.trillo.entity.User;
import com.example.trillo.service.LabelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class LabelController {

    private final LabelService labelService;

    @GetMapping("/api/boards/{boardId}/labels")
    public ResponseEntity<List<LabelResponse>> getLabels(
            @PathVariable String boardId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(labelService.getLabelsForBoard(boardId, user));
    }

    @PostMapping("/api/boards/{boardId}/labels")
    public ResponseEntity<LabelResponse> createLabel(
            @PathVariable String boardId,
            @Valid @RequestBody CreateLabelRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(labelService.createLabel(boardId, request, user));
    }

    @PutMapping("/api/labels/{labelId}")
    public ResponseEntity<LabelResponse> updateLabel(
            @PathVariable String labelId,
            @Valid @RequestBody UpdateLabelRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(labelService.updateLabel(labelId, request, user));
    }

    @DeleteMapping("/api/labels/{labelId}")
    public ResponseEntity<Void> deleteLabel(
            @PathVariable String labelId,
            @AuthenticationPrincipal User user) {
        labelService.deleteLabel(labelId, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/cards/{cardId}/labels/{labelId}")
    public ResponseEntity<Void> addLabelToCard(
            @PathVariable String cardId,
            @PathVariable String labelId,
            @AuthenticationPrincipal User user) {
        labelService.addLabelToCard(cardId, labelId, user);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/api/cards/{cardId}/labels/{labelId}")
    public ResponseEntity<Void> removeLabelFromCard(
            @PathVariable String cardId,
            @PathVariable String labelId,
            @AuthenticationPrincipal User user) {
        labelService.removeLabelFromCard(cardId, labelId, user);
        return ResponseEntity.noContent().build();
    }
}
