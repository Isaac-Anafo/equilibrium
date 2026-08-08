package com.equilibrium.notification;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public final class NotificationDtos {
    private NotificationDtos() {
    }

    public record NotificationView(UUID id, String type, String text, String time, boolean unread) {
    }

    public record PreferencesView(boolean email, boolean push) {
    }

    public record PreferencesRequest(@NotNull Boolean email, @NotNull Boolean push) {
    }
}
