package com.equilibrium.notification;

import com.equilibrium.auth.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               NotificationPreferenceRepository preferenceRepository,
                               UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.preferenceRepository = preferenceRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationDtos.NotificationView> list(UUID userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toView)
                .toList();
    }

    @Transactional
    public void readAll(UUID userId) {
        notificationRepository.markAllRead(userId);
    }

    @Transactional
    public void read(UUID userId, UUID notificationId) {
        notificationRepository.markRead(notificationId, userId);
    }

    @Transactional(readOnly = true)
    public NotificationDtos.PreferencesView getPreferences(UUID userId) {
        NotificationPreference prefs = preferenceRepository.findByUserId(userId)
                .orElseGet(() -> defaultPreferences(userId));
        return new NotificationDtos.PreferencesView(prefs.isEmail(), prefs.isPush());
    }

    @Transactional
    public NotificationDtos.PreferencesView updatePreferences(UUID userId,
                                                              NotificationDtos.PreferencesRequest request) {
        NotificationPreference prefs = preferenceRepository.findByUserId(userId)
                .orElseGet(() -> defaultPreferences(userId));
        prefs.setEmail(request.email());
        prefs.setPush(request.push());
        preferenceRepository.save(prefs);
        return new NotificationDtos.PreferencesView(prefs.isEmail(), prefs.isPush());
    }

    @Transactional
    public void notify(UUID userId, NotificationType type, String text) {
        Notification notification = new Notification();
        notification.setUser(userRepository.getReferenceById(userId));
        notification.setType(type);
        notification.setText(text);
        notificationRepository.save(notification);
    }

    private NotificationDtos.NotificationView toView(Notification n) {
        return new NotificationDtos.NotificationView(
                n.getId(),
                n.getType().name().toLowerCase(),
                n.getText(),
                n.getCreatedAt().toString(),
                n.isUnread());
    }

    private NotificationPreference defaultPreferences(UUID userId) {
        NotificationPreference prefs = new NotificationPreference();
        prefs.setUserId(userId);
        prefs.setEmail(true);
        prefs.setPush(false);
        return prefs;
    }
}
