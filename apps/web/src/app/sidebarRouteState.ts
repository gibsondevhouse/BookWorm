type SidebarPrimaryNavId = "chat" | "codex" | "reviewInbox";

type SidebarRouteState = {
  activePrimaryNavId: SidebarPrimaryNavId | null;
};

export function getSidebarRouteState(pathname: string): SidebarRouteState {
  const isChatRoute = pathname === "/";
  const isCodexContext = pathname.startsWith("/admin/codex") || pathname.startsWith("/admin/entities");
  const isReviewInboxRoute = pathname.startsWith("/admin/review-inbox");

  let activePrimaryNavId: SidebarPrimaryNavId | null = null;
  if (isChatRoute) {
    activePrimaryNavId = "chat";
  } else if (isCodexContext) {
    activePrimaryNavId = "codex";
  } else if (isReviewInboxRoute) {
    activePrimaryNavId = "reviewInbox";
  }

  return {
    activePrimaryNavId,
  };
}