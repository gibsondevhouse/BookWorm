export const phase0FixtureConfig = {
  authorAdmin: {
    email: "author@example.com",
    displayName: "Phase 0 Author",
    password: "phase0-author-password"
  },
  editor: {
    email: "editor@example.com",
    displayName: "Phase 0 Editor",
    password: "phase0-editor-password"
  },
  characterSlug: "captain-mirelle-vale",
  factionSlug: "river-guild",
  releaseSlug: "phase-0-initial-release",
  factionName: "River Guild",
  factionReleasedSummary: "A trade and transport guild that controls most sanctioned movement along the interior river system.",
  factionHiddenDraftSummary: "A revised guild charter draft that should stay hidden until a later release is activated.",
  relationshipType: "CAPTAINS_FOR",
  relationshipReleasedMetadata: {
    note: "Captain Mirelle Vale is a sanctioned captain operating under the River Guild charter.",
    status: "canon"
  },
  relationshipDraftMetadata: {
    note: "Captain Mirelle Vale is being reconsidered for a leadership role within the River Guild.",
    status: "draft"
  },
  releasedSummary: "A disciplined river captain whose published history anchors the Phase 0 public read path.",
  hiddenDraftSummary: "An updated draft summary that should remain hidden until a later release is explicitly activated."
} as const;