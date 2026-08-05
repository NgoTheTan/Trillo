package com.example.trillo.service;

import com.example.trillo.dto.request.CreateBoardRequest;
import com.example.trillo.dto.request.InviteMemberRequest;
import com.example.trillo.dto.request.UpdateBoardRequest;
import com.example.trillo.dto.response.*;
import com.example.trillo.entity.*;
import com.example.trillo.enums.BoardRole;
import com.example.trillo.enums.NotificationType;
import com.example.trillo.enums.Visibility;
import com.example.trillo.exception.AccessDeniedException;
import com.example.trillo.exception.DuplicateResourceException;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final UserRepository userRepository;
    private final InviteTokenRepository inviteTokenRepository;
    private final NotificationService notificationService;
    private final AuthService authService;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.invite.expiry-hours}")
    private long inviteExpiryHours;

    // ── Create Board ──────────────────────────────────────────────────────────
    @Transactional
    public BoardResponse createBoard(CreateBoardRequest request, User currentUser) {
        Board board = Board.builder()
                .title(request.title())
                .description(request.description())
                .visibility(request.visibility())
                .coverColor(request.coverColor())
                .owner(currentUser)
                .build();

        Board saved = boardRepository.save(board);

        // Creator automatically becomes OWNER in board_members
        BoardMember ownerMembership = BoardMember.builder()
                .board(saved)
                .user(currentUser)
                .role(BoardRole.OWNER)
                .build();
        boardMemberRepository.save(ownerMembership);

        return toBoardResponse(saved, currentUser);
    }

    // ── Get Board ─────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public BoardResponse getBoard(String boardId, User currentUser) {
        Board board = findBoardOrThrow(boardId);
        checkAccess(board, currentUser);
        return toBoardResponse(board, currentUser);
    }

    // ── Update Board ──────────────────────────────────────────────────────────
    @Transactional
    public BoardResponse updateBoard(String boardId, UpdateBoardRequest request, User currentUser) {
        Board board = findBoardOrThrow(boardId);
        requireOwner(board, currentUser);

        if (request.title() != null) board.setTitle(request.title());
        if (request.description() != null) board.setDescription(request.description());
        if (request.visibility() != null) board.setVisibility(request.visibility());
        if (request.coverColor() != null) board.setCoverColor(request.coverColor());

        Board saved = boardRepository.save(board);

        // Broadcast update to all board subscribers
        messagingTemplate.convertAndSend("/topic/board/" + boardId, "BOARD_UPDATED");

        return toBoardResponse(saved, currentUser);
    }

    // ── Delete Board ──────────────────────────────────────────────────────────
    @Transactional
    public void deleteBoard(String boardId, User currentUser) {
        Board board = findBoardOrThrow(boardId);
        requireOwner(board, currentUser);
        boardRepository.delete(board);
    }

    // ── Get All Boards for User ───────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<BoardSummaryResponse> getBoardsForUser(User currentUser) {
        return boardMemberRepository.findByBoardId(currentUser.getId())
                .stream()
                .map(bm -> toBoardSummaryResponse(bm.getBoard(), currentUser))
                .toList();
    }

    // ── Actually: get all boards user is member of ────────────────────────────
    @Transactional(readOnly = true)
    public List<BoardSummaryResponse> getMyBoards(User currentUser) {
        return boardRepository.findAllBoardsAccessibleByUser(currentUser.getId())
                .stream()
                .map(board -> toBoardSummaryResponse(board, currentUser))
                .toList();
    }

    // ── Get Public Boards ─────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<BoardSummaryResponse> getPublicBoards() {
        return boardRepository.findByVisibilityOrderByCreatedAtDesc(Visibility.PUBLIC)
                .stream()
                .map(board -> toBoardSummaryResponse(board, null))
                .toList();
    }

    // ── Invite Member ─────────────────────────────────────────────────────────
    @Transactional
    public InviteResponse inviteMember(String boardId, InviteMemberRequest request, User currentUser) {
        Board board = findBoardOrThrow(boardId);
        requireOwner(board, currentUser);

        String email = request.email().toLowerCase().trim();

        Optional<User> existingUser = userRepository.findByEmail(email);

        if (existingUser.isPresent()) {
            User invitee = existingUser.get();

            // Check already member
            if (boardMemberRepository.existsByBoardIdAndUserId(boardId, invitee.getId())) {
                throw new DuplicateResourceException("User is already a member of this board");
            }

            // Add directly as MEMBER
            BoardMember member = BoardMember.builder()
                    .board(board)
                    .user(invitee)
                    .role(BoardRole.MEMBER)
                    .build();
            boardMemberRepository.save(member);

            // Create notification
            notificationService.createNotification(
                    invitee,
                    NotificationType.BOARD_INVITE,
                    currentUser.getFullName() + " added you to board: " + board.getTitle(),
                    boardId,
                    "BOARD"
            );

            // Push WebSocket event
            messagingTemplate.convertAndSend("/topic/board/" + boardId, "MEMBER_ADDED");

            return new InviteResponse(true, "User added to board successfully", null);
        } else {
            // Check for existing pending invite
            if (inviteTokenRepository.existsByEmailAndBoardIdAndUsedFalseAndExpiresAtAfter(
                    email, boardId, LocalDateTime.now())) {
                throw new DuplicateResourceException("An active invite already exists for this email");
            }

            // Create invite token
            String token = UUID.randomUUID().toString();
            InviteToken inviteToken = InviteToken.builder()
                    .token(token)
                    .email(email)
                    .boardId(boardId)
                    .invitedByUserId(currentUser.getId())
                    .expiresAt(LocalDateTime.now().plusHours(inviteExpiryHours))
                    .build();
            inviteTokenRepository.save(inviteToken);

            String inviteUrl = frontendUrl + "/invite/" + token;

            return new InviteResponse(
                    false,
                    "User not found. Share this invite link with them:",
                    inviteUrl
            );
        }
    }

    // ── Accept Invite (called after user registers/logs in) ───────────────────
    @Transactional
    public BoardSummaryResponse acceptInvite(String token, User currentUser) {
        InviteToken invite = inviteTokenRepository.findByTokenAndUsedFalse(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired invite token"));

        if (invite.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Invite token has expired");
        }

        // Verify email matches if user has same email
        if (!currentUser.getEmail().equalsIgnoreCase(invite.getEmail())) {
            throw new AccessDeniedException("This invite was sent to " + invite.getEmail());
        }

        Board board = findBoardOrThrow(invite.getBoardId());

        if (boardMemberRepository.existsByBoardIdAndUserId(invite.getBoardId(), currentUser.getId())) {
            throw new DuplicateResourceException("You are already a member of this board");
        }

        BoardMember member = BoardMember.builder()
                .board(board)
                .user(currentUser)
                .role(BoardRole.MEMBER)
                .build();
        boardMemberRepository.save(member);

        // Mark token as used
        invite.setUsed(true);
        inviteTokenRepository.save(invite);

        messagingTemplate.convertAndSend("/topic/board/" + invite.getBoardId(), "MEMBER_ADDED");

        return toBoardSummaryResponse(board, currentUser);
    }

    // ── Remove Member ─────────────────────────────────────────────────────────
    @Transactional
    public void removeMember(String boardId, String userId, User currentUser) {
        Board board = findBoardOrThrow(boardId);
        requireOwner(board, currentUser);

        if (!boardMemberRepository.existsByBoardIdAndUserId(boardId, userId)) {
            throw new ResourceNotFoundException("Member not found in this board");
        }

        // Cannot remove owner
        if (board.getOwner().getId().equals(userId)) {
            throw new AccessDeniedException("Cannot remove the board owner");
        }

        boardMemberRepository.deleteByBoardIdAndUserId(boardId, userId);
        messagingTemplate.convertAndSend("/topic/board/" + boardId, "MEMBER_REMOVED");
    }

    // ── Access Helpers ────────────────────────────────────────────────────────
    public void checkAccess(Board board, User user) {
        if (board.getVisibility() == Visibility.PUBLIC) return;
        if (user == null) throw new AccessDeniedException("Authentication required");
        if (!boardMemberRepository.existsByBoardIdAndUserId(board.getId(), user.getId())) {
            throw new AccessDeniedException("You are not a member of this board");
        }
    }

    public void requireMember(Board board, User user) {
        if (!boardMemberRepository.existsByBoardIdAndUserId(board.getId(), user.getId())) {
            throw new AccessDeniedException("You are not a member of this board");
        }
    }

    public void requireOwner(Board board, User user) {
        Optional<BoardMember> membership = boardMemberRepository
                .findByBoardIdAndUserIdAndRole(board.getId(), user.getId(), BoardRole.OWNER);
        if (membership.isEmpty()) {
            throw new AccessDeniedException("Only board owners can perform this action");
        }
    }

    public Board findBoardOrThrow(String boardId) {
        return boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board", boardId));
    }

    // ── Mapping ───────────────────────────────────────────────────────────────
    public BoardResponse toBoardResponse(Board board, User currentUser) {
        BoardRole role = null;
        if (currentUser != null) {
            role = boardMemberRepository.findByBoardIdAndUserId(board.getId(), currentUser.getId())
                    .map(BoardMember::getRole)
                    .orElse(null);
        }

        List<BoardResponse.MemberResponse> members = board.getMembers().stream()
                .map(bm -> new BoardResponse.MemberResponse(
                        bm.getId(),
                        authService.toUserResponse(bm.getUser()),
                        bm.getRole(),
                        bm.getJoinedAt()
                )).toList();

        List<ListResponse> lists = board.getLists().stream()
                .map(this::toListResponse)
                .toList();

        List<LabelResponse> labels = board.getLabels().stream()
                .map(l -> new LabelResponse(l.getId(), board.getId(), l.getName(), l.getColor(), l.getCreatedAt()))
                .toList();

        return new BoardResponse(
                board.getId(), board.getTitle(), board.getDescription(),
                board.getVisibility(), board.getCoverColor(),
                authService.toUserResponse(board.getOwner()),
                role, members, lists, labels,
                board.getCreatedAt(), board.getUpdatedAt()
        );
    }

    public BoardSummaryResponse toBoardSummaryResponse(Board board, User currentUser) {
        BoardRole role = null;
        if (currentUser != null) {
            role = boardMemberRepository.findByBoardIdAndUserId(board.getId(), currentUser.getId())
                    .map(BoardMember::getRole)
                    .orElse(null);
        }

        int memberCount = (int) boardMemberRepository.countByBoardId(board.getId());
        int cardCount = board.getLists().stream()
                .mapToInt(list -> list.getCards().size())
                .sum();

        return new BoardSummaryResponse(
                board.getId(), board.getTitle(), board.getDescription(),
                board.getVisibility(), board.getCoverColor(),
                authService.toUserResponse(board.getOwner()),
                role, memberCount, cardCount, board.getCreatedAt()
        );
    }

    private ListResponse toListResponse(BoardList list) {
        List<CardSummaryResponse> cards = list.getCards().stream()
                .map(this::toCardSummaryResponse)
                .toList();

        return new ListResponse(
                list.getId(), list.getBoard().getId(), list.getTitle(),
                list.getPosition(), cards, list.getCreatedAt()
        );
    }

    private CardSummaryResponse toCardSummaryResponse(Card card) {
        List<UserResponse> members = card.getAssignedMembers().stream()
                .map(cm -> authService.toUserResponse(cm.getUser()))
                .toList();

        List<LabelResponse> labels = card.getLabels().stream()
                .map(cl -> new LabelResponse(
                        cl.getLabel().getId(), cl.getLabel().getBoard().getId(),
                        cl.getLabel().getName(), cl.getLabel().getColor(), cl.getLabel().getCreatedAt()))
                .toList();

        int totalItems = card.getChecklists().stream()
                .mapToInt(c -> c.getItems().size()).sum();
        int completedItems = card.getChecklists().stream()
                .mapToInt(c -> (int) c.getItems().stream().filter(ChecklistItem::isCompleted).count()).sum();

        return new CardSummaryResponse(
                card.getId(), card.getList().getId(), card.getTitle(),
                card.getDeadline(), card.getPriority(), card.getPosition(),
                card.isCompleted(), members, labels,
                totalItems, completedItems, card.getComments().size(), card.getCreatedAt()
        );
    }
}
