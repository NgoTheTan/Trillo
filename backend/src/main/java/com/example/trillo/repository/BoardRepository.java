package com.example.trillo.repository;

import com.example.trillo.entity.Board;
import com.example.trillo.enums.Visibility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoardRepository extends JpaRepository<Board, String> {

    List<Board> findByOwnerIdOrderByCreatedAtDesc(String ownerId);

    List<Board> findByVisibilityOrderByCreatedAtDesc(Visibility visibility);

    @Query("SELECT b FROM Board b JOIN b.members m WHERE m.user.id = :userId ORDER BY b.createdAt DESC")
    List<Board> findBoardsByMemberId(@Param("userId") String userId);

    @Query("SELECT b FROM Board b JOIN b.members m WHERE m.user.id = :userId ORDER BY b.createdAt DESC")
    List<Board> findAllBoardsAccessibleByUser(@Param("userId") String userId);

    @Query("SELECT b FROM Board b JOIN b.members m WHERE m.user.id = :userId AND LOWER(b.title) LIKE LOWER(CONCAT('%', :search, '%')) ORDER BY b.createdAt DESC")
    List<Board> findAllBoardsAccessibleByUserAndTitleContaining(@Param("userId") String userId, @Param("search") String search);

    @Query("SELECT b FROM Board b WHERE b.visibility = :visibility AND LOWER(b.title) LIKE LOWER(CONCAT('%', :search, '%')) ORDER BY b.createdAt DESC")
    List<Board> findByVisibilityAndTitleContaining(@Param("visibility") Visibility visibility, @Param("search") String search);

    @Query("SELECT COUNT(b) FROM Board b WHERE b.owner.id = :ownerId")
    long countByOwnerId(@Param("ownerId") String ownerId);
}
