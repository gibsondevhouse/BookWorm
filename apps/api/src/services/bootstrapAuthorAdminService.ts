import { passwordHasher } from "../lib/passwordHasher.js";
import { authRepository } from "../repositories/authRepository.js";

const minimumPasswordLength = 8;

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const bootstrapAuthorAdminService = {
  async createAuthorAdmin(input: {
    email: string;
    displayName: string;
    password: string;
  }): Promise<{
    id: string;
    email: string;
    displayName: string;
    role: "AUTHOR_ADMIN";
  }> {
    const email = normalizeEmail(input.email);
    const displayName = input.displayName.trim();

    if (!email) {
      throw new Error("Email is required");
    }

    if (!displayName) {
      throw new Error("Display name is required");
    }

    if (input.password.length < minimumPasswordLength) {
      throw new Error(`Password must be at least ${minimumPasswordLength} characters`);
    }

    const existingUser = await authRepository.findUserByEmail(email);

    if (existingUser) {
      throw new Error(`User already exists for email ${email}`);
    }

    const passwordHash = await passwordHasher.hashPassword(input.password);
    const user = await authRepository.createUser({
      email,
      displayName,
      passwordHash,
      role: "AUTHOR_ADMIN"
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: "AUTHOR_ADMIN"
    };
  }
};