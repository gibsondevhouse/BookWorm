import type { ReleaseStatus } from "@prisma/client";

export type ReleaseActivationGuardCode = "RELEASE_NOT_DRAFT" | "RELEASE_EMPTY";

export class ReleaseActivationGuardError extends Error {
  readonly code: ReleaseActivationGuardCode;
  readonly releaseSlug: string;
  readonly releaseStatus: ReleaseStatus | undefined;

  constructor(input: {
    code: ReleaseActivationGuardCode;
    releaseSlug: string;
    message: string;
    releaseStatus?: ReleaseStatus;
  }) {
    super(input.message);
    this.name = "ReleaseActivationGuardError";
    this.code = input.code;
    this.releaseSlug = input.releaseSlug;
    this.releaseStatus = input.releaseStatus;
  }
}