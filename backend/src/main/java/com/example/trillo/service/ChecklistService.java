package com.example.trillo.service;

import com.example.trillo.dto.request.CreateChecklistItemRequest;
import com.example.trillo.dto.request.CreateChecklistRequest;
import com.example.trillo.dto.response.ChecklistItemResponse;
import com.example.trillo.dto.response.ChecklistResponse;
import com.example.trillo.entity.*;
import com.example.trillo.enums.BoardPermission;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.ChecklistItemRepository;
import com.example.trillo.repository.ChecklistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChecklistService {

    private final ChecklistRepository checklistRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final CardService cardService;
    private final BoardService boardService;

    @Transactional
    public ChecklistResponse createChecklist(String cardId, CreateChecklistRequest request, User currentUser) {
        Card card = cardService.findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.MANAGE_CHECKLIST);

        Checklist checklist = Checklist.builder()
                .card(card)
                .title(request.title())
                .build();

        return toResponse(checklistRepository.save(checklist));
    }

    @Transactional
    public void deleteChecklist(String checklistId, User currentUser) {
        Checklist checklist = findOrThrow(checklistId);
        boardService.requirePermission(checklist.getCard().getList().getBoard(), currentUser, BoardPermission.MANAGE_CHECKLIST);
        checklistRepository.delete(checklist);
    }

    @Transactional
    public ChecklistItemResponse addItem(String checklistId, CreateChecklistItemRequest request, User currentUser) {
        Checklist checklist = findOrThrow(checklistId);
        boardService.requirePermission(checklist.getCard().getList().getBoard(), currentUser, BoardPermission.MANAGE_CHECKLIST);

        int maxPos = checklistItemRepository.findMaxPositionByChecklistId(checklistId);
        ChecklistItem item = ChecklistItem.builder()
                .checklist(checklist)
                .content(request.content())
                .position(maxPos + 1)
                .build();

        return toItemResponse(checklistItemRepository.save(item));
    }

    @Transactional
    public ChecklistItemResponse toggleItem(String itemId, User currentUser) {
        ChecklistItem item = checklistItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ChecklistItem", itemId));
        boardService.requirePermission(item.getChecklist().getCard().getList().getBoard(), currentUser, BoardPermission.MANAGE_CHECKLIST);

        item.setCompleted(!item.isCompleted());
        return toItemResponse(checklistItemRepository.save(item));
    }

    @Transactional
    public void deleteItem(String itemId, User currentUser) {
        ChecklistItem item = checklistItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ChecklistItem", itemId));
        boardService.requirePermission(item.getChecklist().getCard().getList().getBoard(), currentUser, BoardPermission.MANAGE_CHECKLIST);
        checklistItemRepository.delete(item);
    }

    private Checklist findOrThrow(String id) {
        return checklistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist", id));
    }

    private ChecklistResponse toResponse(Checklist c) {
        List<ChecklistItemResponse> items = c.getItems().stream()
                .map(this::toItemResponse).toList();
        long completed = items.stream().filter(ChecklistItemResponse::completed).count();
        return new ChecklistResponse(c.getId(), c.getTitle(), items, items.size(), (int) completed, c.getCreatedAt());
    }

    private ChecklistItemResponse toItemResponse(ChecklistItem i) {
        return new ChecklistItemResponse(i.getId(), i.getContent(), i.isCompleted(), i.getPosition(), i.getCreatedAt());
    }
}
