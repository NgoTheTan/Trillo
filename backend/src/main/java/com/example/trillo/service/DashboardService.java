package com.example.trillo.service;

import com.example.trillo.dto.response.DashboardStatsResponse;
import com.example.trillo.entity.Board;
import com.example.trillo.entity.User;
import com.example.trillo.exception.AccessDeniedException;
import com.example.trillo.repository.BoardMemberRepository;
import com.example.trillo.repository.BoardRepository;
import com.example.trillo.repository.CardRepository;
import com.example.trillo.enums.BoardRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final CardRepository cardRepository;
    private final BoardService boardService;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboard(String boardId, User currentUser) {
        Board board = boardService.findBoardOrThrow(boardId);

        // Only OWNER can see dashboard
        boardMemberRepository.findByBoardIdAndUserIdAndRole(boardId, currentUser.getId(), BoardRole.OWNER)
                .orElseThrow(() -> new AccessDeniedException("Only board owners can view the dashboard"));

        long totalCards = cardRepository.countByBoardId(boardId);
        long completedCards = cardRepository.countCompletedByBoardId(boardId);
        long totalMembers = boardMemberRepository.countByBoardId(boardId);

        // Chart 1: Cards by List (pie/bar)
        List<DashboardStatsResponse.ChartDataPoint> cardsByList =
                cardRepository.countCardsByListInBoard(boardId).stream()
                        .map(row -> new DashboardStatsResponse.ChartDataPoint(
                                (String) row[0], ((Number) row[1]).longValue()))
                        .toList();

        // Chart 2: Cards by Member (bar)
        List<DashboardStatsResponse.ChartDataPoint> cardsByMember =
                cardRepository.countCardsByMemberInBoard(boardId).stream()
                        .map(row -> new DashboardStatsResponse.ChartDataPoint(
                                (String) row[0], ((Number) row[1]).longValue()))
                        .toList();

        // Chart 3: Progress over time (line) - last 30 days
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        List<DashboardStatsResponse.TimeSeriesPoint> progressOverTime =
                cardRepository.countCardsCreatedPerDay(boardId, since).stream()
                        .map(row -> new DashboardStatsResponse.TimeSeriesPoint(
                                row[0].toString(), ((Number) row[1]).longValue()))
                        .toList();

        double completionRate = totalCards > 0
                ? Math.round((completedCards * 100.0 / totalCards) * 10.0) / 10.0
                : 0.0;

        return new DashboardStatsResponse(
                1L, // totalBoards = this board
                totalCards,
                completedCards,
                totalMembers,
                cardsByList,
                cardsByMember,
                progressOverTime,
                completionRate
        );
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getGlobalDashboard(User currentUser) {
        List<Board> ownedBoards = boardRepository.findByOwnerIdOrderByCreatedAtDesc(currentUser.getId());

        long totalBoards = ownedBoards.size();
        long totalCards = 0;
        long completedCards = 0;

        for (Board board : ownedBoards) {
            totalCards += cardRepository.countByBoardId(board.getId());
            completedCards += cardRepository.countCompletedByBoardId(board.getId());
        }

        double completionRate = totalCards > 0
                ? Math.round((completedCards * 100.0 / totalCards) * 10.0) / 10.0
                : 0.0;

        return new DashboardStatsResponse(
                totalBoards, totalCards, completedCards, 0L,
                List.of(), List.of(), List.of(), completionRate
        );
    }
}
