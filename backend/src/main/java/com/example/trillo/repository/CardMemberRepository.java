package com.example.trillo.repository;

import com.example.trillo.entity.CardMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardMemberRepository extends JpaRepository<CardMember, String> {

    List<CardMember> findByCardId(String cardId);

    Optional<CardMember> findByCardIdAndUserId(String cardId, String userId);

    boolean existsByCardIdAndUserId(String cardId, String userId);

    void deleteByCardIdAndUserId(String cardId, String userId);
}
