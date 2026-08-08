package com.equilibrium.notification;

import com.equilibrium.common.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationDtos.NotificationView> list() {
        return notificationService.list(SecurityUtils.currentUserId());
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void readAll() {
        notificationService.readAll(SecurityUtils.currentUserId());
    }

    @GetMapping("/preferences")
    public NotificationDtos.PreferencesView getPreferences() {
        return notificationService.getPreferences(SecurityUtils.currentUserId());
    }

    @PutMapping("/preferences")
    public NotificationDtos.PreferencesView updatePreferences(
            @Valid @RequestBody NotificationDtos.PreferencesRequest request) {
        UUID userId = SecurityUtils.currentUserId();
        return notificationService.updatePreferences(userId, request);
    }
}
