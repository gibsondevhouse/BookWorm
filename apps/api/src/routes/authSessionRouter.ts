import { Router } from "express";
import { z } from "zod";

import { authService } from "../services/authService.js";

const sessionCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const readSessionToken = (cookieHeader: string | undefined): string | null => {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();

    if (!trimmedCookie.startsWith(`${authService.sessionCookieName}=`)) {
      continue;
    }

    return decodeURIComponent(trimmedCookie.slice(authService.sessionCookieName.length + 1));
  }

  return null;
};

export const authSessionRouter = Router();

authSessionRouter.post("/", async (request, response) => {
  const parsedBody = sessionCredentialsSchema.safeParse(request.body);

  if (!parsedBody.success) {
    response.status(400).json({
      error: parsedBody.error.flatten()
    });
    return;
  }

  try {
    const session = await authService.createSession(parsedBody.data);

    response.cookie(authService.sessionCookieName, session.sessionToken, {
      expires: session.expiresAt,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    response.status(201).json({
      authenticated: true,
      actor: session.actor
    });
  } catch (error) {
    response.status(401).json({
      error: error instanceof Error ? error.message : "Unable to create session"
    });
  }
});

authSessionRouter.get("/", async (request, response) => {
  const sessionState = await authService.getSessionState(readSessionToken(request.headers.cookie));

  response.json(sessionState);
});

authSessionRouter.delete("/", async (request, response) => {
  await authService.deleteSession(readSessionToken(request.headers.cookie));

  response.clearCookie(authService.sessionCookieName, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  response.status(204).send();
});