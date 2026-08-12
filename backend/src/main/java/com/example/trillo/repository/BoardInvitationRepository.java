package com.example.trillo.repository;

import com.example.trillo.entity.BoardInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BoardInvitationRepository extends JpaRepository<BoardInvitation, String> {

    Optional<BoardInvitation> findByBoardIdAndInviteeIdAndStatus(String boardId, String inviteeId, String status);

    Optional<BoardInvitation> findByBoardIdAndInviteeId(String boardId, String inviteeId);

    List<BoardInvitation> findByBoardIdAndStatus(String boardId, String status);

    List<BoardInvitation> findByInviteeIdAndStatus(String inviteeId, String status);

    boolean existsByBoardIdAndInviteeIdAndStatus(String boardId, String inviteeId, String status);
}
