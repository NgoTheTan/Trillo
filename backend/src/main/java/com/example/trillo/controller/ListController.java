package com.example.trillo.controller;

import com.example.trillo.dto.request.CreateListRequest;
import com.example.trillo.dto.request.ReorderRequest;
import com.example.trillo.dto.request.UpdateListRequest;
import com.example.trillo.dto.response.ListResponse;
import com.example.trillo.entity.User;
import com.example.trillo.service.ListService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/boards/{boardId}/lists")
@RequiredArgsConstructor
public class ListController {

    private final ListService listService;

    @GetMapping
    public ResponseEntity<List<ListResponse>> getLists(
            @PathVariable String boardId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(listService.getLists(boardId, user));
    }

    @PostMapping
    public ResponseEntity<ListResponse> createList(
            @PathVariable String boardId,
            @Valid @RequestBody CreateListRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(listService.createList(boardId, request, user));
    }

    @PutMapping("/{listId}")
    public ResponseEntity<ListResponse> updateList(
            @PathVariable String boardId,
            @PathVariable String listId,
            @Valid @RequestBody UpdateListRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(listService.updateList(boardId, listId, request, user));
    }

    @DeleteMapping("/{listId}")
    public ResponseEntity<Void> deleteList(
            @PathVariable String boardId,
            @PathVariable String listId,
            @AuthenticationPrincipal User user) {
        listService.deleteList(boardId, listId, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/archived")
    public ResponseEntity<List<ListResponse>> getArchivedLists(
            @PathVariable String boardId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(listService.getArchivedLists(boardId, user));
    }

    @PatchMapping("/{listId}/archive")
    public ResponseEntity<ListResponse> archiveList(
            @PathVariable String boardId,
            @PathVariable String listId,
            @RequestParam(defaultValue = "true") boolean archived,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(listService.archiveList(boardId, listId, archived, user));
    }

    @PostMapping("/{listId}/copy")
    public ResponseEntity<ListResponse> copyList(
            @PathVariable String boardId,
            @PathVariable String listId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(listService.copyList(boardId, listId, user));
    }

    @PostMapping("/{listId}/move-all-cards")
    public ResponseEntity<Void> moveAllCards(
            @PathVariable String boardId,
            @PathVariable String listId,
            @RequestParam String targetListId,
            @AuthenticationPrincipal User user) {
        listService.moveAllCards(boardId, listId, targetListId, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{listId}/archive-all-cards")
    public ResponseEntity<Void> archiveAllCards(
            @PathVariable String boardId,
            @PathVariable String listId,
            @AuthenticationPrincipal User user) {
        listService.archiveAllCards(boardId, listId, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{listId}/sort")
    public ResponseEntity<Void> sortCardsInList(
            @PathVariable String boardId,
            @PathVariable String listId,
            @RequestParam String sortBy,
            @AuthenticationPrincipal User user) {
        listService.sortCardsInList(boardId, listId, sortBy, user);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorderLists(
            @PathVariable String boardId,
            @RequestBody ReorderRequest request,
            @AuthenticationPrincipal User user) {
        listService.reorderLists(boardId, request, user);
        return ResponseEntity.ok().build();
    }
}
