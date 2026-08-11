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
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
    private final ActivityLogService activityLogService;
    private final SimpMessagingTemplate messagingTemplate;

    private void broadcastBoardEvent(String boardId) {
        messagingTemplate.convertAndSend("/topic/board/" + boardId, "CARD_UPDATED");
    }

    @Transactional
    public ChecklistResponse createChecklist(String cardId, CreateChecklistRequest request, User currentUser) {
        Card card = cardService.findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.MANAGE_CHECKLIST);

        Checklist checklist = Checklist.builder()
                .card(card)
                .title(request.title())
                .build();

        Checklist saved = checklistRepository.save(checklist);
        activityLogService.logActivity(card, currentUser, "checklist_created",
                currentUser.getFullName() + " added checklist '" + saved.getTitle() + "' to this card");

        broadcastBoardEvent(card.getList().getBoard().getId());
        return toResponse(saved);
    }

    @Transactional
    public ChecklistResponse updateChecklist(String checklistId, CreateChecklistRequest request, User currentUser) {
        Checklist checklist = findOrThrow(checklistId);
        boardService.requirePermission(checklist.getCard().getList().getBoard(), currentUser, BoardPermission.MANAGE_CHECKLIST);

        if (request.title() != null && !request.title().isBlank()) {
            checklist.setTitle(request.title().trim());
        }

        Checklist saved = checklistRepository.save(checklist);
        broadcastBoardEvent(saved.getCard().getList().getBoard().getId());
        return toResponse(saved);
    }

    @Transactional
    public void deleteChecklist(String checklistId, User currentUser) {
        Checklist checklist = findOrThrow(checklistId);
        String boardId = checklist.getCard().getList().getBoard().getId();
        boardService.requirePermission(checklist.getCard().getList().getBoard(), currentUser, BoardPermission.MANAGE_CHECKLIST);
        activityLogService.logActivity(checklist.getCard(), currentUser, "checklist_deleted",
                currentUser.getFullName() + " removed checklist '" + checklist.getTitle() + "'");
        checklistRepository.delete(checklist);
        broadcastBoardEvent(boardId);
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

        ChecklistItem saved = checklistItemRepository.save(item);
        activityLogService.logActivity(checklist.getCard(), currentUser, "checklist_item_added",
                currentUser.getFullName() + " added '" + saved.getContent() + "' to " + checklist.getTitle());

        broadcastBoardEvent(checklist.getCard().getList().getBoard().getId());
        return toItemResponse(saved);
    }

    @Transactional
    public ChecklistItemResponse updateItem(String itemId, CreateChecklistItemRequest request, User currentUser) {
        ChecklistItem item = checklistItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ChecklistItem", itemId));
        boardService.requirePermission(item.getChecklist().getCard().getList().getBoard(), currentUser, BoardPermission.MANAGE_CHECKLIST);

        if (request.content() != null && !request.content().isBlank()) {
            item.setContent(request.content().trim());
        }

        ChecklistItem saved = checklistItemRepository.save(item);
        broadcastBoardEvent(saved.getChecklist().getCard().getList().getBoard().getId());
        return toItemResponse(saved);
    }

    @Transactional
    public ChecklistItemResponse toggleItem(String itemId, User currentUser) {
        ChecklistItem item = checklistItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ChecklistItem", itemId));
        boardService.requirePermission(item.getChecklist().getCard().getList().getBoard(), currentUser, BoardPermission.MANAGE_CHECKLIST);

        item.setCompleted(!item.isCompleted());
        ChecklistItem saved = checklistItemRepository.save(item);
        activityLogService.logActivity(item.getChecklist().getCard(), currentUser, "checklist_toggled",
                currentUser.getFullName() + (saved.isCompleted() ? " completed " : " marked incomplete ") + "'" + saved.getContent() + "' on " + item.getChecklist().getTitle());

        broadcastBoardEvent(saved.getChecklist().getCard().getList().getBoard().getId());
        return toItemResponse(saved);
    }

    @Transactional
    public void deleteItem(String itemId, User currentUser) {
        ChecklistItem item = checklistItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("ChecklistItem", itemId));
        String boardId = item.getChecklist().getCard().getList().getBoard().getId();
        boardService.requirePermission(item.getChecklist().getCard().getList().getBoard(), currentUser, BoardPermission.MANAGE_CHECKLIST);
        checklistItemRepository.delete(item);
        broadcastBoardEvent(boardId);
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
