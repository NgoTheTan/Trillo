package com.example.trillo.controller;

import com.example.trillo.dto.request.CreateCardRequest;
import com.example.trillo.dto.request.MoveCardRequest;
import com.example.trillo.dto.request.ReorderRequest;
import com.example.trillo.dto.request.UpdateCardRequest;
import com.example.trillo.dto.response.CardResponse;
import com.example.trillo.dto.response.CardSummaryResponse;
import com.example.trillo.entity.User;
import com.example.trillo.service.CardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    // ── Cards under a list ─────────────────────────────────────────────────
    @GetMapping("/api/lists/{listId}/cards")
    public ResponseEntity<List<CardSummaryResponse>> getCards(
            @PathVariable String listId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cardService.getCardsByList(listId, user));
    }

    @PostMapping("/api/lists/{listId}/cards")
    public ResponseEntity<CardSummaryResponse> createCard(
            @PathVariable String listId,
            @Valid @RequestBody CreateCardRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cardService.createCard(listId, request, user));
    }

    // ── Card operations ────────────────────────────────────────────────────
    @GetMapping("/api/cards/{cardId}")
    public ResponseEntity<CardResponse> getCard(
            @PathVariable String cardId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cardService.getCard(cardId, user));
    }

    @PutMapping("/api/cards/{cardId}")
    public ResponseEntity<CardResponse> updateCard(
            @PathVariable String cardId,
            @RequestBody UpdateCardRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cardService.updateCard(cardId, request, user));
    }

    @PatchMapping("/api/cards/{cardId}/completed")
    public ResponseEntity<CardSummaryResponse> toggleCardCompleted(
            @PathVariable String cardId,
            @RequestParam(required = false) Boolean completed,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cardService.toggleCompleted(cardId, completed, user));
    }

    @PatchMapping("/api/cards/{cardId}/archive")
    public ResponseEntity<CardSummaryResponse> archiveCard(
            @PathVariable String cardId,
            @RequestParam(defaultValue = "true") boolean archived,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cardService.archiveCard(cardId, archived, user));
    }

    @GetMapping("/api/boards/{boardId}/cards/archived")
    public ResponseEntity<List<CardSummaryResponse>> getArchivedCards(
            @PathVariable String boardId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cardService.getArchivedCards(boardId, user));
    }

    @DeleteMapping("/api/cards/{cardId}")
    public ResponseEntity<Void> deleteCard(
            @PathVariable String cardId,
            @AuthenticationPrincipal User user) {
        cardService.deleteCard(cardId, user);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/cards/{cardId}/move")
    public ResponseEntity<CardSummaryResponse> moveCard(
            @PathVariable String cardId,
            @Valid @RequestBody MoveCardRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cardService.moveCard(cardId, request, user));
    }

    @PatchMapping("/api/lists/{listId}/cards/reorder")
    public ResponseEntity<Void> reorderCards(
            @PathVariable String listId,
            @RequestBody ReorderRequest request,
            @AuthenticationPrincipal User user) {
        cardService.reorderCards(listId, request, user);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/api/cards/{cardId}/assign/{userId}")
    public ResponseEntity<CardResponse> assignMember(
            @PathVariable String cardId,
            @PathVariable String userId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cardService.assignMember(cardId, userId, user));
    }

    @DeleteMapping("/api/cards/{cardId}/assign/{userId}")
    public ResponseEntity<CardResponse> unassignMember(
            @PathVariable String cardId,
            @PathVariable String userId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cardService.unassignMember(cardId, userId, user));
    }

    // ── Calendar view ──────────────────────────────────────────────────────
    @GetMapping("/api/boards/{boardId}/calendar")
    public ResponseEntity<List<CardSummaryResponse>> getCalendarCards(
            @PathVariable String boardId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cardService.getCardsForCalendar(boardId, from, to, user));
    }

    // ── Filter & Search ────────────────────────────────────────────────────
    @GetMapping("/api/boards/{boardId}/cards/filter")
    public ResponseEntity<List<CardSummaryResponse>> filterCards(
            @PathVariable String boardId,
            @RequestParam(required = false) List<String> labelIds,
            @RequestParam(required = false) List<String> memberIds,
            @RequestParam(required = false) List<String> listIds,
            @RequestParam(required = false) List<String> columnIds,
            @RequestParam(required = false) Boolean status,
            @RequestParam(required = false) Boolean completed,
            @RequestParam(required = false) Boolean noDeadline,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime deadlineFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime deadlineTo,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String keywords,
            @AuthenticationPrincipal User user) {
        List<String> targetLists = (listIds != null && !listIds.isEmpty()) ? listIds : columnIds;
        String targetSearch = (search != null && !search.isBlank()) ? search : keywords;
        Boolean targetStatus = (status != null) ? status : completed;
        return ResponseEntity.ok(cardService.filterCards(boardId, labelIds, memberIds, targetLists, targetStatus, noDeadline, deadlineFrom, deadlineTo, targetSearch, user));
    }
}
