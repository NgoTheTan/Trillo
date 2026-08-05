package com.example.trillo.repository;

import com.example.trillo.entity.InviteToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface InviteTokenRepository extends JpaRepository<InviteToken, String> {

    Optional<InviteToken> findByTokenAndUsedFalse(String token);

    @Modifying
    @Query("DELETE FROM InviteToken t WHERE t.expiresAt < :now")
    void deleteExpiredTokens(@Param("now") LocalDateTime now);

    boolean existsByEmailAndBoardIdAndUsedFalseAndExpiresAtAfter(
            String email, String boardId, LocalDateTime now);
}
