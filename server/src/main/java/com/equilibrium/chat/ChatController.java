package com.equilibrium.chat;

import com.equilibrium.common.SecurityUtils;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final ChatService chatService;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@Valid @RequestBody ChatDtos.ChatRequest request) {
        UUID userId = SecurityUtils.currentUserId();
        SseEmitter emitter = new SseEmitter(180_000L);
        executor.execute(() -> {
            try {
                chatService.stream(userId, request, emitter);
            } catch (Exception e) {
                log.error("Chat stream failed for user {}", userId, e);
                try {
                    emitter.send(SseEmitter.event().data(
                            Map.of("error", "Something went wrong generating a response. Please try again."),
                            MediaType.APPLICATION_JSON));
                    emitter.complete();
                } catch (Exception ignored) {
                    emitter.completeWithError(e);
                }
            }
        });
        return emitter;
    }
}
