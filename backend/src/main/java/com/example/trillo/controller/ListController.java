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

    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorderLists(
            @PathVariable String boardId,
            @RequestBody ReorderRequest request,
            @AuthenticationPrincipal User user) {
        listService.reorderLists(boardId, request, user);
        return ResponseEntity.ok().build();
    }
}
