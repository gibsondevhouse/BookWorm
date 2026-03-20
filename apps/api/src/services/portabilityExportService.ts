import { jsonPortabilitySerializer } from "../lib/portability/jsonPortabilitySerializer.js";
import { markdownPortabilitySerializer } from "../lib/portability/markdownPortabilitySerializer.js";
import { portabilityExportRepository } from "../repositories/portabilityExportRepository.js";

export const portabilityExportService = {
  async prepareExport(input: {
    scope: "current" | "release";
    format: "json" | "markdown";
    releaseSlug?: string;
    exportedAt?: Date;
  }): Promise<{
    manifest: {
      schemaVersion: 1;
      format: "json" | "markdown";
      scope: "current" | "release";
      exportedAt: string;
      release?: {
        id: string;
        slug: string;
        name: string;
        status: "DRAFT" | "ACTIVE" | "ARCHIVED";
        createdAt: string;
        activatedAt: string | null;
      };
      counts: {
        entities: number;
        manuscripts: number;
        relationships: number;
        releases: number;
      };
    };
    files: Array<{
      path: string;
      content: string;
    }>;
  }> {
    const exportedAt = input.exportedAt ?? new Date();

    if (input.scope === "current") {
      const snapshot = await portabilityExportRepository.getCurrentSnapshot();

      return (input.format === "json" ? jsonPortabilitySerializer : markdownPortabilitySerializer).serialize({
        scope: "current",
        exportedAt,
        entities: snapshot.entities,
        manuscripts: snapshot.manuscripts,
        relationships: snapshot.relationships,
        governance: snapshot.governance
      });
    }

    if (!input.releaseSlug) {
      throw new Error("--release-slug is required when --scope=release");
    }

    const snapshot = await portabilityExportRepository.getReleaseSnapshot(input.releaseSlug);

    if (!snapshot) {
      throw new Error(`Release not found for slug ${input.releaseSlug}`);
    }

    return (input.format === "json" ? jsonPortabilitySerializer : markdownPortabilitySerializer).serialize({
      scope: "release",
      exportedAt,
      entities: snapshot.entities,
      manuscripts: snapshot.manuscripts,
      relationships: snapshot.relationships,
      governance: snapshot.governance,
      release: snapshot.release
    });
  }
};