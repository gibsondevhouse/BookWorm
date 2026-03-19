import type { ReleaseStatus } from "@prisma/client";

export class ReleaseMutationGuardError extends Error {
  readonly code = "RELEASE_NOT_DRAFT" as const;
  readonly releaseSlug: string;
  readonly releaseStatus: ReleaseStatus;

  constructor(input: { releaseSlug: string; releaseStatus: ReleaseStatus }) {
    super("Only draft releases can be modified");
    this.name = "ReleaseMutationGuardError";
    this.releaseSlug = input.releaseSlug;
    this.releaseStatus = input.releaseStatus;
  }
}