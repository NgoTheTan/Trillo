package com.example.trillo.service;

import com.example.trillo.dto.request.CreateCardRequest;
import com.example.trillo.dto.request.MoveCardRequest;
import com.example.trillo.dto.request.ReorderRequest;
import com.example.trillo.dto.request.UpdateCardRequest;
import com.example.trillo.dto.response.*;
import com.example.trillo.entity.*;
import com.example.trillo.enums.BoardPermission;
import com.example.trillo.enums.NotificationType;
import com.example.trillo.exception.AccessDeniedException;
import com.example.trillo.exception.DuplicateResourceException;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.*;
import com.example.trillo.specification.CardSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;
    private final CardMemberRepository cardMemberRepository;
    private final CardLabelRepository cardLabelRepository;
    private final BoardListRepository boardListRepository;
    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;
    private final NotificationService notificationService;
    private final BoardService boardService;
    private final AuthService authService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public CardSummaryResponse createCard(String listId, CreateCardRequest request, User currentUser) {
        BoardList list = findListOrThrow(listId);
        boardService.requirePermission(list.getBoard(), currentUser, BoardPermission.CREATE_CARD);

        int maxPos = cardRepository.findMaxPositionByListId(listId);
        Card card = Card.builder()
                .list(list)
                .title(request.title())
                .description(request.description())
                .deadline(request.deadline())
                .position(maxPos + 1)
                .build();

        Card saved = cardRepository.save(card);
        logActivity(saved, currentUser, "created", "Card '" + saved.getTitle() + "' was created");
        broadcastBoardEvent(list.getBoard().getId(), "CARD_CREATED");

        return toCardSummaryResponse(saved);
    }

    @Transactional
    public CardResponse updateCard(String cardId, UpdateCardRequest request, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.EDIT_CARD);

        StringBuilder changes = new StringBuilder("Card updated: ");
        if (request.title() != null && !request.title().isBlank()) { changes.append("title, "); card.setTitle(request.title()); }
        card.setDescription(request.description());

        boolean deadlineOrReminderChanged = false;
        if (request.deadline() != null || card.getDeadline() != null) {
            if (request.deadline() == null ? card.getDeadline() != null : !request.deadline().equals(card.getDeadline())) {
                deadlineOrReminderChanged = true;
            }
            card.setDeadline(request.deadline());
        }
        if (request.reminder() != null) {
            if (!request.reminder().equalsIgnoreCase(card.getReminder())) {
                deadlineOrReminderChanged = true;
            }
            card.setReminder(request.reminder());
        }
        if (deadlineOrReminderChanged) {
            card.setReminderSent(false);
        }

        if (request.completed() != null) { card.setCompleted(request.completed()); changes.append(request.completed() ? "marked complete" : "marked incomplete"); }

        Card saved = cardRepository.save(card);
        logActivity(saved, currentUser, "updated", changes.toString().replaceAll(", $", ""));
        broadcastBoardEvent(card.getList().getBoard().getId(), "CARD_UPDATED");

        return toCardResponse(saved);
    }

    @Transactional
    public CardSummaryResponse toggleCompleted(String cardId, Boolean completed, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.EDIT_CARD);

        boolean newStatus = (completed != null) ? completed : !card.isCompleted();
        card.setCompleted(newStatus);

        Card saved = cardRepository.save(card);
        logActivity(saved, currentUser, "status_changed", newStatus ? "Card marked as completed" : "Card marked as incomplete");
        broadcastBoardEvent(card.getList().getBoard().getId(), "CARD_STATUS_UPDATED");

        return toCardSummaryResponse(saved);
    }

    @Transactional
    public void deleteCard(String cardId, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.DELETE_CARD);

        String boardId = card.getList().getBoard().getId();
        cardRepository.decrementPositionsAfter(card.getList().getId(), card.getPosition());
        cardRepository.delete(card);

        broadcastBoardEvent(boardId, "CARD_DELETED");
    }

    @Transactional
    public CardSummaryResponse moveCard(String cardId, MoveCardRequest request, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.MOVE_CARD);

        BoardList sourceList = card.getList();
        BoardList targetList = findListOrThrow(request.targetListId());

        String oldListTitle = sourceList.getTitle();
        String newListTitle = targetList.getTitle();

        // Shift positions in source list
        cardRepository.decrementPositionsAfter(sourceList.getId(), card.getPosition());

        // Shift positions in target list
        cardRepository.incrementPositionsFrom(targetList.getId(), request.targetPosition());

        // Update in-memory list collections and card fields
        if (sourceList.getCards() != null) {
            sourceList.getCards().removeIf(c -> c.getId().equals(cardId));
        }
        card.setList(targetList);
        card.setPosition(request.targetPosition());
        Card saved = cardRepository.save(card);
        if (targetList.getCards() != null && !targetList.getCards().contains(saved)) {
            targetList.getCards().add(saved);
        }

        logActivity(saved, currentUser, "moved",
                "Card moved from '" + oldListTitle + "' to '" + newListTitle + "'");
        broadcastBoardEvent(card.getList().getBoard().getId(), "CARD_MOVED");

        return toCardSummaryResponse(saved);
    }

    @Transactional
    public void reorderCards(String listId, ReorderRequest request, User currentUser) {
        BoardList list = findListOrThrow(listId);
        boardService.requirePermission(list.getBoard(), currentUser, BoardPermission.MOVE_CARD);

        List<Card> cardsToSave = new java.util.ArrayList<>();
        int pos = 0;
        for (String id : request.orderedIds()) {
            Card card = cardRepository.findById(id).orElse(null);
            if (card != null) {
                card.setPosition(pos++);
                cardsToSave.add(card);
            }
        }
        cardRepository.saveAll(cardsToSave);

        broadcastBoardEvent(list.getBoard().getId(), "CARDS_REORDERED");
    }

    @Transactional
    public CardResponse assignMember(String cardId, String userId, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.EDIT_CARD);

        if (cardMemberRepository.existsByCardIdAndUserId(cardId, userId)) {
            throw new DuplicateResourceException("User is already assigned to this card");
        }

        User assignee = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Verify assignee is board member
        boardService.requireMember(card.getList().getBoard(), assignee);

        CardMember cm = CardMember.builder()
                .card(card)
                .user(assignee)
                .build();
        card.getAssignedMembers().add(cm);
        cardMemberRepository.save(cm);

        logActivity(card, currentUser, "assigned", currentUser.getFullName() + " assigned " + assignee.getFullName());

        // Notify assignee (only if assigning another user)
        if (!assignee.getId().equals(currentUser.getId())) {
            notificationService.createNotification(
                    assignee,
                    NotificationType.CARD_ASSIGNED,
                    currentUser.getFullName() + " đã thêm bạn vào thẻ: " + card.getTitle(),
                    cardId,
                    "CARD",
                    card.getList().getBoard().getId(),
                    cardId
            );
        }

        broadcastBoardEvent(card.getList().getBoard().getId(), "CARD_UPDATED");
        return toCardResponse(cardRepository.save(card));
    }

    @Transactional
    public CardResponse unassignMember(String cardId, String userId, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.requirePermission(card.getList().getBoard(), currentUser, BoardPermission.EDIT_CARD);

        card.getAssignedMembers().removeIf(cm -> cm.getUser().getId().equals(userId));
        cardMemberRepository.deleteByCardIdAndUserId(cardId, userId);

        Card saved = cardRepository.save(card);
        logActivity(saved, currentUser, "unassigned", "Member removed from card");
        broadcastBoardEvent(saved.getList().getBoard().getId(), "CARD_UPDATED");
        return toCardResponse(saved);
    }

    @Transactional(readOnly = true)
    public CardResponse getCard(String cardId, User currentUser) {
        Card card = findCardOrThrow(cardId);
        boardService.checkAccess(card.getList().getBoard(), currentUser);
        return toCardResponse(card);
    }

    @Transactional(readOnly = true)
    public List<CardSummaryResponse> getCardsByList(String listId, User currentUser) {
        BoardList list = findListOrThrow(listId);
        boardService.checkAccess(list.getBoard(), currentUser);
        return cardRepository.findByListIdAndArchivedFalseOrderByPositionAsc(listId)
                .stream().map(this::toCardSummaryResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<CardSummaryResponse> getArchivedCards(String boardId, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.requirePermission(board, currentUser, BoardPermission.VIEW_ARCHIVE);
        return cardRepository.findByBoardIdAndArchivedTrue(boardId)
                .stream().map(this::toCardSummaryResponse).toList();
    }

    @Transactional
    public CardSummaryResponse archiveCard(String cardId, boolean archived, User currentUser) {
        Card card = findCardOrThrow(cardId);
        BoardPermission required = archived ? BoardPermission.ARCHIVE_ITEM : BoardPermission.RESTORE_ARCHIVE;
        boardService.requirePermission(card.getList().getBoard(), currentUser, required);

        card.setArchived(archived);
        Card saved = cardRepository.save(card);

        logActivity(saved, currentUser, archived ? "archived" : "unarchived",
                archived ? "Card archived" : "Card restored from archive");
        broadcastBoardEvent(card.getList().getBoard().getId(), "CARD_UPDATED");

        return toCardSummaryResponse(saved);
    }

    // Calendar view: cards with deadline in a date range
    @Transactional(readOnly = true)
    public List<CardSummaryResponse> getCardsForCalendar(String boardId, LocalDateTime from, LocalDateTime to, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.checkAccess(board, currentUser);
        return cardRepository.findByBoardAndDeadlineBetween(boardId, from, to)
                .stream().filter(c -> !c.isArchived()).map(this::toCardSummaryResponse).toList();
    }

    // Filter & Search
    @Transactional(readOnly = true)
    public List<CardSummaryResponse> filterCards(String boardId, List<String> labelIds, List<String> memberIds,
                                                  List<String> listIds, Boolean status, Boolean noDeadline,
                                                  LocalDateTime deadlineFrom, LocalDateTime deadlineTo,
                                                  String search, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);
        boardService.checkAccess(board, currentUser);

        Specification<Card> spec = CardSpecification.filterCards(
                boardId, labelIds, memberIds, listIds, status, noDeadline, deadlineFrom, deadlineTo, search
        );

        List<Card> cards = cardRepository.findAll(spec);
        return cards.stream().filter(c -> !c.isArchived()).map(this::toCardSummaryResponse).toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private void logActivity(Card card, User user, String action, String detail) {
        ActivityLog log = ActivityLog.builder()
                .card(card)
                .user(user)
                .action(action)
                .detail(detail)
                .build();
        activityLogRepository.save(log);
    }

    private void broadcastBoardEvent(String boardId, String event) {
        messagingTemplate.convertAndSend("/topic/board/" + boardId, event);
    }

    public Card findCardOrThrow(String cardId) {
        return cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card", cardId));
    }

    private BoardList findListOrThrow(String listId) {
        return boardListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("List", listId));
    }

    private CardSummaryResponse toCardSummaryResponse(Card card) {
        List<UserResponse> members = card.getAssignedMembers().stream()
                .map(cm -> authService.toUserResponse(cm.getUser())).toList();
        List<LabelResponse> labels = card.getLabels().stream()
                .map(cl -> new LabelResponse(cl.getLabel().getId(), cl.getLabel().getBoard().getId(),
                        cl.getLabel().getName(), cl.getLabel().getColor(), cl.getLabel().getCreatedAt()))
                .toList();
        int totalItems = card.getChecklists().stream().mapToInt(c -> c.getItems().size()).sum();
        int completedItems = card.getChecklists().stream()
                .mapToInt(c -> (int) c.getItems().stream().filter(ChecklistItem::isCompleted).count()).sum();

        List<ChecklistResponse> checklists = card.getChecklists().stream()
                .map(ChecklistResponse::from).toList();

        return new CardSummaryResponse(
                card.getId(), card.getList().getId(), card.getTitle(), card.getDescription(),
                card.getDeadline(), card.getReminder(), card.getPosition(),
                card.isCompleted(), card.isArchived(), members, labels,
                totalItems, completedItems, card.getComments().size(), card.getAttachments().size(), checklists,
                card.getCreatedAt(), card.getUpdatedAt()
        );
    }

    public CardResponse toCardResponse(Card card) {
        List<UserResponse> members = card.getAssignedMembers().stream()
                .map(cm -> authService.toUserResponse(cm.getUser())).toList();
        List<LabelResponse> labels = card.getLabels().stream()
                .map(cl -> new LabelResponse(cl.getLabel().getId(), cl.getLabel().getBoard().getId(),
                        cl.getLabel().getName(), cl.getLabel().getColor(), cl.getLabel().getCreatedAt()))
                .toList();
        List<ChecklistResponse> checklists = card.getChecklists().stream()
                .map(this::toChecklistResponse).toList();
        List<CommentResponse> comments = card.getComments().stream()
                .map(c -> new CommentResponse(c.getId(), authService.toUserResponse(c.getAuthor()),
                        c.getContent(), c.getCreatedAt(), c.getUpdatedAt()))
                .toList();
        List<AttachmentResponse> attachments = card.getAttachments().stream()
                .map(a -> new AttachmentResponse(a.getId(), authService.toUserResponse(a.getUploadedBy()),
                        a.getFileName(), a.getFileUrl(), a.getFileType(), a.getFileSize(), a.getCreatedAt()))
                .toList();
        List<ActivityLogResponse> logs = card.getActivityLogs().stream()
                .map(l -> new ActivityLogResponse(l.getId(), authService.toUserResponse(l.getUser()),
                        l.getAction(), l.getDetail(), l.getCreatedAt()))
                .toList();

        return new CardResponse(
                card.getId(), card.getList().getId(), card.getList().getTitle(),
                card.getList().getBoard().getId(), card.getTitle(), card.getDescription(),
                card.getDeadline(), card.getReminder(), card.getPosition(), card.isCompleted(), card.isArchived(),
                members, labels, checklists, comments, attachments, logs,
                card.getCreatedAt(), card.getUpdatedAt()
        );
    }

    private ChecklistResponse toChecklistResponse(Checklist c) {
        List<ChecklistItemResponse> items = c.getItems().stream()
                .map(i -> new ChecklistItemResponse(i.getId(), i.getContent(), i.isCompleted(), i.getPosition(), i.getCreatedAt()))
                .toList();
        long completed = items.stream().filter(ChecklistItemResponse::completed).count();
        return new ChecklistResponse(c.getId(), c.getTitle(), items, items.size(), (int) completed, c.getCreatedAt());
    }
}
