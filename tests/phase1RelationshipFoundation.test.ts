import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { Role, Visibility } from "@prisma/client";

import { prismaClient } from "../apps/api/src/db/prismaClient.js";
import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { relationshipRepository } from "../apps/api/src/repositories/relationshipRepository.js";
import { releaseRepository } from "../apps/api/src/repositories/releaseRepository.js";
import { phase0FixtureConfig } from "../scripts/phase0FixtureConfig.js";

const sourceSlug = `relationship-source-${Date.now()}`;
const targetSlug = `relationship-target-${Date.now()}`;
const releaseSlug = `relationship-release-${Date.now()}`;
const relationType = "ALIGNED_WITH";

let authorId = "";

before(async () => {
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

  await prismaClient.entity.createMany({
    data: [
      {
        slug: sourceSlug,
        type: "CHARACTER"
      },
      {
        slug: targetSlug,
        type: "FACTION"
      }
    ]
  });

  await releaseRepository.createRelease({
    actorId: authorId,
    slug: releaseSlug,
    name: "Relationship Foundation Release"
  });
});

after(async () => {
  await prismaClient.releaseRelationshipEntry.deleteMany({
    where: {
      release: {
        slug: releaseSlug
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
      slug: releaseSlug
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

test("relationship revisions create distinct history and releases point at revision ids", async () => {
  const createRevision = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: targetSlug,
    relationType,
    visibility: Visibility.PUBLIC,
    state: "CREATE",
    metadata: {
      note: "Initial canon alignment"
    }
  });

  assert.equal(createRevision.version, 1);
  assert.equal(createRevision.state, "CREATE");

  const updateRevision = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: targetSlug,
    relationType,
    visibility: Visibility.PUBLIC,
    state: "UPDATE",
    metadata: {
      note: "Updated canon alignment"
    }
  });

  assert.equal(updateRevision.version, 2);
  assert.equal(updateRevision.state, "UPDATE");
  assert.equal(updateRevision.relationshipId, createRevision.relationshipId);

  const deleteRevision = await relationshipRepository.saveRevision({
    actorId: authorId,
    sourceEntitySlug: sourceSlug,
    targetEntitySlug: targetSlug,
    relationType,
    visibility: Visibility.PUBLIC,
    state: "DELETE",
    metadata: {
      note: "Relationship removed from canon"
    }
  });

  assert.equal(deleteRevision.version, 3);
  assert.equal(deleteRevision.state, "DELETE");

  const releaseEntry = await relationshipRepository.includeRevisionInRelease({
    releaseSlug,
    relationshipRevisionId: updateRevision.relationshipRevisionId
  });

  assert.equal(releaseEntry.releaseSlug, releaseSlug);
  assert.equal(releaseEntry.relationshipId, createRevision.relationshipId);
  assert.equal(releaseEntry.relationshipRevisionId, updateRevision.relationshipRevisionId);

  const storedReleaseEntry = await prismaClient.releaseRelationshipEntry.findUnique({
    where: {
      releaseId_relationshipId: {
        releaseId: (
          await prismaClient.release.findUniqueOrThrow({
            where: { slug: releaseSlug },
            select: { id: true }
          })
        ).id,
        relationshipId: createRevision.relationshipId
      }
    },
    select: {
      relationshipRevisionId: true
    }
  });

  assert.equal(storedReleaseEntry?.relationshipRevisionId, updateRevision.relationshipRevisionId);
});