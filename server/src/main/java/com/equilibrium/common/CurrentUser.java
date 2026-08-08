package com.equilibrium.common;

import java.util.UUID;

public record CurrentUser(UUID id, String email) {
}
