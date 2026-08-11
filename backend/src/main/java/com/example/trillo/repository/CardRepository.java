package com.example.trillo.repository;

import com.example.trillo.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CardRepository extends JpaRepository<Card, String>, JpaSpecificationExecutor<Card> {

    List<Card> findByListIdOrderByPositionAsc(String listId);

    List<Card> findByListIdAndArchivedFalseOrderByPositionAsc(String listId);

    @Query("SELECT c FROM Card c WHERE c.list.board.id = :boardId AND c.archived = true ORDER BY c.updatedAt DESC")
    List<Card> findByBoardIdAndArchivedTrue(@Param("boardId") String boardId);

    @Query("SELECT COALESCE(MAX(c.position), -1) FROM Card c WHERE c.list.id = :listId")
    int findMaxPositionByListId(@Param("listId") String listId);

    @Modifying
    @Query("UPDATE Card c SET c.position = c.position - 1 WHERE c.list.id = :listId AND c.position > :position")
    void decrementPositionsAfter(@Param("listId") String listId, @Param("position") int position);

    @Modifying
    @Query("UPDATE Card c SET c.position = c.position + 1 WHERE c.list.id = :listId AND c.position >= :position")
    void incrementPositionsFrom(@Param("listId") String listId, @Param("position") int position);

    // Cards with deadline approaching (for scheduler)
    @Query("SELECT c FROM Card c WHERE c.deadline BETWEEN :from AND :to AND c.completed = false")
    List<Card> findCardsWithDeadlineBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    // Cards by board (across all lists)
    @Query("SELECT c FROM Card c WHERE c.list.board.id = :boardId")
    List<Card> findAllByBoardId(@Param("boardId") String boardId);

    // Cards assigned to a specific user
    @Query("SELECT c FROM Card c JOIN c.assignedMembers m WHERE m.user.id = :userId")
    List<Card> findCardsByAssignedUserId(@Param("userId") String userId);

    // Count cards by board
    @Query("SELECT COUNT(c) FROM Card c WHERE c.list.board.id = :boardId")
    long countByBoardId(@Param("boardId") String boardId);

    // Count completed cards by board
    @Query("SELECT COUNT(c) FROM Card c WHERE c.list.board.id = :boardId AND c.completed = true")
    long countCompletedByBoardId(@Param("boardId") String boardId);

    // Dashboard: cards grouped by list
    @Query("SELECT c.list.title, COUNT(c) FROM Card c WHERE c.list.board.id = :boardId GROUP BY c.list.title")
    List<Object[]> countCardsByListInBoard(@Param("boardId") String boardId);

    // Dashboard: cards grouped by member
    @Query("SELECT m.user.fullName, COUNT(c) FROM Card c JOIN c.assignedMembers m WHERE c.list.board.id = :boardId GROUP BY m.user.id, m.user.fullName")
    List<Object[]> countCardsByMemberInBoard(@Param("boardId") String boardId);

    // Progress over time: cards created per day in a board
    @Query("SELECT CAST(c.createdAt AS date), COUNT(c) FROM Card c WHERE c.list.board.id = :boardId AND c.createdAt >= :since GROUP BY CAST(c.createdAt AS date) ORDER BY CAST(c.createdAt AS date)")
    List<Object[]> countCardsCreatedPerDay(@Param("boardId") String boardId, @Param("since") LocalDateTime since);

    // Filter cards by label
    @Query("SELECT DISTINCT c FROM Card c JOIN c.labels cl WHERE cl.label.id = :labelId")
    List<Card> findByLabelId(@Param("labelId") String labelId);

    // Search cards by title in a board
    @Query("SELECT c FROM Card c WHERE c.list.board.id = :boardId AND LOWER(c.title) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Card> searchByTitleInBoard(@Param("boardId") String boardId, @Param("q") String query);

    // Filter by deadline range in a board
    @Query("SELECT c FROM Card c WHERE c.list.board.id = :boardId AND c.deadline BETWEEN :from AND :to")
    List<Card> findByBoardAndDeadlineBetween(@Param("boardId") String boardId,
                                              @Param("from") LocalDateTime from,
                                              @Param("to") LocalDateTime to);
}
