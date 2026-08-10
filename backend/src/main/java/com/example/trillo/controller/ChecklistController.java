package com.example.trillo.controller;

import com.example.trillo.dto.request.CreateChecklistItemRequest;
import com.example.trillo.dto.request.CreateChecklistRequest;
import com.example.trillo.dto.response.ChecklistItemResponse;
import com.example.trillo.dto.response.ChecklistResponse;
import com.example.trillo.entity.User;
import com.example.trillo.service.ChecklistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ChecklistController {

    private final ChecklistService checklistService;

    @PostMapping("/api/cards/{cardId}/checklists")
    public ResponseEntity<ChecklistResponse> createChecklist(
            @PathVariable String cardId,
            @Valid @RequestBody CreateChecklistRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(checklistService.createChecklist(cardId, request, user));
    }

    @PutMapping("/api/checklists/{checklistId}")
    public ResponseEntity<ChecklistResponse> updateChecklist(
            @PathVariable String checklistId,
            @Valid @RequestBody CreateChecklistRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(checklistService.updateChecklist(checklistId, request, user));
    }

    @DeleteMapping("/api/checklists/{checklistId}")
    public ResponseEntity<Void> deleteChecklist(
            @PathVariable String checklistId,
            @AuthenticationPrincipal User user) {
        checklistService.deleteChecklist(checklistId, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/checklists/{checklistId}/items")
    public ResponseEntity<ChecklistItemResponse> addItem(
            @PathVariable String checklistId,
            @Valid @RequestBody CreateChecklistItemRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(checklistService.addItem(checklistId, request, user));
    }

    @PutMapping("/api/checklists/items/{itemId}")
    public ResponseEntity<ChecklistItemResponse> updateItem(
            @PathVariable String itemId,
            @Valid @RequestBody CreateChecklistItemRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(checklistService.updateItem(itemId, request, user));
    }

    @PatchMapping("/api/checklists/items/{itemId}/toggle")
    public ResponseEntity<ChecklistItemResponse> toggleItem(
            @PathVariable String itemId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(checklistService.toggleItem(itemId, user));
    }

    @DeleteMapping("/api/checklists/items/{itemId}")
    public ResponseEntity<Void> deleteItem(
            @PathVariable String itemId,
            @AuthenticationPrincipal User user) {
        checklistService.deleteItem(itemId, user);
        return ResponseEntity.noContent().build();
    }
}
