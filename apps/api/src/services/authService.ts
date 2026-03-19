import { type Role } from "@prisma/client";

import { type SessionActor } from "../auth/sessionActor.js";
import { passwordHasher } from "../lib/passwordHasher.js";
import { sessionTokenManager } from "../lib/sessionTokenManager.js";
import { authRepository } from "../repositories/authRepository.js";

const sessionCookieName = "bookworm_session";
const sessionDurationMs = 1000 * 60 * 60 * 12;

type SessionState = {
  authenticated: boolean;
  actor: SessionActor | null;
};

type LoginResult = {
  actor: SessionActor;
  sessionToken: string;
  expiresAt: Date;
};

const hasRequiredRole = (role: Role, allowedRoles: Role[]): boolean => allowedRoles.includes(role);

export const authService = {
  sessionCookieName,

  async createSession(input: { email: string; password: string }): Promise<LoginResult> {
    const user = await authRepository.findUserByEmail(input.email);

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const passwordIsValid = await passwordHasher.verifyPassword(input.password, user.passwordHash);

    if (!passwordIsValid) {
      throw new Error("Invalid email or password");
    }

    const sessionToken = sessionTokenManager.createToken();
    const expiresAt = new Date(Date.now() + sessionDurationMs);

    await authRepository.createSession({
      userId: user.id,
      tokenHash: sessionTokenManager.hashToken(sessionToken),
      expiresAt
    });

    return {
      actor: {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      },
      sessionToken,
      expiresAt
    };
  },

  async getSessionState(sessionToken: string | null): Promise<SessionState> {
    if (!sessionToken) {
      return {
        authenticated: false,
        actor: null
      };
    }

    const actor = await authRepository.findSessionActorByTokenHash(
      sessionTokenManager.hashToken(sessionToken)
    );

    if (!actor) {
      return {
        authenticated: false,
        actor: null
      };
    }

    return {
      authenticated: true,
      actor
    };
  },

  async requireSessionActor(sessionToken: string | null, allowedRoles: Role[]): Promise<SessionActor> {
    const sessionState = await this.getSessionState(sessionToken);

    if (!sessionState.actor) {
      throw new Error("Authentication required");
    }

    if (!hasRequiredRole(sessionState.actor.role, allowedRoles)) {
      throw new Error("Insufficient role for this action");
    }

    return sessionState.actor;
  },

  async deleteSession(sessionToken: string | null): Promise<void> {
    if (!sessionToken) {
      return;
    }

    await authRepository.deleteSessionByTokenHash(sessionTokenManager.hashToken(sessionToken));
  }
};