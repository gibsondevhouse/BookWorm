import { type Role } from "@prisma/client";

export type SessionActor = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
};