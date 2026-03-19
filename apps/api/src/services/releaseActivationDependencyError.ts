import type { ReleaseDependencyStatus } from "../repositories/releaseDependencyRepository.js";

export class ReleaseActivationDependencyError extends Error {
  readonly dependencyStatus: ReleaseDependencyStatus;

  constructor(dependencyStatus: ReleaseDependencyStatus) {
    super("Release cannot be activated while required dependencies are missing");
    this.name = "ReleaseActivationDependencyError";
    this.dependencyStatus = dependencyStatus;
  }
}