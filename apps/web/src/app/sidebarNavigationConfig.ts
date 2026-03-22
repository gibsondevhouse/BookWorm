const primaryNavItems = [
  { id: "chat", label: "Chat", kind: "link", href: "/" },
  { id: "codex", label: "Codex", kind: "link", href: "/admin/codex" },
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
  primaryNavItems,
  recentItems,
} as const;