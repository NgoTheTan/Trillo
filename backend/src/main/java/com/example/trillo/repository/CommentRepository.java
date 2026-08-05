package com.example.trillo.repository;

import com.example.trillo.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, String> {

    List<Comment> findByCardIdOrderByCreatedAtDesc(String cardId);
}
