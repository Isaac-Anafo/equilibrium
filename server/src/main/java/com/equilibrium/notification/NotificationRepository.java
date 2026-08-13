package com.equilibrium.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Modifying
    @Query("update Notification n set n.unread = false where n.user.id = :userId and n.unread = true")
    int markAllRead(@Param("userId") UUID userId);

    @Modifying
    @Query("update Notification n set n.unread = false where n.id = :id and n.user.id = :userId and n.unread = true")
    int markRead(@Param("id") UUID id, @Param("userId") UUID userId);
}
