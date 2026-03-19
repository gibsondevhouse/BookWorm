import { createHmac, randomBytes } from "node:crypto";

import { env } from "../config/env.js";

export const sessionTokenManager = {
  createToken(): string {
    return randomBytes(32).toString("base64url");
  },

  hashToken(token: string): string {
    return createHmac("sha256", env.sessionSecret).update(token).digest("hex");
  }
};