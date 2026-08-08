package com.equilibrium.common;

import com.equilibrium.auth.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("dev")
public class DemoDataSeeder implements ApplicationRunner {

    private static final String DEMO_EMAIL = "demo@equilibrium.app";
    private static final String DEMO_PASSWORD = "demo1234";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoDataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        userRepository.findByEmail(DEMO_EMAIL).ifPresent(user -> {
            user.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
            userRepository.save(user);
        });
    }
}
