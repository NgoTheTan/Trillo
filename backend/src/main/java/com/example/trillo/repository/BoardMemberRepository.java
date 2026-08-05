package com.example.trillo.repository;

import com.example.trillo.entity.BoardMember;
import com.example.trillo.enums.BoardRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BoardMemberRepository extends JpaRepository<BoardMember, String> {

    Optional<BoardMember> findByBoardIdAndUserId(String boardId, String userId);

    List<BoardMember> findByBoardId(String boardId);

    boolean existsByBoardIdAndUserId(String boardId, String userId);

    Optional<BoardMember> findByBoardIdAndUserIdAndRole(String boardId, String userId, BoardRole role);

    void deleteByBoardIdAndUserId(String boardId, String userId);

    long countByBoardId(String boardId);
}
