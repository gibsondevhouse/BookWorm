import { type Prisma, type RevisionDiffKind } from "@prisma/client";

import { prismaClient } from "../db/prismaClient.js";

export type RevisionDiffRecord = {
  id: string;
  kind: RevisionDiffKind;
  fromRevisionId: string;
  toRevisionId: string;
  fromContentIdentity: string;
  toContentIdentity: string;
  pairContentIdentity: string;
  diff: Prisma.JsonValue;
  createdAt: Date;
};

const mapRevisionDiffRecord = (record: {
  id: string;
  kind: RevisionDiffKind;
  fromRevisionId: string;
  toRevisionId: string;
  fromContentIdentity: string;
  toContentIdentity: string;
  pairContentIdentity: string;
  diff: Prisma.JsonValue;
  createdAt: Date;
}): RevisionDiffRecord => ({
  id: record.id,
  kind: record.kind,
  fromRevisionId: record.fromRevisionId,
  toRevisionId: record.toRevisionId,
  fromContentIdentity: record.fromContentIdentity,
  toContentIdentity: record.toContentIdentity,
  pairContentIdentity: record.pairContentIdentity,
  diff: record.diff,
  createdAt: record.createdAt
});

export const revisionDiffRepository = {
  async findByPair(input: {
    kind: RevisionDiffKind;
    fromRevisionId: string;
    toRevisionId: string;
    pairContentIdentity: string;
  }): Promise<RevisionDiffRecord | null> {
    const record = await prismaClient.revisionDiff.findUnique({
      where: {
        kind_fromRevisionId_toRevisionId_pairContentIdentity: {
          kind: input.kind,
          fromRevisionId: input.fromRevisionId,
          toRevisionId: input.toRevisionId,
          pairContentIdentity: input.pairContentIdentity
        }
      }
    });

    return record ? mapRevisionDiffRecord(record) : null;
  },

  async create(input: {
    kind: RevisionDiffKind;
    fromRevisionId: string;
    toRevisionId: string;
    fromContentIdentity: string;
    toContentIdentity: string;
    pairContentIdentity: string;
    diff: Prisma.InputJsonValue;
  }): Promise<RevisionDiffRecord> {
    const record = await prismaClient.revisionDiff.create({
      data: {
        kind: input.kind,
        fromRevisionId: input.fromRevisionId,
        toRevisionId: input.toRevisionId,
        fromContentIdentity: input.fromContentIdentity,
        toContentIdentity: input.toContentIdentity,
        pairContentIdentity: input.pairContentIdentity,
        diff: input.diff
      }
    });

    return mapRevisionDiffRecord(record);
  }
};
