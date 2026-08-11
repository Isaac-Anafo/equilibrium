package com.equilibrium.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String smtpHost;
    private final String from;

    public EmailService(JavaMailSender mailSender,
                        @Value("${spring.mail.host:}") String smtpHost,
                        @Value("${app.mail.from:no-reply@equilibrium.app}") String from) {
        this.mailSender = mailSender;
        this.smtpHost = smtpHost;
        this.from = from;
    }

    public void sendPasswordReset(String to, String resetUrl) {
        if (smtpHost == null || smtpHost.isBlank()) {
            log.warn("SMTP not configured (spring.mail.host is blank) - reset link not emailed. For {}: {}", to, resetUrl);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Reset your Equilibrium password");
        message.setText("""
                We received a request to reset your Equilibrium password.

                Open this link to choose a new password (valid for 30 minutes):

                %s

                If you didn't request this, you can safely ignore this email.
                """.formatted(resetUrl));
        try {
            mailSender.send(message);
            log.info("Password reset email sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {} (link: {})", to, resetUrl, e);
        }
    }
}
