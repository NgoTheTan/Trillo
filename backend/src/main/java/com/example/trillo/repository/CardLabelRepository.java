package com.example.trillo.repository;

import com.example.trillo.entity.CardLabel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardLabelRepository extends JpaRepository<CardLabel, String> {

    List<CardLabel> findByCardId(String cardId);

    Optional<CardLabel> findByCardIdAndLabelId(String cardId, String labelId);

    boolean existsByCardIdAndLabelId(String cardId, String labelId);

    void deleteByCardIdAndLabelId(String cardId, String labelId);
}
