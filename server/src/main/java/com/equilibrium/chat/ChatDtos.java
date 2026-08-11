package com.equilibrium.chat;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class ChatDtos {
    private ChatDtos() {
    }

    public record ChatMessage(String role, String content) {
    }

    public record ChatRequest(@NotBlank String message, List<ChatMessage> history) {
    }
}
