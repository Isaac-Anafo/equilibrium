package com.equilibrium.chat;

import com.equilibrium.chat.ChatDtos.ChatMessage;
import com.equilibrium.chat.ChatDtos.ChatRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.http.HttpRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class ChatServiceTest {

    private static final String TEST_BASE_URL = "https://api.test.invalid/v1/chat/completions";

    private ChatService newService(boolean enabled, String apiKey, ChatContextService context) {
        return new ChatService(context, new ObjectMapper(), enabled, apiKey, "test-model", TEST_BASE_URL);
    }

    @Test
    void streamReportsNotConfiguredWithoutReachingContextOrApi() {
        ChatContextService context = mock(ChatContextService.class);
        ChatService service = newService(false, "", context);

        assertThatCode(() -> service.stream(UUID.randomUUID(), new ChatRequest("hi", List.of()), new SseEmitter()))
                .doesNotThrowAnyException();

        verifyNoInteractions(context);
    }

    @Test
    void messagesForPrependSystemPromptTrimHistoryAndFilterInvalidRoles() {
        ChatContextService context = mock(ChatContextService.class);
        ChatService service = newService(true, "key", context);

        List<ChatMessage> history = new ArrayList<>();
        for (int i = 0; i < 25; i++) {
            history.add(new ChatMessage("user", "m" + i));
        }
        history.set(10, new ChatMessage("hacker", "drop me"));

        List<Map<String, String>> messages = service.messagesFor(UUID.randomUUID(), new ChatRequest("final", history));

        assertThat(messages).hasSize(21);
        assertThat(messages.get(0).get("role")).isEqualTo("system");
        assertThat(messages.get(1).get("content")).isEqualTo("m5");
        assertThat(messages.get(messages.size() - 1).get("content")).isEqualTo("final");
        assertThat(messages).noneMatch(m -> "drop me".equals(m.get("content")));
    }

    @Test
    void messagesForAddsCurrentMessageAndToleratesNullHistory() {
        ChatService service = newService(true, "key", mock(ChatContextService.class));

        List<Map<String, String>> messages = service.messagesFor(UUID.randomUUID(), new ChatRequest("hi", null));

        assertThat(messages).hasSize(2);
        assertThat(messages.get(1).get("content")).isEqualTo("hi");
    }

    @Test
    void parseLineExtractsDeltaContent() {
        ChatService service = newService(true, "key", mock(ChatContextService.class));

        ChatService.Chunk chunk = service.parseLine(
                "data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"},\"finish_reason\":null}]}");

        assertThat(chunk.delta()).isEqualTo("Hello");
        assertThat(chunk.truncated()).isFalse();
        assertThat(chunk.done()).isFalse();
    }

    @Test
    void parseLineFlagsLengthFinishAsTruncated() {
        ChatService service = newService(true, "key", mock(ChatContextService.class));

        ChatService.Chunk chunk = service.parseLine(
                "data: {\"choices\":[{\"delta\":{\"content\":\"\"},\"finish_reason\":\"length\"}]}");

        assertThat(chunk.delta()).isEmpty();
        assertThat(chunk.truncated()).isTrue();
        assertThat(chunk.done()).isFalse();
    }

    @Test
    void parseLineRecognizesDoneMarker() {
        ChatService service = newService(true, "key", mock(ChatContextService.class));

        assertThat(service.parseLine("data: [DONE]").done()).isTrue();
        assertThat(service.parseLine("data: [DONE]").truncated()).isFalse();
    }

    @Test
    void parseLineIgnoresNonDataAndMalformedLines() {
        ChatService service = newService(true, "key", mock(ChatContextService.class));

        assertThat(service.parseLine(null).delta()).isNull();
        assertThat(service.parseLine(": keepalive comment").done()).isFalse();
        assertThat(service.parseLine("data: {not json").delta()).isNull();
        assertThat(service.parseLine("data: {not json").truncated()).isFalse();
    }

    @Test
    void buildRequestUsesConfiguredBaseUrlAndBearerAuth() {
        ChatService service = newService(true, "secret-key", mock(ChatContextService.class));

        HttpRequest request = service.buildRequest("{}");

        assertThat(request.uri().toString()).isEqualTo(TEST_BASE_URL);
        assertThat(request.headers().firstValue("Authorization")).contains("Bearer secret-key");
        assertThat(request.headers().firstValue("Content-Type")).contains("application/json");
    }
}