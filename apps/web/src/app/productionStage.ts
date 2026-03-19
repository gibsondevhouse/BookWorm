import { access, readFile } from "node:fs/promises";
import path from "node:path";

type TrackerEntry = {
  phase: string;
  stage: string | null;
  status: "completed" | "in-progress" | "not-started" | "blocked";
  label: string;
};

type ProductionStage = {
  tone: "complete" | "active" | "blocked";
  badge: string;
  headline: string;
  summary: string;
  checkpoints: string[];
  metrics: Array<{
    label: string;
    value: string;
  }>;
  nextStepLabel: string;
  nextStepDetail: string;
};

const trackerRelativePath = path.join("docs", "build-plans", "master-plan-tracker.md");

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

const resolveTrackerPath = async (): Promise<string> => {
  const candidates = [
    path.resolve(process.cwd(), trackerRelativePath),
    path.resolve(process.cwd(), "..", "..", trackerRelativePath)
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

const getOverviewCounts = (entries: TrackerEntry[]): { completedStages: number; totalStages: number; completedParts: number; totalParts: number } => {
  const stageEntries = entries.filter((entry) => entry.label.includes("Stage") && entry.label.includes("Overview"));
  const partEntries = entries.filter((entry) => entry.label.startsWith("Part "));

  return {
    completedStages: stageEntries.filter((entry) => entry.status === "completed").length,
    totalStages: stageEntries.length,
    completedParts: partEntries.filter((entry) => entry.status === "completed").length,
    totalParts: partEntries.length
  };
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

const formatCompletedState = (entries: TrackerEntry[]): ProductionStage => {
  const phaseEntries = entries.filter((entry) => entry.label.includes("Phase") && entry.label.includes("Overview"));
  const lastPhase = phaseEntries.at(-1)?.phase ?? "Current Build";
  const nextPhase = phaseEntries.find((entry) => entry.status === "not-started");
  const counts = getOverviewCounts(entries);

  return {
    tone: "complete",
    badge: `${lastPhase} · Complete`,
    headline: `${lastPhase} is complete.`,
    summary:
      "The repository, local runtime, auth foundation, release-aware data model, and first vertical slice have all been verified against the current plan.",
    checkpoints: [
      `${counts.completedStages} of ${counts.totalStages} stage overviews are complete.`,
      `${counts.completedParts} of ${counts.totalParts} tracked parts are complete.`,
      "The next step is to define and start the next implementation phase rather than extend Phase 0 further."
    ],
    metrics: [
      {
        label: "Current phase",
        value: lastPhase
      },
      {
        label: "Stages complete",
        value: `${counts.completedStages}/${counts.totalStages}`
      },
      {
        label: "Parts complete",
        value: `${counts.completedParts}/${counts.totalParts}`
      }
    ],
    nextStepLabel: "Next planned phase",
    nextStepDetail: nextPhase ? nextPhase.phase : "No later phase is defined in the tracker yet."
  };
};

const formatActiveState = (entries: TrackerEntry[]): ProductionStage => {
  const blockedEntry = getPreferredEntry(entries, "blocked");
  const inProgressEntry = getPreferredEntry(entries, "in-progress");
  const plannedEntry = getPreferredEntry(entries, "not-started");
  const focusEntry = blockedEntry ?? inProgressEntry ?? plannedEntry;

  if (!focusEntry) {
    return formatCompletedState(entries);
  }

  const nextEntry = getNextEntry(entries, focusEntry);

  const counts = getOverviewCounts(entries);
  const stageLabel = focusEntry.stage ? `${focusEntry.phase} · ${focusEntry.stage}` : focusEntry.phase;
  const actionLabel = blockedEntry ? "blocked" : inProgressEntry ? "in progress" : "next";
  const nextStepLabel = nextEntry ? nextEntry.label.replace(/ Overview$/, "") : "Next planned phase";
  const nextStepDetail = nextEntry
    ? `${nextEntry.phase}${nextEntry.stage ? ` · ${nextEntry.stage}` : ""}`
    : "No later tracker item is defined yet.";

  return {
    tone: blockedEntry ? "blocked" : "active",
    badge: `${stageLabel} · ${actionLabel}`,
    headline: focusEntry.label.replace(/ Overview$/, ""),
    summary: blockedEntry
      ? "The dashboard is showing a blocked tracker item, which means production planning needs intervention before implementation can continue."
      : inProgressEntry
      ? "The dashboard is showing the currently active build stage from the tracker, not a frozen scaffold message."
      : "The landing page is showing the next planned build stage from the tracker because no active in-progress item is marked.",
    checkpoints: [
      `${counts.completedParts} of ${counts.totalParts} tracked parts are complete.`,
      `Current phase: ${focusEntry.phase}.`,
      focusEntry.stage ? `Current stage: ${focusEntry.stage}.` : "No stage heading is associated with the current tracker item."
    ],
    metrics: [
      {
        label: "Current phase",
        value: focusEntry.phase
      },
      {
        label: "Stage focus",
        value: focusEntry.stage ?? "Not specified"
      },
      {
        label: "Parts complete",
        value: `${counts.completedParts}/${counts.totalParts}`
      }
    ],
    nextStepLabel,
    nextStepDetail
  };
};

export const productionStage = async (): Promise<ProductionStage> => {
  const trackerPath = await resolveTrackerPath();
  const trackerSource = await readFile(trackerPath, "utf8");
  const entries = parseTracker(trackerSource);

  if (entries.length === 0) {
    return {
      tone: "blocked",
      badge: "Tracker unavailable",
      headline: "Production stage is not available.",
      summary: "The master plan tracker could not be parsed, so the page cannot determine the current build stage.",
      checkpoints: ["Check the master plan tracker formatting."],
      metrics: [
        {
          label: "Tracker state",
          value: "Unavailable"
        }
      ],
      nextStepLabel: "Recovery",
      nextStepDetail: "Repair the tracker structure so the dashboard can read the current build stage."
    };
  }

  const hasIncompleteWork = entries.some((entry) => entry.status !== "completed");

  return hasIncompleteWork ? formatActiveState(entries) : formatCompletedState(entries);
};