import { phase0FixtureConfig } from "./phase0FixtureConfig.js";
import { seedPhase0 } from "./seedPhase0.js";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000";
const characterSlug = phase0FixtureConfig.characterSlug;

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
  name: string;
  summary: string;
  version: number;
};

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
  console.log(`Phase 0 verification script

Requirements:
- PostgreSQL is running and DATABASE_URL is valid for the API
- migrations have been applied with pnpm db:migrate
- seed data has been written with pnpm db:seed
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

  const verifyReleaseSlug = `phase-0-verify-${Date.now()}`;
  const updatedSummary = `An updated verification summary published at ${new Date().toISOString()}.`;
  const sessionCookie = await createSessionCookie();

  const health = await ensureOk<HealthResponse>(await fetch(`${apiBaseUrl}/health`));

  if (health.status !== "ok" || health.dependencies?.database !== "reachable") {
    throw new Error("API health check did not report a reachable database");
  }

  const seededPublic = await ensureOk<PublicCharacterResponse>(
    await fetch(`${apiBaseUrl}/characters/${characterSlug}`)
  );

  if (seededPublic.summary !== phase0FixtureConfig.releasedSummary) {
    throw new Error("Seeded public response did not match the expected released summary");
  }

  const draft = await ensureOk<DraftResponse>(
    await fetch(`${apiBaseUrl}/admin/characters/drafts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie
      },
      body: JSON.stringify({
        slug: characterSlug,
        name: "Captain Mirelle Vale",
        summary: updatedSummary,
        visibility: "PUBLIC"
      })
    })
  );

  const publicBeforeRelease = await ensureOk<PublicCharacterResponse>(
    await fetch(`${apiBaseUrl}/characters/${characterSlug}`)
  );

  if (publicBeforeRelease.summary !== phase0FixtureConfig.releasedSummary) {
    throw new Error("Public response changed before the new draft was released");
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
        name: "Phase 0 Verification Release"
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
        characterSlug,
        revisionId: draft.revisionId
      })
    })
  );

  await ensureOk(
    await fetch(`${apiBaseUrl}/admin/releases/${verifyReleaseSlug}/activate`, {
      method: "POST",
      headers: {
        cookie: sessionCookie
      }
    })
  );

  const publicAfterRelease = await ensureOk<PublicCharacterResponse>(
    await fetch(`${apiBaseUrl}/characters/${characterSlug}`)
  );

  if (publicAfterRelease.summary !== updatedSummary) {
    throw new Error("Public response did not update after release activation");
  }

  console.log(
    JSON.stringify(
      {
        apiBaseUrl,
        characterSlug,
        seededRelease: seededPublic.releaseSlug,
        verificationRelease: verifyReleaseSlug,
        createdDraftVersion: draft.version,
        result: "phase-0 verification passed"
      },
      null,
      2
    )
  );
};

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});