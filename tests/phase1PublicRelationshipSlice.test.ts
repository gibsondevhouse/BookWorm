import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { createApp } from "../apps/api/src/app/createApp.js";
import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { relationshipRepository } from "../apps/api/src/repositories/relationshipRepository.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

type PublicRelationshipResponse = {
  releaseSlug: string;
  relationshipId: string;
  relationshipRevisionId: string;
  sourceEntitySlug: string;
  targetEntitySlug: string;
  relationType: string;
  version: number;
  state: string;
  visibility: string;
};

const app = createApp();
const server = createServer(app);
const timestamp = Date.now();
const sourceSlug = `public-relationship-source-${timestamp}`;
const targetSlug = `public-relationship-target-${timestamp}`;
const releaseSlug = `public-relationship-release-${timestamp}`;
const nextReleaseSlug = `public-relationship-next-${timestamp}`;
const deleteReleaseSlug = `public-relationship-delete-${timestamp}`;
const relationType = "ALIGNED_WITH";

let apiBaseUrl = "";
let authorId = "";

const ensureOk = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
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

  const author = await prismaClient.user.upsert({
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

  authorId = author.id;

  const sourceEntity = await prismaClient.entity.create({
    data: {
      slug: sourceSlug,
      type: "CHARACTER"
    }
  });

  const targetEntity = await prismaClient.entity.create({
    data: {
      slug: targetSlug,
      type: "FACTION"
    }
  });

  const sourceRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: sourceEntity.id,
      createdById: authorId,
      version: 1,
      name: "Public Relationship Source",
      summary: "Relationship source entity",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Public Relationship Source",
        summary: "Relationship source entity",
        visibility: Visibility.PUBLIC
      }
    }
  });

  const targetRevision = await prismaClient.entityRevision.create({
    data: {
      entityId: targetEntity.id,
      createdById: authorId,
      version: 1,
      name: "Public Relationship Target",
      summary: "Relationship target entity",
      visibility: Visibility.PUBLIC,
      payload: {
        name: "Public Relationship Target",
        summary: "Relationship target entity",
        visibility: Visibility.PUBLIC
      }
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: releaseSlug,
    name: "Public Relationship Initial Release"
  });

  await releaseRepository.includeRevision({
    releaseSlug,
    entitySlug: sourceSlug,
    revisionId: sourceRevision.id
  });

  await releaseRepository.includeRevision({
    releaseSlug,
    entitySlug: targetSlug,
    revisionId: targetRevision.id
  });

  const initialRelationshipRevision = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: targetSlug,
    relationType,
    visibility: Visibility.PUBLIC,
    state: "CREATE",
    metadata: {
      note: "Initial public relationship"
    }
  });

  await relationshipRepository.includeRevisionInRelease({
    releaseSlug,
    relationshipRevisionId: initialRelationshipRevision.relationshipRevisionId
  });

  await releaseRepository.activateRelease(releaseSlug);
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

  await prismaClient.releaseRelationshipEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [releaseSlug, nextReleaseSlug, deleteReleaseSlug]
        }
      }
    }
  });

  await prismaClient.releaseEntry.deleteMany({
    where: {
      release: {
        slug: {
          in: [releaseSlug, nextReleaseSlug, deleteReleaseSlug]
        }
      }
    }
  });

  await prismaClient.relationshipRevision.deleteMany({
    where: {
      relationship: {
        sourceEntity: {
          slug: sourceSlug
        },
        targetEntity: {
          slug: targetSlug
        }
      }
    }
  });

  await prismaClient.relationship.deleteMany({
    where: {
      sourceEntity: {
        slug: sourceSlug
      },
      targetEntity: {
        slug: targetSlug
      }
    }
  });

  await prismaClient.release.deleteMany({
    where: {
      slug: {
        in: [releaseSlug, nextReleaseSlug, deleteReleaseSlug]
      }
    }
  });

  await prismaClient.entityRevision.deleteMany({
    where: {
      entity: {
        slug: {
          in: [sourceSlug, targetSlug]
        }
      }
    }
  });

  await prismaClient.entity.deleteMany({
    where: {
      slug: {
        in: [sourceSlug, targetSlug]
      }
    }
  });

  await prismaClient.$disconnect();
});

test("public relationship reads remain bound to the active release", async () => {
  const publicBeforeDraft = await ensureOk<PublicRelationshipResponse>(
    await fetch(`${apiBaseUrl}/relationships/${sourceSlug}/${relationType}/${targetSlug}`)
  );

  assert.equal(publicBeforeDraft.releaseSlug, releaseSlug);
  assert.equal(publicBeforeDraft.version, 1);
  assert.equal(publicBeforeDraft.state, "CREATE");

  const updatedRelationshipRevision = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: targetSlug,
    relationType,
    visibility: Visibility.PUBLIC,
    state: "UPDATE",
    metadata: {
      note: "Updated public relationship"
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: nextReleaseSlug,
    name: "Public Relationship Next Release"
  });

  const sourceRevision = await prismaClient.entityRevision.findFirstOrThrow({
    where: {
      entity: {
        slug: sourceSlug
      }
    },
    orderBy: {
      version: "desc"
    },
    select: {
      id: true
    }
  });

  const targetRevision = await prismaClient.entityRevision.findFirstOrThrow({
    where: {
      entity: {
        slug: targetSlug
      }
    },
    orderBy: {
      version: "desc"
    },
    select: {
      id: true
    }
  });

  await releaseRepository.includeRevision({
    releaseSlug: nextReleaseSlug,
    entitySlug: sourceSlug,
    revisionId: sourceRevision.id
  });

  await releaseRepository.includeRevision({
    releaseSlug: nextReleaseSlug,
    entitySlug: targetSlug,
    revisionId: targetRevision.id
  });

  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: nextReleaseSlug,
    relationshipRevisionId: updatedRelationshipRevision.relationshipRevisionId
  });

  const publicBeforeActivation = await ensureOk<PublicRelationshipResponse>(
    await fetch(`${apiBaseUrl}/relationships/${sourceSlug}/${relationType}/${targetSlug}`)
  );

  assert.equal(publicBeforeActivation.releaseSlug, releaseSlug);
  assert.equal(publicBeforeActivation.version, 1);

  await releaseRepository.activateRelease(nextReleaseSlug);

  const publicAfterActivation = await ensureOk<PublicRelationshipResponse>(
    await fetch(`${apiBaseUrl}/relationships/${sourceSlug}/${relationType}/${targetSlug}`)
  );

  assert.equal(publicAfterActivation.releaseSlug, nextReleaseSlug);
  assert.equal(publicAfterActivation.version, 2);
  assert.equal(publicAfterActivation.state, "UPDATE");

  const deleteRelationshipRevision = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: targetSlug,
    relationType,
    visibility: Visibility.PUBLIC,
    state: "DELETE",
    metadata: {
      note: "Relationship removed from the active public graph"
    }
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: deleteReleaseSlug,
    name: "Public Relationship Delete Release"
  });

  await releaseRepository.includeRevision({
    releaseSlug: deleteReleaseSlug,
    entitySlug: sourceSlug,
    revisionId: sourceRevision.id
  });

  await releaseRepository.includeRevision({
    releaseSlug: deleteReleaseSlug,
    entitySlug: targetSlug,
    revisionId: targetRevision.id
  });

  await relationshipRepository.includeRevisionInRelease({
    releaseSlug: deleteReleaseSlug,
    relationshipRevisionId: deleteRelationshipRevision.relationshipRevisionId
  });

  await releaseRepository.activateRelease(deleteReleaseSlug);

  const publicAfterDelete = await fetch(`${apiBaseUrl}/relationships/${sourceSlug}/${relationType}/${targetSlug}`);

  assert.equal(publicAfterDelete.status, 404);
  assert.deepEqual(await publicAfterDelete.json(), {
    error: "Relationship not found in the active public release"
  });
});