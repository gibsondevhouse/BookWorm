import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

import { relationshipRepository } from "../apps/api/src/repositories/relationshipRepository.js";
import { seedPhase0 } from "./seedPhase0.js";
import { phase0FixtureConfig } from "./phase0FixtureConfig.js";

config({ path: new URL("../.env", import.meta.url).pathname });

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";

type HealthResponse = {
  status: string;
  dependencies?: {
    database?: string;
  };
};

type DraftResponse = {
  revisionId: string;
  version: number;
  summary: string;
};

type PublicCharacterResponse = {
  releaseSlug: string;
  characterSlug: string;
  summary: string;
  version: number;
};

type PublicFactionResponse = {
  releaseSlug: string;
  factionSlug: string;
  summary: string;
  version: number;
};

type PublicRelationshipResponse = {
  releaseSlug: string;
  relationType: string;
  sourceEntitySlug: string;
  targetEntitySlug: string;
  version: number;
  state: string;
};

type PublicDiscoveryResponse = {
  releaseSlug: string | null;
  items: Array<{
    slug: string;
    name: string;
    version: number;
  }>;
};

type ReleaseValidationResponse = {
  releaseSlug: string;
  isReady: boolean;
  summary: {
    dependencyCheckCount: number;
    blockingFailureCount: number;
  };
  failures: Array<{
    code: string;
    dependencyKey: string;
  }>;
};

type ReleaseReviewResponse = {
  release: {
    slug: string;
    status: string;
  };
  validation: ReleaseValidationResponse;
  relationshipEntries: Array<{
    dependencyState: string;
    blockingDependencies: Array<{
      code: string;
      dependencyKey: string;
    }>;
  }>;
};

type ConflictResponse = {
  error: string;
  code?: string;
};

const prismaClient = new PrismaClient();

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
};

const createSessionCookie = async (): Promise<string> => {
  const response = await fetch(`${apiBaseUrl}/auth/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: phase0FixtureConfig.authorAdmin.email,
      password: phase0FixtureConfig.authorAdmin.password
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to create verification session: ${response.status} ${errorText}`);
  }

  const sessionCookie = response.headers.get("set-cookie");

  if (!sessionCookie) {
    throw new Error("Verification session did not return a session cookie");
  }

  const cookieValue = sessionCookie.split(";")[0];

  if (!cookieValue) {
    throw new Error("Verification session cookie header was empty");
  }

  return cookieValue;
};

const showUsage = (): void => {
  console.log(`Phase 1 verification script

Requirements:
- PostgreSQL is running and DATABASE_URL is valid for the API
- migrations have been applied with pnpm db:migrate
- the API is running, by default at http://localhost:4000

Optional environment variables:
- API_BASE_URL
`);
};

const run = async (): Promise<void> => {
  if (process.argv.includes("--help")) {
    showUsage();
    return;
  }

  await seedPhase0();

  const verifyReleaseSlug = `phase-1-verify-${Date.now()}`;
  const emptyReleaseSlug = `${verifyReleaseSlug}-empty`;
  const updatedFactionSummary = `A revised guild charter published at ${new Date().toISOString()}.`;
  const updatedRelationshipNote = `Captain Mirelle Vale verification relationship update at ${new Date().toISOString()}.`;
  const sessionCookie = await createSessionCookie();

  const health = await ensureOk<HealthResponse>(await fetch(`${apiBaseUrl}/health`));

  if (health.status !== "ok" || health.dependencies?.database !== "reachable") {
    throw new Error("API health check did not report a reachable database");
  }

  const author = await prismaClient.user.findUnique({
    where: {
      email: phase0FixtureConfig.authorAdmin.email
    },
    select: {
      id: true
    }
  });

  if (!author) {
    throw new Error("Verification author user was not seeded");
  }

  const seededCharacter = await ensureOk<PublicCharacterResponse>(
    await fetch(`${apiBaseUrl}/characters/${phase0FixtureConfig.characterSlug}`)
  );
  const seededFaction = await ensureOk<PublicFactionResponse>(
    await fetch(`${apiBaseUrl}/factions/${phase0FixtureConfig.factionSlug}`)
  );
  const seededRelationship = await ensureOk<PublicRelationshipResponse>(
    await fetch(
      `${apiBaseUrl}/relationships/${phase0FixtureConfig.characterSlug}/${phase0FixtureConfig.relationshipType}/${phase0FixtureConfig.factionSlug}`
    )
  );
  const seededDiscovery = await ensureOk<PublicDiscoveryResponse>(await fetch(`${apiBaseUrl}/discover`));

  if (seededCharacter.summary !== phase0FixtureConfig.releasedSummary) {
    throw new Error("Seeded public character response did not match the expected released summary");
  }

  if (seededFaction.summary !== phase0FixtureConfig.factionReleasedSummary) {
    throw new Error("Seeded public faction response did not match the expected released summary");
  }

  if (seededRelationship.version !== 1 || seededRelationship.state !== "CREATE") {
    throw new Error("Seeded public relationship response did not match the expected initial relationship revision");
  }

  if (!seededDiscovery.items.some((item) => item.slug === phase0FixtureConfig.characterSlug)) {
    throw new Error("Seeded discovery response did not include the public character");
  }

  const factionDraft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/factions/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: phase0FixtureConfig.factionSlug,
        name: phase0FixtureConfig.factionName,
        summary: updatedFactionSummary,
        visibility: "PUBLIC"
      })
    })
  );

  const relationshipDraft = await relationshipRepository.saveRevision({
    actorId: author.id,
    sourceEntitySlug: phase0FixtureConfig.characterSlug,
    targetEntitySlug: phase0FixtureConfig.factionSlug,
    relationType: phase0FixtureConfig.relationshipType,
    visibility: "PUBLIC",
    state: "UPDATE",
    metadata: {
      note: updatedRelationshipNote,
      verification: "phase-1"
    }
  });

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: emptyReleaseSlug,
        name: "Phase 1 Empty Verification Release"
      })
    })
  );

  const emptyActivation = await fetch(`${apiBaseUrl}/admin/releases/${emptyReleaseSlug}/activate`, {
    method: "POST",
    headers: {
      cookie: sessionCookie
    }
  });

  if (emptyActivation.status !== 409) {
    throw new Error(`Expected empty release activation to fail with 409, received ${emptyActivation.status}`);
  }

  const emptyActivationPayload = (await emptyActivation.json()) as ConflictResponse;

  if (emptyActivationPayload.code !== "RELEASE_EMPTY") {
    throw new Error("Empty release activation did not return the RELEASE_EMPTY guard code");
  }

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: verifyReleaseSlug,
        name: "Phase 1 Verification Release"
      })
    })
  );

  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: verifyReleaseSlug,
    relationshipRevisionId: relationshipDraft.relationshipRevisionId
  });

  const blockedValidation = await ensureOk<ReleaseValidationResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${verifyReleaseSlug}/validation`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  if (blockedValidation.isReady || blockedValidation.summary.blockingFailureCount < 2) {
    throw new Error("Relationship-only release should have blocked validation failures before entity dependencies are included");
  }

  const blockedReview = await ensureOk<ReleaseReviewResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${verifyReleaseSlug}/review`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  if (blockedReview.relationshipEntries[0]?.dependencyState !== "MISSING_DEPENDENCIES") {
    throw new Error("Release review did not expose missing dependency state for the relationship revision");
  }

  const releasedCharacterRevision = await prismaClient.entityRevision.findFirst({
    where: {
      entity: {
        slug: phase0FixtureConfig.characterSlug
      },
      version: 1
    },
    select: {
      id: true
    }
  });

  if (!releasedCharacterRevision) {
    throw new Error("Released character revision was not found for verification");
  }

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${verifyReleaseSlug}/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        characterSlug: phase0FixtureConfig.characterSlug,
        revisionId: releasedCharacterRevision.id
      })
    })
  );

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${verifyReleaseSlug}/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        factionSlug: phase0FixtureConfig.factionSlug,
        revisionId: factionDraft.revisionId
      })
    })
  );

  const readyValidation = await ensureOk<ReleaseValidationResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${verifyReleaseSlug}/validation`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  if (!readyValidation.isReady || readyValidation.summary.blockingFailureCount !== 0) {
    throw new Error("Release validation did not become ready after required dependencies were included");
  }

  const publicFactionBeforeActivation = await ensureOk<PublicFactionResponse>(
    await fetch(`${apiBaseUrl}/factions/${phase0FixtureConfig.factionSlug}`)
  );
  const publicRelationshipBeforeActivation = await ensureOk<PublicRelationshipResponse>(
    await fetch(
      `${apiBaseUrl}/relationships/${phase0FixtureConfig.characterSlug}/${phase0FixtureConfig.relationshipType}/${phase0FixtureConfig.factionSlug}`
    )
  );
  const discoveryBeforeActivation = await ensureOk<PublicDiscoveryResponse>(
    await fetch(`${apiBaseUrl}/discover?q=revised guild charter`)
  );

  if (publicFactionBeforeActivation.summary !== phase0FixtureConfig.factionReleasedSummary) {
    throw new Error("Public faction response changed before the verification release was activated");
  }

  if (publicRelationshipBeforeActivation.version !== 1) {
    throw new Error("Public relationship response changed before the verification release was activated");
  }

  if (discoveryBeforeActivation.items.length !== 0) {
    throw new Error("Public discovery leaked unreleased draft content before activation");
  }

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${verifyReleaseSlug}/activate`, {
      method: "POST",
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const publicFactionAfterActivation = await ensureOk<PublicFactionResponse>(
    await fetch(`${apiBaseUrl}/factions/${phase0FixtureConfig.factionSlug}`)
  );
  const publicRelationshipAfterActivation = await ensureOk<PublicRelationshipResponse>(
    await fetch(
      `${apiBaseUrl}/relationships/${phase0FixtureConfig.characterSlug}/${phase0FixtureConfig.relationshipType}/${phase0FixtureConfig.factionSlug}`
    )
  );
  const discoveryAfterActivation = await ensureOk<PublicDiscoveryResponse>(
    await fetch(`${apiBaseUrl}/discover?q=revised guild charter`)
  );

  if (publicFactionAfterActivation.summary !== updatedFactionSummary) {
    throw new Error("Public faction response did not update after verification release activation");
  }

  if (publicRelationshipAfterActivation.version !== relationshipDraft.version) {
    throw new Error("Public relationship response did not update after verification release activation");
  }

  if (!discoveryAfterActivation.items.some((item) => item.slug === phase0FixtureConfig.factionSlug)) {
    throw new Error("Public discovery did not expose the updated faction after verification release activation");
  }

  const postActivationMutation = await fetch(`${apiBaseUrl}/admin/releases/${verifyReleaseSlug}/entries`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({
      factionSlug: phase0FixtureConfig.factionSlug,
      revisionId: factionDraft.revisionId
    })
  });

  if (postActivationMutation.status !== 409) {
    throw new Error(`Expected post-activation mutation to fail with 409, received ${postActivationMutation.status}`);
  }

  const postActivationPayload = (await postActivationMutation.json()) as ConflictResponse;

  if (postActivationPayload.code !== "RELEASE_NOT_DRAFT") {
    throw new Error("Post-activation mutation did not return the RELEASE_NOT_DRAFT guard code");
  }

  console.log(
    JSON.stringify(
      {
        apiBaseUrl,
        releaseSlug: verifyReleaseSlug,
        emptyReleaseSlug,
        factionDraftVersion: factionDraft.version,
        relationshipDraftVersion: relationshipDraft.version,
        discoveryResultCount: discoveryAfterActivation.items.length,
        result: "phase-1 verification passed"
      },
      null,
      2
    )
  );
};

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });