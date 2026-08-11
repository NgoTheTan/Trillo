package com.example.trillo.specification;

import com.example.trillo.entity.Card;
import com.example.trillo.entity.CardLabel;
import com.example.trillo.entity.CardMember;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class CardSpecification {

    public static Specification<Card> filterCards(
            String boardId,
            List<String> labelIds,
            List<String> memberIds,
            List<String> listIds,
            Boolean status,
            Boolean noDeadline,
            LocalDateTime deadlineFrom,
            LocalDateTime deadlineTo,
            String search
    ) {
        return (root, query, cb) -> {
            query.distinct(true);
            List<Predicate> predicates = new ArrayList<>();

            // 1. Board ID check
            predicates.add(cb.equal(root.get("list").get("board").get("id"), boardId));

            // 2. Keyword search (in title or description)
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate titleLike = cb.like(cb.lower(root.get("title")), pattern);
                Predicate descLike = cb.like(cb.lower(root.get("description")), pattern);
                predicates.add(cb.or(titleLike, descLike));
            }

            // 3. Filter by Columns / List IDs
            if (listIds != null && !listIds.isEmpty()) {
                predicates.add(root.get("list").get("id").in(listIds));
            }

            // 4. Filter by Status (completed vs pending)
            if (status != null) {
                predicates.add(cb.equal(root.get("completed"), status));
            }

            // 5. Filter by Labels (labelIds)
            if (labelIds != null && !labelIds.isEmpty()) {
                Join<Card, CardLabel> labelJoin = root.join("labels", JoinType.INNER);
                predicates.add(labelJoin.get("label").get("id").in(labelIds));
            }

            // 6. Filter by Members (memberIds)
            if (memberIds != null && !memberIds.isEmpty()) {
                Join<Card, CardMember> memberJoin = root.join("assignedMembers", JoinType.INNER);
                predicates.add(memberJoin.get("user").get("id").in(memberIds));
            }

            // 7. Filter by Deadline
            if (Boolean.TRUE.equals(noDeadline)) {
                predicates.add(cb.isNull(root.get("deadline")));
            } else {
                if (deadlineFrom != null) {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("deadline"), deadlineFrom));
                }
                if (deadlineTo != null) {
                    predicates.add(cb.lessThanOrEqualTo(root.get("deadline"), deadlineTo));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
