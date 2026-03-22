const codexGroups = [
  {
    label: "Story",
    items: [
      { label: "Characters", type: "CHARACTER" },
      { label: "Factions", type: "FACTION" },
      { label: "Events", type: "EVENT" },
    ],
  },
  {
    label: "World",
    items: [
      { label: "Locations", type: "LOCATION" },
      { label: "Creatures", type: "CREATURE" },
      { label: "Timeline Eras", type: "TIMELINE_ERA" },
    ],
  },
  {
    label: "Lore",
    items: [
      { label: "Belief Systems", type: "BELIEF_SYSTEM" },
      { label: "Languages", type: "LANGUAGE" },
      { label: "Political Bodies", type: "POLITICAL_BODY" },
      { label: "Secrets", type: "SECRET" },
      { label: "Reveals", type: "REVEAL" },
      { label: "Artifacts", type: "ARTIFACT" },
    ],
  },
] as const;

const primaryNavItems = [
  { id: "chat", label: "Chat", kind: "link", href: "/" },
  { id: "codex", label: "Codex", kind: "disclosure" },
  { id: "reviewInbox", label: "Review Inbox", kind: "link", href: "/admin/review-inbox" },
] as const;

const recentItems = [
  "Character Development Guide",
  "World Building Notes",
  "Plot Outline for Act II",
  "Dialogue Refinement Session",
  "Chapter 5 First Draft",
] as const;

export const sidebarNavigationConfig = {
  codexGroups,
  primaryNavItems,
  recentItems,
} as const;