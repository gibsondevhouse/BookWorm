import { config } from "dotenv";
import { PrismaClient, Role, Visibility } from "@prisma/client";

import { passwordHasher } from "../apps/api/src/lib/passwordHasher.js";
import { phase0FixtureConfig } from "./phase0FixtureConfig.js";

config({ path: new URL("../.env", import.meta.url).pathname });

export const seedPhase0 = async (): Promise<void> => {
  const prismaClient = new PrismaClient();

  try {
    const authorPasswordHash = await passwordHasher.hashPassword(phase0FixtureConfig.authorAdmin.password);
    const editorPasswordHash = await passwordHasher.hashPassword(phase0FixtureConfig.editor.password);

    const actor = await prismaClient.user.upsert({
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

    await prismaClient.user.upsert({
      where: {
        email: phase0FixtureConfig.editor.email
      },
      update: {
        displayName: phase0FixtureConfig.editor.displayName,
        passwordHash: editorPasswordHash,
        role: Role.EDITOR
      },
      create: {
        email: phase0FixtureConfig.editor.email,
        displayName: phase0FixtureConfig.editor.displayName,
        passwordHash: editorPasswordHash,
        role: Role.EDITOR
      }
    });

    const character = await prismaClient.entity.upsert({
      where: {
        slug: phase0FixtureConfig.characterSlug
      },
      update: {
        type: "CHARACTER"
      },
      create: {
        slug: phase0FixtureConfig.characterSlug,
        type: "CHARACTER"
      }
    });

    const faction = await prismaClient.entity.upsert({
      where: {
        slug: phase0FixtureConfig.factionSlug
      },
      update: {
        type: "FACTION"
      },
      create: {
        slug: phase0FixtureConfig.factionSlug,
        type: "FACTION"
      }
    });

    const relationship = await prismaClient.relationship.upsert({
      where: {
        sourceEntityId_targetEntityId_relationType: {
          sourceEntityId: character.id,
          targetEntityId: faction.id,
          relationType: phase0FixtureConfig.relationshipType
        }
      },
      update: {},
      create: {
        sourceEntityId: character.id,
        targetEntityId: faction.id,
        relationType: phase0FixtureConfig.relationshipType
      }
    });

    const releasedRevision = await prismaClient.entityRevision.upsert({
      where: {
        entityId_version: {
          entityId: character.id,
          version: 1
        }
      },
      update: {
        createdById: actor.id,
        name: "Captain Mirelle Vale",
        summary: phase0FixtureConfig.releasedSummary,
        visibility: Visibility.PUBLIC,
        payload: {
          name: "Captain Mirelle Vale",
          summary: phase0FixtureConfig.releasedSummary,
          visibility: Visibility.PUBLIC,
          revisionState: "released"
        }
      },
      create: {
        entityId: character.id,
        createdById: actor.id,
        version: 1,
        name: "Captain Mirelle Vale",
        summary: phase0FixtureConfig.releasedSummary,
        visibility: Visibility.PUBLIC,
        payload: {
          name: "Captain Mirelle Vale",
          summary: phase0FixtureConfig.releasedSummary,
          visibility: Visibility.PUBLIC,
          revisionState: "released"
        }
      }
    });

    await prismaClient.entityRevision.upsert({
      where: {
        entityId_version: {
          entityId: character.id,
          version: 2
        }
      },
      update: {
        createdById: actor.id,
        name: "Captain Mirelle Vale",
        summary: phase0FixtureConfig.hiddenDraftSummary,
        visibility: Visibility.PUBLIC,
        payload: {
          name: "Captain Mirelle Vale",
          summary: phase0FixtureConfig.hiddenDraftSummary,
          visibility: Visibility.PUBLIC,
          revisionState: "draft"
        }
      },
      create: {
        entityId: character.id,
        createdById: actor.id,
        version: 2,
        name: "Captain Mirelle Vale",
        summary: phase0FixtureConfig.hiddenDraftSummary,
        visibility: Visibility.PUBLIC,
        payload: {
          name: "Captain Mirelle Vale",
          summary: phase0FixtureConfig.hiddenDraftSummary,
          visibility: Visibility.PUBLIC,
          revisionState: "draft"
        }
      }
    });

    const releasedRelationshipRevision = await prismaClient.relationshipRevision.upsert({
      where: {
        relationshipId_version: {
          relationshipId: relationship.id,
          version: 1
        }
      },
      update: {
        createdById: actor.id,
        state: "CREATE",
        visibility: Visibility.PUBLIC,
        metadata: phase0FixtureConfig.relationshipReleasedMetadata
      },
      create: {
        relationshipId: relationship.id,
        createdById: actor.id,
        version: 1,
        state: "CREATE",
        visibility: Visibility.PUBLIC,
        metadata: phase0FixtureConfig.relationshipReleasedMetadata
      }
    });

    await prismaClient.relationshipRevision.upsert({
      where: {
        relationshipId_version: {
          relationshipId: relationship.id,
          version: 2
        }
      },
      update: {
        createdById: actor.id,
        state: "UPDATE",
        visibility: Visibility.PUBLIC,
        metadata: phase0FixtureConfig.relationshipDraftMetadata
      },
      create: {
        relationshipId: relationship.id,
        createdById: actor.id,
        version: 2,
        state: "UPDATE",
        visibility: Visibility.PUBLIC,
        metadata: phase0FixtureConfig.relationshipDraftMetadata
      }
    });

    const releasedFactionRevision = await prismaClient.entityRevision.upsert({
      where: {
        entityId_version: {
          entityId: faction.id,
          version: 1
        }
      },
      update: {
        createdById: actor.id,
        name: phase0FixtureConfig.factionName,
        summary: phase0FixtureConfig.factionReleasedSummary,
        visibility: Visibility.PUBLIC,
        payload: {
          name: phase0FixtureConfig.factionName,
          summary: phase0FixtureConfig.factionReleasedSummary,
          visibility: Visibility.PUBLIC,
          revisionState: "released"
        }
      },
      create: {
        entityId: faction.id,
        createdById: actor.id,
        version: 1,
        name: phase0FixtureConfig.factionName,
        summary: phase0FixtureConfig.factionReleasedSummary,
        visibility: Visibility.PUBLIC,
        payload: {
          name: phase0FixtureConfig.factionName,
          summary: phase0FixtureConfig.factionReleasedSummary,
          visibility: Visibility.PUBLIC,
          revisionState: "released"
        }
      }
    });

    await prismaClient.entityRevision.upsert({
      where: {
        entityId_version: {
          entityId: faction.id,
          version: 2
        }
      },
      update: {
        createdById: actor.id,
        name: phase0FixtureConfig.factionName,
        summary: phase0FixtureConfig.factionHiddenDraftSummary,
        visibility: Visibility.PUBLIC,
        payload: {
          name: phase0FixtureConfig.factionName,
          summary: phase0FixtureConfig.factionHiddenDraftSummary,
          visibility: Visibility.PUBLIC,
          revisionState: "draft"
        }
      },
      create: {
        entityId: faction.id,
        createdById: actor.id,
        version: 2,
        name: phase0FixtureConfig.factionName,
        summary: phase0FixtureConfig.factionHiddenDraftSummary,
        visibility: Visibility.PUBLIC,
        payload: {
          name: phase0FixtureConfig.factionName,
          summary: phase0FixtureConfig.factionHiddenDraftSummary,
          visibility: Visibility.PUBLIC,
          revisionState: "draft"
        }
      }
    });

    const release = await prismaClient.release.upsert({
      where: {
        slug: phase0FixtureConfig.releaseSlug
      },
      update: {
        name: "Phase 0 Initial Release",
        status: "ACTIVE",
        createdById: actor.id,
        activatedAt: new Date()
      },
      create: {
        slug: phase0FixtureConfig.releaseSlug,
        name: "Phase 0 Initial Release",
        status: "ACTIVE",
        createdById: actor.id,
        activatedAt: new Date()
      }
    });

    await prismaClient.release.updateMany({
      where: {
        id: {
          not: release.id
        },
        status: "ACTIVE"
      },
      data: {
        status: "ARCHIVED"
      }
    });

    await prismaClient.releaseEntry.upsert({
      where: {
        releaseId_entityId: {
          releaseId: release.id,
          entityId: character.id
        }
      },
      update: {
        revisionId: releasedRevision.id
      },
      create: {
        releaseId: release.id,
        entityId: character.id,
        revisionId: releasedRevision.id
      }
    });

    await prismaClient.releaseRelationshipEntry.upsert({
      where: {
        releaseId_relationshipId: {
          releaseId: release.id,
          relationshipId: relationship.id
        }
      },
      update: {
        relationshipRevisionId: releasedRelationshipRevision.id
      },
      create: {
        releaseId: release.id,
        relationshipId: relationship.id,
        relationshipRevisionId: releasedRelationshipRevision.id
      }
    });

    await prismaClient.releaseEntry.upsert({
      where: {
        releaseId_entityId: {
          releaseId: release.id,
          entityId: faction.id
        }
      },
      update: {
        revisionId: releasedFactionRevision.id
      },
      create: {
        releaseId: release.id,
        entityId: faction.id,
        revisionId: releasedFactionRevision.id
      }
    });

    console.log(JSON.stringify({
      actorEmail: phase0FixtureConfig.authorAdmin.email,
      editorEmail: phase0FixtureConfig.editor.email,
      characterSlug: phase0FixtureConfig.characterSlug,
      factionSlug: phase0FixtureConfig.factionSlug,
      relationshipType: phase0FixtureConfig.relationshipType,
      activeRelease: release.slug,
      releasedRevisionId: releasedRevision.id,
      draftRevisionVersion: 2
    }, null, 2));
  } finally {
    await prismaClient.$disconnect();
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  seedPhase0().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}