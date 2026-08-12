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
    private final BoardInvitationRepository boardInvitationRepository;
    private final JoinRequestRepository joinRequestRepository;
    private final NotificationService notificationService;
    private final AuthService authService;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.invite.expiry-hours}")
    private long inviteExpiryHours;

    private void broadcastBoardUpdate(Board board) {
        if (board == null) return;
        String boardId = board.getId();

        // 1. Broadcast update to board topic (for anyone viewing BoardDetailPage)
        messagingTemplate.convertAndSend("/topic/board/" + boardId, "BOARD_UPDATED");

        // 2. Broadcast to owner and members' personal queues for real-time boards list updates
        if (board.getOwner() != null) {
            messagingTemplate.convertAndSendToUser(board.getOwner().getId(), "/queue/boards", "BOARD_UPDATED");
        }
        if (board.getMembers() != null) {
            for (BoardMember m : board.getMembers()) {
                if (m.getUser() != null) {
                    messagingTemplate.convertAndSendToUser(m.getUser().getId(), "/queue/boards", "BOARD_UPDATED");
                }
            }
        }

        // 3. Broadcast to public boards topic
        messagingTemplate.convertAndSend("/topic/public-boards", "BOARD_UPDATED");
    }

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

        broadcastBoardUpdate(saved);
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

        // Broadcast update to board topic and members' personal queues
        broadcastBoardUpdate(saved);

        return toBoardResponse(saved, currentUser);
    }

    @Transactional
    public BoardResponse updateBoardTitle(String boardId, com.example.trillo.dto.request.UpdateBoardTitleRequest request, User currentUser) {
        Board board = findBoardOrThrow(boardId);
        requireOwner(board, currentUser);

        board.setTitle(request.title());
        Board saved = boardRepository.save(board);

        // Broadcast update to board topic and members' personal queues
        broadcastBoardUpdate(saved);

        return toBoardResponse(saved, currentUser);
    }

    // ── Delete Board ──────────────────────────────────────────────────────────
    @Transactional
    public void deleteBoard(String boardId, User currentUser) {
        Board board = findBoardOrThrow(boardId);
        requireOwner(board, currentUser);
        broadcastBoardUpdate(board);
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

            // Cannot invite yourself
            if (invitee.getId().equals(currentUser.getId())) {
                throw new DuplicateResourceException("You cannot invite yourself");
            }

            // Check already member
            if (boardMemberRepository.existsByBoardIdAndUserId(boardId, invitee.getId())) {
                throw new DuplicateResourceException("User is already a member of this board");
            }

            // Check for existing invitation (pending or previous)
            Optional<BoardInvitation> existingInvOpt = boardInvitationRepository.findByBoardIdAndInviteeId(boardId, invitee.getId());
            BoardInvitation invitation;

            if (existingInvOpt.isPresent()) {
                invitation = existingInvOpt.get();
                if ("PENDING".equals(invitation.getStatus())) {
                    throw new DuplicateResourceException("An invitation is already pending for this user");
                }
                // Re-open previous invitation
                invitation.setStatus("PENDING");
                invitation.setInviter(currentUser);
                invitation.setRespondedAt(null);
            } else {
                invitation = BoardInvitation.builder()
                        .board(board)
                        .inviter(currentUser)
                        .invitee(invitee)
                        .status("PENDING")
                        .build();
            }

            BoardInvitation savedInvitation = boardInvitationRepository.save(invitation);

            // Notify invitee
            notificationService.createNotification(
                    invitee,
                    NotificationType.BOARD_INVITATION,
                    currentUser.getFullName() + " đã mời bạn tham gia bảng: " + board.getTitle(),
                    savedInvitation.getId(),
                    "INVITATION",
                    boardId,
                    null
            );

            return new InviteResponse(true, "Lời mời đã được gửi, đang chờ người dùng xác nhận", null);
        } else {
            // Check for existing pending invite token
            if (inviteTokenRepository.existsByEmailAndBoardIdAndUsedFalseAndExpiresAtAfter(
                    email, boardId, LocalDateTime.now())) {
                throw new DuplicateResourceException("An active invite already exists for this email");
            }

            // Create invite token (link-based)
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
                    "Người dùng chưa có tài khoản. Chia sẻ link mời này với họ:",
                    inviteUrl
            );
        }
    }

    // ── Accept Invite via Link — creates JoinRequest for owner approval ────────
    @Transactional
    public JoinRequestResponse acceptInvite(String token, User currentUser) {
        InviteToken invite = inviteTokenRepository.findByTokenAndUsedFalse(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired invite token"));

        if (invite.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Invite token has expired");
        }

        if (!currentUser.getEmail().equalsIgnoreCase(invite.getEmail())) {
            throw new AccessDeniedException("This invite was sent to " + invite.getEmail());
        }

        Board board = findBoardOrThrow(invite.getBoardId());

        if (boardMemberRepository.existsByBoardIdAndUserId(invite.getBoardId(), currentUser.getId())) {
            throw new DuplicateResourceException("You are already a member of this board");
        }

        // Check for existing join request
        Optional<JoinRequest> existingReqOpt = joinRequestRepository.findByBoardIdAndRequesterId(board.getId(), currentUser.getId());
        JoinRequest joinRequest;

        if (existingReqOpt.isPresent()) {
            joinRequest = existingReqOpt.get();
            if ("PENDING".equals(joinRequest.getStatus())) {
                throw new DuplicateResourceException("You already have a pending join request for this board");
            }
            joinRequest.setStatus("PENDING");
            joinRequest.setSource("LINK");
            joinRequest.setRespondedAt(null);
        } else {
            joinRequest = JoinRequest.builder()
                    .board(board)
                    .requester(currentUser)
                    .status("PENDING")
                    .source("LINK")
                    .build();
        }

        // Mark token as used
        invite.setUsed(true);
        inviteTokenRepository.save(invite);

        JoinRequest savedJoinRequest = joinRequestRepository.save(joinRequest);

        // Notify board owner
        if (board.getOwner() != null) {
            notificationService.createNotification(
                    board.getOwner(),
                    NotificationType.JOIN_REQUEST,
                    currentUser.getFullName() + " đã yêu cầu tham gia bảng: " + board.getTitle(),
                    savedJoinRequest.getId(),
                    "JOIN_REQUEST",
                    board.getId(),
                    null
            );
        }

        // Broadcast so InviteMemberModal updates join-requests tab in real-time
        messagingTemplate.convertAndSend("/topic/board/" + board.getId() + "/join-requests", "JOIN_REQUEST_CREATED");

        return JoinRequestResponse.from(joinRequest, authService.toUserResponse(currentUser));
    }

    // ── Remove Member ─────────────────────────────────────────────────────────
    @Transactional
    public void removeMember(String boardId, String userId, User currentUser) {
        Board board = findBoardOrThrow(boardId);
        requireOwner(board, currentUser);

        BoardMember targetMembership = boardMemberRepository.findByBoardIdAndUserId(boardId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found in this board"));

        // Cannot remove owner
        if (board.getOwner().getId().equals(userId)) {
            throw new AccessDeniedException("Cannot remove the board owner");
        }

        User removedUser = targetMembership.getUser();
        board.getMembers().remove(targetMembership);
        boardMemberRepository.delete(targetMembership);

        // Notify the removed user
        notificationService.createNotification(
                removedUser,
                NotificationType.MEMBER_REMOVED,
                "Bạn đã bị xóa khỏi bảng: " + board.getTitle(),
                boardId,
                "BOARD",
                boardId,
                null
        );

        // Push MEMBER_REMOVED to board topic and removed user's personal queue
        messagingTemplate.convertAndSend("/topic/board/" + boardId, "MEMBER_REMOVED:" + userId);
        messagingTemplate.convertAndSendToUser(userId, "/queue/boards", "MEMBER_REMOVED:" + boardId);
        broadcastBoardUpdate(board);
    }

    // ── Respond to Invitation (invitee accepts or declines) ──────────────────
    @Transactional
    public void respondToInvitation(String invitationId, boolean accept, User currentUser) {
        BoardInvitation invitation = boardInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        if (!invitation.getInvitee().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("This invitation is not for you");
        }

        if (!"PENDING".equals(invitation.getStatus())) {
            throw new IllegalArgumentException("This invitation has already been responded to");
        }

        Board board = invitation.getBoard();
        invitation.setStatus(accept ? "ACCEPTED" : "DECLINED");
        invitation.setRespondedAt(LocalDateTime.now());
        boardInvitationRepository.save(invitation);

        if (accept) {
            // Add to board as member
            if (!boardMemberRepository.existsByBoardIdAndUserId(board.getId(), currentUser.getId())) {
                BoardMember member = BoardMember.builder()
                        .board(board)
                        .user(currentUser)
                        .role(BoardRole.MEMBER)
                        .permissions("[]")
                        .build();
                boardMemberRepository.save(member);
            }

            // Notify inviter
            notificationService.createNotification(
                    invitation.getInviter(),
                    NotificationType.INVITATION_ACCEPTED,
                    currentUser.getFullName() + " đã chấp nhận lời mời tham gia bảng: " + board.getTitle(),
                    board.getId(),
                    "BOARD",
                    board.getId(),
                    null
            );

            messagingTemplate.convertAndSend("/topic/board/" + board.getId(), "MEMBER_ADDED");
            broadcastBoardUpdate(board);
        } else {
            // Notify inviter of decline
            notificationService.createNotification(
                    invitation.getInviter(),
                    NotificationType.INVITATION_DECLINED,
                    currentUser.getFullName() + " đã từ chối lời mời tham gia bảng: " + board.getTitle(),
                    board.getId(),
                    "BOARD",
                    board.getId(),
                    null
            );
        }
    }

    // ── Get pending invitations for current user ───────────────────────────────
    @Transactional(readOnly = true)
    public List<BoardInvitationResponse> getPendingInvitations(User currentUser) {
        return boardInvitationRepository.findByInviteeIdAndStatus(currentUser.getId(), "PENDING")
                .stream()
                .map(inv -> BoardInvitationResponse.from(
                        inv,
                        authService.toUserResponse(inv.getInviter()),
                        authService.toUserResponse(inv.getInvitee())
                ))
                .toList();
    }

    // ── Get join requests for a board (owner view) ────────────────────────────
    @Transactional(readOnly = true)
    public List<JoinRequestResponse> getJoinRequests(String boardId, User currentUser) {
        Board board = findBoardOrThrow(boardId);
        requireOwner(board, currentUser);
        return joinRequestRepository.findByBoardIdAndStatus(boardId, "PENDING")
                .stream()
                .map(req -> JoinRequestResponse.from(req, authService.toUserResponse(req.getRequester())))
                .toList();
    }

    // ── Approve Join Request ──────────────────────────────────────────────────
    @Transactional
    public void approveJoinRequest(String requestId, User currentUser) {
        JoinRequest req = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Join request not found"));

        Board board = req.getBoard();
        requireOwner(board, currentUser);

        req.setStatus("APPROVED");
        req.setRespondedAt(LocalDateTime.now());
        joinRequestRepository.save(req);

        User requester = req.getRequester();
        if (!boardMemberRepository.existsByBoardIdAndUserId(board.getId(), requester.getId())) {
            BoardMember member = BoardMember.builder()
                    .board(board)
                    .user(requester)
                    .role(BoardRole.MEMBER)
                    .permissions("[]")
                    .build();
            boardMemberRepository.save(member);
        }

        notificationService.createNotification(
                requester,
                NotificationType.INVITATION_ACCEPTED,
                "Yêu cầu tham gia bảng " + board.getTitle() + " đã được chấp nhận",
                board.getId(),
                "BOARD",
                board.getId(),
                null
        );

        messagingTemplate.convertAndSend("/topic/board/" + board.getId(), "MEMBER_ADDED");
        messagingTemplate.convertAndSend("/topic/board/" + board.getId() + "/join-requests", "JOIN_REQUEST_UPDATED");
        broadcastBoardUpdate(board);
    }

    // ── Reject Join Request ──────────────────────────────────────────────────
    @Transactional
    public void rejectJoinRequest(String requestId, User currentUser) {
        JoinRequest req = joinRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Join request not found"));

        Board board = req.getBoard();
        requireOwner(board, currentUser);

        req.setStatus("REJECTED");
        req.setRespondedAt(LocalDateTime.now());
        joinRequestRepository.save(req);

        notificationService.createNotification(
                req.getRequester(),
                NotificationType.INVITATION_DECLINED,
                "Yêu cầu tham gia bảng " + board.getTitle() + " đã bị từ chối",
                board.getId(),
                "BOARD",
                board.getId(),
                null
        );

        messagingTemplate.convertAndSend("/topic/board/" + board.getId() + "/join-requests", "JOIN_REQUEST_UPDATED");
    }

    // ── Create Join Request (public board) ────────────────────────────────────
    @Transactional
    public JoinRequestResponse createJoinRequest(String boardId, User currentUser) {
        Board board = findBoardOrThrow(boardId);

        if (board.getVisibility() != Visibility.PUBLIC) {
            throw new AccessDeniedException("You can only request to join public boards this way");
        }

        if (boardMemberRepository.existsByBoardIdAndUserId(boardId, currentUser.getId())) {
            throw new DuplicateResourceException("You are already a member of this board");
        }

        Optional<JoinRequest> existingReqOpt = joinRequestRepository.findByBoardIdAndRequesterId(boardId, currentUser.getId());
        JoinRequest joinRequest;

        if (existingReqOpt.isPresent()) {
            joinRequest = existingReqOpt.get();
            if ("PENDING".equals(joinRequest.getStatus())) {
                throw new DuplicateResourceException("You already have a pending join request");
            }
            joinRequest.setStatus("PENDING");
            joinRequest.setSource("PUBLIC");
            joinRequest.setRespondedAt(null);
        } else {
            joinRequest = JoinRequest.builder()
                    .board(board)
                    .requester(currentUser)
                    .status("PENDING")
                    .source("PUBLIC")
                    .build();
        }

        JoinRequest savedJoinRequest = joinRequestRepository.save(joinRequest);

        // Notify board owner
        if (board.getOwner() != null) {
            notificationService.createNotification(
                    board.getOwner(),
                    NotificationType.JOIN_REQUEST,
                    currentUser.getFullName() + " đã yêu cầu tham gia bảng: " + board.getTitle(),
                    savedJoinRequest.getId(),
                    "JOIN_REQUEST",
                    boardId,
                    null
            );
        }

        messagingTemplate.convertAndSend("/topic/board/" + boardId + "/join-requests", "JOIN_REQUEST_CREATED");

        return JoinRequestResponse.from(savedJoinRequest, authService.toUserResponse(currentUser));
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
        broadcastBoardUpdate(board);

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
        boolean starred = false;

        if (currentUser != null) {
            Optional<BoardMember> membershipOpt = boardMemberRepository
                    .findByBoardIdAndUserId(board.getId(), currentUser.getId());
            if (membershipOpt.isPresent()) {
                BoardMember bm = membershipOpt.get();
                role = bm.getRole();
                starred = bm.isStarred();
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
                role, currentUserPermissions, starred, members, lists, labels,
                board.getCreatedAt(), board.getUpdatedAt()
        );
    }

    public BoardSummaryResponse toBoardSummaryResponse(Board board, User currentUser) {
        BoardRole role = null;
        boolean starred = false;
        if (currentUser != null) {
            Optional<BoardMember> membershipOpt = boardMemberRepository
                    .findByBoardIdAndUserId(board.getId(), currentUser.getId());
            if (membershipOpt.isPresent()) {
                BoardMember bm = membershipOpt.get();
                role = bm.getRole();
                starred = bm.isStarred();
            }
        }

        List<BoardMember> members = boardMemberRepository.findByBoardId(board.getId());
        int memberCount = members.size();
        List<String> memberUserIds = members.stream()
                .map(bm -> bm.getUser().getId())
                .toList();

        int cardCount = board.getLists().stream()
                .mapToInt(list -> list.getCards().size())
                .sum();

        return new BoardSummaryResponse(
                board.getId(), board.getTitle(), board.getDescription(),
                board.getVisibility(), board.getCoverColor(),
                authService.toUserResponse(board.getOwner()),
                role, memberCount, cardCount, starred, memberUserIds, board.getCreatedAt()
        );
    }

    // ── Toggle Star ───────────────────────────────────────────────────────────
    @Transactional
    public boolean toggleStar(String boardId, User currentUser) {
        BoardMember membership = boardMemberRepository
                .findByBoardIdAndUserId(boardId, currentUser.getId())
                .orElseThrow(() -> new AccessDeniedException("You are not a member of this board"));
        boolean newStarred = !membership.isStarred();
        membership.setStarred(newStarred);
        boardMemberRepository.save(membership);
        return newStarred;
    }

    // ── Get Starred Boards ────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<BoardSummaryResponse> getStarredBoards(User currentUser) {
        return boardMemberRepository.findByUserIdAndStarredTrue(currentUser.getId())
                .stream()
                .map(bm -> toBoardSummaryResponse(bm.getBoard(), currentUser))
                .toList();
    }

    private ListResponse toListResponse(BoardList list) {
        List<String> cardIds = list.getCards() != null ? list.getCards().stream()
                .map(Card::getId)
                .toList() : List.of();

        return new ListResponse(
                list.getId(), list.getBoard().getId(), list.getTitle(),
                list.getPosition(), list.isArchived(), cardIds, list.getCreatedAt()
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
