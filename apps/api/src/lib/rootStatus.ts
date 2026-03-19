import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

type TrackerEntry = {
  phase: string;
  stage: string | null;
  status: "completed" | "in-progress" | "not-started" | "blocked";
  label: string;
};

type RootStatusPayload = {
  name: "book-worm-api";
  stage: string;
  currentPhase: string;
  currentStage: string;
  currentFocus: string;
  nextStepLabel: string;
  nextStepDetail: string;
  releaseWorkflow: "validated-and-guarded";
  publicSurface: ["characters", "factions", "relationships", "discover"];
};

const trackerRelativePath = path.join("docs", "build-plans", "master-plan-tracker.md");
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

const mapStatus = (marker: string): TrackerEntry["status"] => {
  switch (marker) {
    case "x":
      return "completed";
    case "-":
      return "in-progress";
    case "!":
      return "blocked";
    default:
      return "not-started";
  }
};

const getEntrySpecificity = (entry: TrackerEntry): number => {
  if (entry.label.startsWith("Part ")) {
    return 3;
  }

  if (entry.label.includes("Stage") && entry.label.includes("Overview")) {
    return 2;
  }

  if (entry.label.includes("Phase") && entry.label.includes("Overview")) {
    return 1;
  }

  return 0;
};

const getPreferredEntry = (entries: TrackerEntry[], status: TrackerEntry["status"]): TrackerEntry | undefined => {
  const matchingEntries = entries.filter((entry) => entry.status === status);

  return matchingEntries.sort((left, right) => getEntrySpecificity(right) - getEntrySpecificity(left))[0];
};

const getNextEntry = (entries: TrackerEntry[], focusEntry: TrackerEntry): TrackerEntry | undefined => {
  const focusIndex = entries.indexOf(focusEntry);

  if (focusIndex >= 0) {
    const followingEntry = entries.slice(focusIndex + 1).find((entry) => entry.status === "not-started");

    if (followingEntry) {
      return followingEntry;
    }
  }

  return getPreferredEntry(entries, "not-started");
};

const normalizeLabel = (value: string): string => value.replace(/ Overview$/, "");

const toSlug = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const resolveTrackerPath = async (): Promise<string> => {
  const candidates = [
    path.resolve(process.cwd(), trackerRelativePath),
    path.resolve(process.cwd(), "..", "..", trackerRelativePath),
    path.resolve(moduleDirectory, "..", "..", "..", "..", trackerRelativePath)
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("Unable to locate the master plan tracker");
};

const parseTracker = (source: string): TrackerEntry[] => {
  const lines = source.split(/\r?\n/);
  const entries: TrackerEntry[] = [];
  let currentPhase = "";
  let currentStage: string | null = null;

  for (const line of lines) {
    if (line.startsWith("### ")) {
      currentPhase = line.replace(/^###\s+/, "").trim();
      currentStage = null;
      continue;
    }

    if (line.startsWith("#### ")) {
      currentStage = line.replace(/^####\s+/, "").trim();
      continue;
    }

    const match = line.match(/^- \[([ x!-])\] \[(.+?)\]\(.+\)$/);

    if (!match || currentPhase.length === 0) {
      continue;
    }

    const statusMarker = match[1];
    const label = match[2];

    if (!statusMarker || !label) {
      continue;
    }

    entries.push({
      phase: currentPhase,
      stage: currentStage,
      status: mapStatus(statusMarker),
      label
    });
  }

  return entries;
};

const fallbackStatus: RootStatusPayload = {
  name: "book-worm-api",
  stage: "tracker-unavailable",
  currentPhase: "Unknown",
  currentStage: "Unknown",
  currentFocus: "Tracker unavailable",
  nextStepLabel: "Recovery",
  nextStepDetail: "Repair the master plan tracker so the API root can report the current build state.",
  releaseWorkflow: "validated-and-guarded",
  publicSurface: ["characters", "factions", "relationships", "discover"]
};

export const getRootStatus = async (): Promise<RootStatusPayload> => {
  try {
    const trackerPath = await resolveTrackerPath();
    const trackerSource = await readFile(trackerPath, "utf8");
    const entries = parseTracker(trackerSource);

    if (entries.length === 0) {
      return fallbackStatus;
    }

    const blockedEntry = getPreferredEntry(entries, "blocked");
    const inProgressEntry = getPreferredEntry(entries, "in-progress");
    const plannedEntry = getPreferredEntry(entries, "not-started");
    const focusEntry = blockedEntry ?? inProgressEntry ?? plannedEntry ?? entries.at(-1);

    if (!focusEntry) {
      return fallbackStatus;
    }

    const nextEntry = getNextEntry(entries, focusEntry);
    const focusStatus = blockedEntry ? "blocked" : inProgressEntry ? "active" : "planned";

    return {
      name: "book-worm-api",
      stage: `${toSlug(focusEntry.phase)}-${focusStatus}`,
      currentPhase: focusEntry.phase,
      currentStage: focusEntry.stage ?? focusEntry.phase,
      currentFocus: normalizeLabel(focusEntry.label),
      nextStepLabel: nextEntry ? normalizeLabel(nextEntry.label) : "No later tracker item",
      nextStepDetail: nextEntry ? `${nextEntry.phase}${nextEntry.stage ? ` · ${nextEntry.stage}` : ""}` : "No later tracker item is defined yet.",
      releaseWorkflow: "validated-and-guarded",
      publicSurface: ["characters", "factions", "relationships", "discover"]
    };
  } catch {
    return fallbackStatus;
  }
};