import { type Role } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

type AuthUserRecord = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: Role;
};

type SessionActorRecord = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
};

export const authRepository = {
  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return prismaClient.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        passwordHash: true,
        role: true
      }
    });
  },

  async createUser(input: {
    email: string;
    displayName: string;
    passwordHash: string;
    role: Role;
  }): Promise<AuthUserRecord> {
    return prismaClient.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        role: input.role
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        passwordHash: true,
        role: true
      }
    });
  },

  async createSession(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await prismaClient.session.create({
      data: {
        userId: input.userId,
        token: input.tokenHash,
        expiresAt: input.expiresAt
      }
    });
  },

  async findSessionActorByTokenHash(tokenHash: string): Promise<SessionActorRecord | null> {
    const session = await prismaClient.session.findUnique({
      where: {
        token: tokenHash
      },
      select: {
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true
          }
        }
      }
    });

    if (!session || session.expiresAt <= new Date()) {
      return null;
    }

    return {
      userId: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      role: session.user.role
    };
  },

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    await prismaClient.session.deleteMany({
      where: {
        token: tokenHash
      }
    });
  }
};