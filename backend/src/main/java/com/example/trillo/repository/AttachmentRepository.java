package com.example.trillo.repository;

import com.example.trillo.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, String> {

    List<Attachment> findByCardIdOrderByCreatedAtDesc(String cardId);
}
