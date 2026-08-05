package com.example.trillo.repository;

import com.example.trillo.entity.Label;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LabelRepository extends JpaRepository<Label, String> {

    List<Label> findByBoardId(String boardId);

    boolean existsByBoardIdAndName(String boardId, String name);
}
