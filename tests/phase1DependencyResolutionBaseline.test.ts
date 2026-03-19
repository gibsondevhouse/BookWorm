import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { releaseDependencyRepository } from "../apps/api/src/repositories/releaseDependencyRepository.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { relationshipRepository } from "../apps/api/src/repositories/relationshipRepository.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type DraftResponse = {
  revisionId: string;
};

type ReleaseResponse = {
  slug: string;
  status: string;
};

type ConflictResponse = {
  error: string;
  code: string;
  releaseSlug: string;
  releaseStatus?: string;
};

type DependencyStatusResponse = {
  releaseSlug: string;
  isComplete: boolean;
  missingDependencies: Array<{
    sourceType: string;
    sourceKey: string;
    dependencyType: string;
    dependencyKey: string;
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
    sourceType: string;
    sourceKey: string;
    dependencyType: string;
    dependencyKey: string;
  }>;
};

type ReleaseReviewResponse = {
  release: {
    slug: string;
    name: string;
    status: string;
    activatedAt: string | null;
  };
  validation: ReleaseValidationResponse;
  entityEntries: Array<{
    entitySlug: string;
    entityType: string;
    revisionId: string;
    version: number;
    name: string;
    summary: string;
    visibility: string;
    inclusionStatus: string;
    dependencyState: string;
    blockingDependencies: Array<{
      code: string;
      dependencyKey: string;
    }>;
  }>;
  relationshipEntries: Array<{
    relationType: string;
    sourceEntitySlug: string;
    targetEntitySlug: string;
    inclusionStatus: string;
    dependencyState: string;
    blockingDependencies: Array<{
      code: string;
      dependencyKey: string;
    }>;
  }>;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const dependentCharacterSlug = `dependency-character-${timestamp}`;
const factionSlug = `dependency-faction-${timestamp}`;
const releaseSlug = `dependency-release-${timestamp}`;
const emptyReleaseSlug = `dependency-empty-release-${timestamp}`;
const relationshipSourceSlug = `dependency-source-${timestamp}`;
const relationshipTargetSlug = `dependency-target-${timestamp}`;
const relationshipExtraSlug = `dependency-extra-${timestamp}`;
const relationshipReleaseSlug = `dependency-relationship-release-${timestamp}`;

let apiBaseUrl = "";

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
    throw new Error(`Unable to create session: ${response.status} ${errorText}`);
  }

  const sessionCookie = response.headers.get("set-cookie");

  if (!sessionCookie) {
    throw new Error("Session creation did not return a cookie");
  }

  const cookieValue = sessionCookie.split(";")[0];

  if (!cookieValue) {
    throw new Error("Session cookie header was empty");
  }

  return cookieValue;
};

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }

  apiBaseUrl = `http://127.0.0.1:${address.port}`;

  const authorPasswordHash = await passwordHasher.hashPassword(phase0FixtureConfig.authorAdmin.password);

  await prismaClient.user.upsert({
    where: {
      email: phase0FixtureConfig.authorAdmin.email
    },
    update: {
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash: authorPasswordHash,
      role: Role.AUTHOR_ADMIN
    },
    create: {
      email: phase0FixtureConfig.authorAdmin.email,
      displayName: phase0FixtureConfig.authorAdmin.displayName,
      passwordHash: authorPasswordHash,
      role: Role.AUTHOR_ADMIN
    }
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  await prismaClient.session.deleteMany({
    where: {
      user: {
        email: phase0FixtureConfig.authorAdmin.email
      }
    }
  });

  await prismaClient.releaseRelationshipEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [releaseSlug, emptyReleaseSlug, relationshipReleaseSlug]
        }
      }
    }
  });

  await prismaClient.releaseEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [releaseSlug, emptyReleaseSlug, relationshipReleaseSlug]
        }
      }
    }
  });

  await prismaClient.relationshipRevision.deleteMany({
    where: {
      relationship: {
        sourceEntity: {
          slug: {
            in: [relationshipSourceSlug]
          }
        },
        targetEntity: {
          slug: {
            in: [relationshipTargetSlug]
          }
        }
      }
    }
  });

  await prismaClient.relationship.deleteMany({
    where: {
      sourceEntity: {
        slug: relationshipSourceSlug
      },
      targetEntity: {
        slug: relationshipTargetSlug
      }
    }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: {
        in: [releaseSlug, emptyReleaseSlug, relationshipReleaseSlug]
      }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [
            dependentCharacterSlug,
            factionSlug,
            relationshipSourceSlug,
            relationshipTargetSlug,
            relationshipExtraSlug
          ]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [
          dependentCharacterSlug,
          factionSlug,
          relationshipSourceSlug,
          relationshipTargetSlug,
          relationshipExtraSlug
        ]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("release dependency status reports missing entity dependencies and activation is blocked", async () => {
  const sessionCookie = await createSessionCookie();

  const characterDraft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/characters/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: dependentCharacterSlug,
        name: "Dependent Character",
        summary: "Requires a faction to be present in the release.",
        visibility: Visibility.PUBLIC,
        requiredDependencies: [
          {
            kind: "ENTITY",
            entitySlug: factionSlug
          }
        ]
      })
    })
  );

  const factionDraft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/factions/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: factionSlug,
        name: "Dependency Faction",
        summary: "Required companion content.",
        visibility: Visibility.PUBLIC
      })
    })
  );

  await ensureOk<ReleaseResponse>(
    await fetch(`${apiBaseUrl}/admin/releases`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: releaseSlug,
        name: "Dependency Baseline Release"
      })
    })
  );

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        entitySlug: dependentCharacterSlug,
        revisionId: characterDraft.revisionId
      })
    })
  );

  const missingStatus = await ensureOk<DependencyStatusResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/dependency-status`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const missingValidation = await ensureOk<ReleaseValidationResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/validation`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const missingReview = await ensureOk<ReleaseReviewResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/review`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  assert.equal(missingStatus.releaseSlug, releaseSlug);
  assert.equal(missingStatus.isComplete, false);
  assert.equal(missingStatus.missingDependencies.length, 1);
  assert.deepEqual(
    missingStatus.missingDependencies.map((dependency) => ({
      sourceType: dependency.sourceType,
      sourceKey: dependency.sourceKey,
      dependencyType: dependency.dependencyType,
      dependencyKey: dependency.dependencyKey
    }))[0],
    {
    sourceType: "ENTITY_REVISION",
    sourceKey: dependentCharacterSlug,
    dependencyType: "ENTITY",
    dependencyKey: factionSlug
    }
  );
  assert.equal(missingValidation.releaseSlug, releaseSlug);
  assert.equal(missingValidation.isReady, false);
  assert.equal(missingValidation.summary.blockingFailureCount, 1);
  assert.equal(missingValidation.summary.dependencyCheckCount, 1);
  assert.deepEqual(
    missingValidation.failures.map((failure) => ({
      code: failure.code,
      sourceType: failure.sourceType,
      sourceKey: failure.sourceKey,
      dependencyType: failure.dependencyType,
      dependencyKey: failure.dependencyKey
    }))[0],
    {
      code: "MISSING_DEPENDENCY",
      sourceType: "ENTITY_REVISION",
      sourceKey: dependentCharacterSlug,
      dependencyType: "ENTITY",
      dependencyKey: factionSlug
    }
  );
  assert.equal(missingReview.release.slug, releaseSlug);
  assert.equal(missingReview.release.status, "DRAFT");
  assert.equal(missingReview.validation.isReady, false);
  assert.equal(missingReview.entityEntries.length, 1);
  assert.deepEqual(
    missingReview.entityEntries.map((entry) => ({
      entitySlug: entry.entitySlug,
      entityType: entry.entityType,
      inclusionStatus: entry.inclusionStatus,
      dependencyState: entry.dependencyState,
      blockingDependencies: entry.blockingDependencies.map((dependency) => ({
        code: dependency.code,
        dependencyKey: dependency.dependencyKey
      }))
    }))[0],
    {
      entitySlug: dependentCharacterSlug,
      entityType: "CHARACTER",
      inclusionStatus: "INCLUDED",
      dependencyState: "MISSING_DEPENDENCIES",
      blockingDependencies: [
        {
          code: "MISSING_DEPENDENCY",
          dependencyKey: factionSlug
        }
      ]
    }
  );

  const blockedActivation = await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/activate`, {
    method: "POST",
    headers: {
      cookie: sessionCookie
    }
  });

  assert.equal(blockedActivation.status, 409);

  const blockedPayload = (await blockedActivation.json()) as {
    error: string;
    dependencyStatus: DependencyStatusResponse;
  };

  assert.equal(blockedPayload.error, "Release cannot be activated while required dependencies are missing");
  assert.equal(blockedPayload.dependencyStatus.isComplete, false);

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        entitySlug: factionSlug,
        revisionId: factionDraft.revisionId
      })
    })
  );

  const resolvedStatus = await ensureOk<DependencyStatusResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/dependency-status`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const resolvedValidation = await ensureOk<ReleaseValidationResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/validation`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const resolvedReview = await ensureOk<ReleaseReviewResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/review`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  assert.equal(resolvedStatus.isComplete, true);
  assert.equal(resolvedStatus.missingDependencies.length, 0);
  assert.equal(resolvedValidation.isReady, true);
  assert.equal(resolvedValidation.summary.blockingFailureCount, 0);
  assert.equal(resolvedValidation.summary.dependencyCheckCount, 1);
  assert.equal(resolvedValidation.failures.length, 0);
  assert.equal(resolvedReview.validation.isReady, true);
  assert.equal(resolvedReview.entityEntries[0]?.dependencyState, "READY");
  assert.equal(resolvedReview.entityEntries[0]?.blockingDependencies.length, 0);

  const activatedRelease = await ensureOk<ReleaseResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/activate`, {
      method: "POST",
      headers: {
        cookie: sessionCookie
      }
    })
  );

  assert.equal(activatedRelease.slug, releaseSlug);
  assert.equal(activatedRelease.status, "ACTIVE");

  const repeatedActivation = await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/activate`, {
    method: "POST",
    headers: {
      cookie: sessionCookie
    }
  });

  assert.equal(repeatedActivation.status, 409);
  assert.deepEqual((await repeatedActivation.json()) as ConflictResponse, {
    error: "Only draft releases can be activated",
    code: "RELEASE_NOT_DRAFT",
    releaseSlug,
    releaseStatus: "ACTIVE"
  });

  const mutationAfterActivation = await fetch(`${apiBaseUrl}/admin/releases/${releaseSlug}/entries`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie
    },
    body: JSON.stringify({
      entitySlug: dependentCharacterSlug,
      revisionId: characterDraft.revisionId
    })
  });

  assert.equal(mutationAfterActivation.status, 409);
  assert.deepEqual((await mutationAfterActivation.json()) as ConflictResponse, {
    error: "Only draft releases can be modified",
    code: "RELEASE_NOT_DRAFT",
    releaseSlug,
    releaseStatus: "ACTIVE"
  });

  await ensureOk<ReleaseResponse>(
    await fetch(`${apiBaseUrl}/admin/releases`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: emptyReleaseSlug,
        name: "Empty Dependency Release"
      })
    })
  );

  const emptyActivation = await fetch(`${apiBaseUrl}/admin/releases/${emptyReleaseSlug}/activate`, {
    method: "POST",
    headers: {
      cookie: sessionCookie
    }
  });

  assert.equal(emptyActivation.status, 409);
  assert.deepEqual((await emptyActivation.json()) as ConflictResponse, {
    error: "Releases must include at least one entity, manuscript, or relationship revision before activation",
    code: "RELEASE_EMPTY",
    releaseSlug: emptyReleaseSlug
  });
});

test("relationship dependency resolution includes implicit linked entities and explicit metadata dependencies", async () => {
  const author = await prismaClient.user.findUniqueOrThrow({
    where: {
      email: phase0FixtureConfig.authorAdmin.email
    },
    select: {
      id: true
    }
  });

  const sourceEntity = await prismaClient.entity.create({
    data: {
      slug: relationshipSourceSlug,
      type: "CHARACTER"
    }
  });

  const targetEntity = await prismaClient.entity.create({
    data: {
      slug: relationshipTargetSlug,
      type: "FACTION"
    }
  });

  const extraEntity = await prismaClient.entity.create({
    data: {
      slug: relationshipExtraSlug,
      type: "FACTION"
    }
  });

  const sourceRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: sourceEntity.id,
      createdById: author.id,
      version: 1,
      name: "Relationship Source",
      summary: "Source entity",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Relationship Source",
        summary: "Source entity",
        visibility: Visibility.PUBLIC
      }
    }
  });

  const targetRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: targetEntity.id,
      createdById: author.id,
      version: 1,
      name: "Relationship Target",
      summary: "Target entity",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Relationship Target",
        summary: "Target entity",
        visibility: Visibility.PUBLIC
      }
    }
  });

  const extraRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: extraEntity.id,
      createdById: author.id,
      version: 1,
      name: "Relationship Extra",
      summary: "Explicit dependency entity",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Relationship Extra",
        summary: "Explicit dependency entity",
        visibility: Visibility.PUBLIC
      }
    }
  });

  await releaseRepository.createRelease({
    actorId: author.id,
    slug: relationshipReleaseSlug,
    name: "Relationship Dependency Release"
  });

  await releaseRepository.includeRevision({
    releaseSlug: relationshipReleaseSlug,
    entitySlug: relationshipSourceSlug,
    revisionId: sourceRevision.id
  });

  const relationshipRevision = await relationshipRepository.saveRevision({
    actorId: author.id,
    sourceEntitySlug: relationshipSourceSlug,
    targetEntitySlug: relationshipTargetSlug,
    relationType: "ALIGNED_WITH",
    visibility: Visibility.PUBLIC,
    state: "CREATE",
    metadata: {
      note: "Depends on an additional supporting faction",
      requiredDependencies: [
        {
          kind: "ENTITY",
          entitySlug: relationshipExtraSlug
        }
      ]
    }
  });

  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: relationshipReleaseSlug,
    relationshipRevisionId: relationshipRevision.relationshipRevisionId
  });

  const missingStatus = await releaseDependencyRepository.getDependencyStatus(relationshipReleaseSlug);

  const sessionCookie = await createSessionCookie();

  const relationshipReview = await ensureOk<ReleaseReviewResponse>(
    await fetch(`${apiBaseUrl}/admin/releases/${relationshipReleaseSlug}/review`, {
      headers: {
        cookie: sessionCookie
      }
    })
  );

  assert.equal(missingStatus.isComplete, false);
  assert.deepEqual(
    missingStatus.missingDependencies.map((dependency) => ({
      sourceType: dependency.sourceType,
      sourceKey: dependency.sourceKey,
      dependencyType: dependency.dependencyType,
      dependencyKey: dependency.dependencyKey
    })),
    [
      {
        sourceType: "RELATIONSHIP_REVISION",
        sourceKey: `${relationshipSourceSlug}:ALIGNED_WITH:${relationshipTargetSlug}`,
        dependencyType: "ENTITY",
        dependencyKey: relationshipTargetSlug
      },
      {
        sourceType: "RELATIONSHIP_REVISION",
        sourceKey: `${relationshipSourceSlug}:ALIGNED_WITH:${relationshipTargetSlug}`,
        dependencyType: "ENTITY",
        dependencyKey: relationshipExtraSlug
      }
    ]
  );
  assert.equal(relationshipReview.release.slug, relationshipReleaseSlug);
  assert.equal(relationshipReview.relationshipEntries.length, 1);
  assert.deepEqual(
    relationshipReview.relationshipEntries.map((entry) => ({
      relationType: entry.relationType,
      sourceEntitySlug: entry.sourceEntitySlug,
      targetEntitySlug: entry.targetEntitySlug,
      inclusionStatus: entry.inclusionStatus,
      dependencyState: entry.dependencyState,
      blockingDependencies: entry.blockingDependencies.map((dependency) => ({
        code: dependency.code,
        dependencyKey: dependency.dependencyKey
      }))
    }))[0],
    {
      relationType: "ALIGNED_WITH",
      sourceEntitySlug: relationshipSourceSlug,
      targetEntitySlug: relationshipTargetSlug,
      inclusionStatus: "INCLUDED",
      dependencyState: "MISSING_DEPENDENCIES",
      blockingDependencies: [
        {
          code: "MISSING_DEPENDENCY",
          dependencyKey: relationshipTargetSlug
        },
        {
          code: "MISSING_DEPENDENCY",
          dependencyKey: relationshipExtraSlug
        }
      ]
    }
  );

  await releaseRepository.includeRevision({
    releaseSlug: relationshipReleaseSlug,
    entitySlug: relationshipTargetSlug,
    revisionId: targetRevision.id
  });

  await releaseRepository.includeRevision({
    releaseSlug: relationshipReleaseSlug,
    entitySlug: relationshipExtraSlug,
    revisionId: extraRevision.id
  });

  const resolvedStatus = await releaseDependencyRepository.getDependencyStatus(relationshipReleaseSlug);

  assert.equal(resolvedStatus.isComplete, true);
  assert.equal(resolvedStatus.missingDependencies.length, 0);
});