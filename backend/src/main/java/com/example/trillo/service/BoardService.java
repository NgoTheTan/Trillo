package com.example.trillo.service;

import com.example.trillo.dto.request.CreateBoardRequest;
import com.example.trillo.dto.request.InviteMemberRequest;
import com.example.trillo.dto.request.UpdateBoardRequest;
import com.example.trillo.dto.request.UpdateMemberPermissionsRequest;
import com.example.trillo.dto.response.*;
import com.example.trillo.entity.*;
import com.example.trillo.enums.BoardPermission;
import com.example.trillo.enums.BoardRole;
import com.example.trillo.enums.NotificationType;
import com.example.trillo.enums.Visibility;
import com.example.trillo.exception.AccessDeniedException;
import com.example.trillo.exception.DuplicateResourceException;
import com.example.trillo.exception.ResourceNotFoundException;
import com.example.trillo.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BoardService {

    /** Shared ObjectMapper instance — not injected to avoid bean resolution issues. */
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

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
        return boardRepository.findAllBoardsAccessibleByUser(currentUser.getId())
                .stream()
                .map(board -> toBoardSummaryResponse(board, currentUser))
                .toList();
    }

    // ── Actually: get all boards user is member of ────────────────────────────
    @Transactional(readOnly = true)
    public List<BoardSummaryResponse> getMyBoards(User currentUser, String search) {
        List<Board> boards = (search != null && !search.isBlank())
                ? boardRepository.findAllBoardsAccessibleByUserAndTitleContaining(currentUser.getId(), search.trim())
                : boardRepository.findAllBoardsAccessibleByUser(currentUser.getId());
        return boards.stream()
                .map(board -> toBoardSummaryResponse(board, currentUser))
                .toList();
    }

    // ── Get Public Boards ─────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<BoardSummaryResponse> getPublicBoards(User currentUser, String search) {
        List<Board> boards = (search != null && !search.isBlank())
                ? boardRepository.findByVisibilityAndTitleContaining(Visibility.PUBLIC, search.trim())
                : boardRepository.findByVisibilityOrderByCreatedAtDesc(Visibility.PUBLIC);
        return boards.stream()
                .map(board -> toBoardSummaryResponse(board, currentUser))
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

            // Add directly as MEMBER with no permissions (view-only by default)
            BoardMember member = BoardMember.builder()
                    .board(board)
                    .user(invitee)
                    .role(BoardRole.MEMBER)
                    .permissions("[]")
                    .build();
            boardMemberRepository.save(member);

            // Create notification for invitee
            notificationService.createNotification(
                    invitee,
                    NotificationType.BOARD_INVITE,
                    currentUser.getFullName() + " added you to board: " + board.getTitle(),
                    boardId,
                    "BOARD"
            );

            // Create notification for PM / Board owner (if different from currentUser and invitee)
            if (board.getOwner() != null && !board.getOwner().getId().equals(invitee.getId()) && !board.getOwner().getId().equals(currentUser.getId())) {
                notificationService.createNotification(
                        board.getOwner(),
                        NotificationType.MEMBER_JOINED,
                        invitee.getFullName() + " has joined your board: " + board.getTitle(),
                        boardId,
                        "BOARD"
                );
            }

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
                .permissions("[]")
                .build();
        boardMemberRepository.save(member);

        // Mark token as used
        invite.setUsed(true);
        inviteTokenRepository.save(invite);

        // Create notification for joining user
        notificationService.createNotification(
                currentUser,
                NotificationType.BOARD_INVITE,
                "You have joined board: " + board.getTitle(),
                board.getId(),
                "BOARD"
        );

        // Create notification for PM / Board Owner
        if (board.getOwner() != null && !board.getOwner().getId().equals(currentUser.getId())) {
            notificationService.createNotification(
                    board.getOwner(),
                    NotificationType.MEMBER_JOINED,
                    currentUser.getFullName() + " joined your board: " + board.getTitle(),
                    board.getId(),
                    "BOARD"
            );
        }

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

    // ── Update Member Permissions ─────────────────────────────────────────────
    @Transactional
    public BoardResponse.MemberResponse updateMemberPermissions(
            String boardId, String memberId,
            UpdateMemberPermissionsRequest request, User currentUser) {

        Board board = findBoardOrThrow(boardId);
        requireOwner(board, currentUser);

        BoardMember member = boardMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found: " + memberId));

        // Cannot change owner permissions
        if (member.getRole() == BoardRole.OWNER) {
            throw new AccessDeniedException("Cannot change permissions of the board owner");
        }

        String permissionsJson = serializePermissions(
                request.permissions() != null ? request.permissions() : Collections.emptyList()
        );
        member.setPermissions(permissionsJson);
        BoardMember saved = boardMemberRepository.save(member);

        messagingTemplate.convertAndSend("/topic/board/" + boardId, "MEMBER_PERMISSIONS_UPDATED");

        return new BoardResponse.MemberResponse(
                saved.getId(),
                authService.toUserResponse(saved.getUser()),
                saved.getRole(),
                deserializePermissions(saved.getPermissions()),
                saved.getJoinedAt()
        );
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

    /**
     * Checks that the user has the given permission on this board.
     * OWNER bypasses all permission checks automatically.
     * MEMBER must have the specific permission in their permissions list.
     */
    public void requirePermission(Board board, User user, BoardPermission permission) {
        BoardMember membership = boardMemberRepository
                .findByBoardIdAndUserId(board.getId(), user.getId())
                .orElseThrow(() -> new AccessDeniedException("You are not a member of this board"));

        // Owner always has all permissions
        if (membership.getRole() == BoardRole.OWNER) return;

        List<BoardPermission> granted = deserializePermissions(membership.getPermissions());
        if (!granted.contains(permission)) {
            throw new AccessDeniedException(
                    "You do not have permission to perform this action: " + permission.name()
            );
        }
    }

    public Board findBoardOrThrow(String boardId) {
        return boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board", boardId));
    }

    // ── Mapping ───────────────────────────────────────────────────────────────
    public BoardResponse toBoardResponse(Board board, User currentUser) {
        BoardRole role = null;
        List<BoardPermission> currentUserPermissions = Collections.emptyList();

        if (currentUser != null) {
            Optional<BoardMember> membershipOpt = boardMemberRepository
                    .findByBoardIdAndUserId(board.getId(), currentUser.getId());
            if (membershipOpt.isPresent()) {
                BoardMember bm = membershipOpt.get();
                role = bm.getRole();
                if (bm.getRole() == BoardRole.OWNER) {
                    // Owner has all permissions implicitly
                    currentUserPermissions = List.of(BoardPermission.values());
                } else {
                    currentUserPermissions = deserializePermissions(bm.getPermissions());
                }
            }
        }

        List<BoardResponse.MemberResponse> members = board.getMembers().stream()
                .map(bm -> new BoardResponse.MemberResponse(
                        bm.getId(),
                        authService.toUserResponse(bm.getUser()),
                        bm.getRole(),
                        bm.getRole() == BoardRole.OWNER
                                ? List.of(BoardPermission.values())
                                : deserializePermissions(bm.getPermissions()),
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
                role, currentUserPermissions, members, lists, labels,
                board.getCreatedAt(), board.getUpdatedAt()
        );
    }

    public BoardSummaryResponse toBoardSummaryResponse(Board board, User currentUser) {
        BoardRole role = null;
        if (currentUser != null) {
            if (board.getOwner() != null && board.getOwner().getId().equals(currentUser.getId())) {
                role = BoardRole.OWNER;
            } else {
                role = boardMemberRepository.findByBoardIdAndUserId(board.getId(), currentUser.getId())
                        .map(BoardMember::getRole)
                        .orElse(null);
            }
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
        List<String> cardIds = list.getCards() != null ? list.getCards().stream()
                .map(Card::getId)
                .toList() : List.of();

        return new ListResponse(
                list.getId(), list.getBoard().getId(), list.getTitle(),
                list.getPosition(), cardIds, list.getCreatedAt()
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
                card.getId(), card.getList().getId(), card.getTitle(), card.getDescription(),
                card.getDeadline(), card.getPosition(),
                card.isCompleted(), members, labels,
                totalItems, completedItems, card.getComments().size(), card.getCreatedAt()
        );
    }

    // ── Permission JSON helpers ───────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    public List<BoardPermission> deserializePermissions(String json) {
        if (json == null || json.isBlank() || json.equals("[]")) return Collections.emptyList();
        try {
            List<String> names = OBJECT_MAPPER.readValue(json, List.class);
            return names.stream()
                    .map(name -> {
                        try { return BoardPermission.valueOf(name); }
                        catch (IllegalArgumentException e) { return null; }
                    })
                    .filter(p -> p != null)
                    .toList();
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    public String serializePermissions(List<BoardPermission> permissions) {
        try {
            List<String> names = permissions.stream().map(Enum::name).toList();
            return OBJECT_MAPPER.writeValueAsString(names);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
