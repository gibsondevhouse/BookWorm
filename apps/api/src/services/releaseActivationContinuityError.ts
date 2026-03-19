export class ReleaseActivationContinuityError extends Error {
  readonly continuityStatus: {
    releaseSlug: string;
    blockingIssueCount: number;
    issues: Array<{
      id: string;
      ruleCode: string;
      status: string;
      severity: string;
      title: string;
    }>;
  };

  constructor(continuityStatus: ReleaseActivationContinuityError["continuityStatus"]) {
    super("Release cannot be activated while blocking continuity issues are open");
    this.name = "ReleaseActivationContinuityError";
    this.continuityStatus = continuityStatus;
  }
}