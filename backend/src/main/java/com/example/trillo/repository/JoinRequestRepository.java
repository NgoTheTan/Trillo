package com.example.trillo.repository;

import com.example.trillo.entity.JoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JoinRequestRepository extends JpaRepository<JoinRequest, String> {

    List<JoinRequest> findByBoardIdAndStatus(String boardId, String status);

    Optional<JoinRequest> findByBoardIdAndRequesterId(String boardId, String requesterId);

    boolean existsByBoardIdAndRequesterIdAndStatus(String boardId, String requesterId, String status);
}
