import { type Role } from "@prisma/client";
import { type Request, type RequestHandler } from "express";

import { authService } from "../services/authService.js";

const readCookieValue = (request: Request, cookieName: string): string | null => {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();

    if (!trimmedCookie.startsWith(`${cookieName}=`)) {
      continue;
    }

    const cookieValue = trimmedCookie.slice(cookieName.length + 1);

    return cookieValue.length > 0 ? decodeURIComponent(cookieValue) : null;
  }

  return null;
};

export const requireAuthenticatedActor = (allowedRoles: Role[]): RequestHandler => {
  return async (request, response, next) => {
    try {
      const sessionToken = readCookieValue(request, authService.sessionCookieName);
      const actor = await authService.requireSessionActor(sessionToken, allowedRoles);

      response.locals.actor = actor;
      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication required";
      const statusCode = errorMessage === "Authentication required" ? 401 : 403;

      response.clearCookie(authService.sessionCookieName, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });
      response.status(statusCode).json({
        error: errorMessage
      });
    }
  };
};