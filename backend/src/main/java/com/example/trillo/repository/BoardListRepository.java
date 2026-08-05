package com.example.trillo.repository;

import com.example.trillo.entity.BoardList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoardListRepository extends JpaRepository<BoardList, String> {

    List<BoardList> findByBoardIdOrderByPositionAsc(String boardId);

    @Query("SELECT COALESCE(MAX(l.position), -1) FROM BoardList l WHERE l.board.id = :boardId")
    int findMaxPositionByBoardId(@Param("boardId") String boardId);

    @Modifying
    @Query("UPDATE BoardList l SET l.position = l.position - 1 WHERE l.board.id = :boardId AND l.position > :position")
    void decrementPositionsAfter(@Param("boardId") String boardId, @Param("position") int position);
}
