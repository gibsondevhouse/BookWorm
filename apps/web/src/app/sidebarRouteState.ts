type SidebarPrimaryNavId = "chat" | "codex" | "reviewInbox";

type SidebarRouteState = {
  activePrimaryNavId: SidebarPrimaryNavId | null;
  isCodexContext: boolean;
  activeCodexType: string | null;
};

export function getSidebarRouteState(pathname: string, codexEntityTypeParam: string | null): SidebarRouteState {
  const isChatRoute = pathname === "/";
  const isCodexContext = pathname.startsWith("/admin/entities");
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
    isCodexContext,
    activeCodexType: isCodexContext ? codexEntityTypeParam : null,
  };
}