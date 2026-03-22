"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useMouseSpotlight } from "./hooks/useMouseSpotlight";
import { sidebarNavigationConfig } from "./sidebarNavigationConfig";
import { getSidebarRouteState } from "./sidebarRouteState";

function getPrimaryNavClassName(isActive: boolean): string {
  return isActive
    ? "sidebar-link tactile-press transition-spring block rounded-lg border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.4)] px-4 py-3 text-sm font-medium text-text"
    : "sidebar-link tactile-press transition-spring block rounded-lg px-4 py-3 text-sm text-muted-foreground/80 hover:text-foreground";
}

function getCodexToggleClassName(isActive: boolean): string {
  return isActive
    ? "sidebar-link tactile-press transition-spring flex w-full items-center justify-between rounded-lg border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.4)] px-4 py-3 text-sm font-medium text-text"
    : "sidebar-link tactile-press transition-spring flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm text-muted-foreground/80 hover:text-foreground";
}

function getCodexItemClassName(isActive: boolean): string {
  return isActive
    ? "sidebar-link tactile-press transition-spring block rounded-lg border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.4)] px-3 py-2 text-sm font-medium text-text"
    : "sidebar-link tactile-press transition-spring block rounded-lg px-3 py-2 text-sm text-muted-foreground/80 hover:text-foreground";
}

function getCollapsedPrimaryNavClassName(isActive: boolean): string {
  const collapsedNavBaseClassName =
    "sidebar-link tactile-press transition-spring group relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-400 hover:text-slate-100 focus-visible:text-slate-100";

  return isActive
    ? `${collapsedNavBaseClassName} border-[rgba(134,201,255,0.35)] bg-[var(--color-primary-glow)] text-[var(--color-primary)] shadow-[0_0_15px_var(--color-primary-glow)] opacity-100`
    : `${collapsedNavBaseClassName} hover:border-[var(--color-border-glass)] hover:bg-[rgba(10,16,29,0.48)]`;
}

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const sidebarSpotlight = useMouseSpotlight<HTMLElement>();
  const searchSpotlight = useMouseSpotlight<HTMLDivElement>();
  const profileSpotlight = useMouseSpotlight<HTMLDivElement>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeState = getSidebarRouteState(pathname, searchParams.get("type"));
  const defaultCodexType = sidebarNavigationConfig.codexGroups[0].items[0].type;
  const collapsedCodexHref = `/admin/entities?type=${routeState.activeCodexType ?? defaultCodexType}`;
  const collapsedTooltipClassName =
    "pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.92)] px-2.5 py-1.5 text-xs font-medium tracking-[0.04em] text-[var(--color-foreground)] opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100";

  return (
    <aside
      ref={sidebarSpotlight.spotlightRef}
      onPointerMove={sidebarSpotlight.onPointerMove}
      onPointerLeave={sidebarSpotlight.onPointerLeave}
      className={`sidebar-shell spotlight-surface scroll-mask-y flex min-h-[18rem] w-full flex-col overflow-y-auto rounded-[2rem] transition-all duration-300 ease-in-out lg:h-full lg:overflow-hidden ${
        isCollapsed ? "lg:w-20" : "lg:w-80"
      }`}
    >
      <div
        className={`relative flex shrink-0 items-center border-b border-[var(--color-border-glass)] py-6 ${
          isCollapsed ? "justify-center px-2" : "justify-between px-5"
        }`}
      >
        <div className={isCollapsed ? "mb-0 flex items-center" : undefined}>
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "mb-2 gap-3"}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(217,195,127,0.28)] bg-[rgba(10,16,29,0.42)] text-accent shadow-[0_0_20px_rgba(134,201,255,0.14)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.7}
                  d="M5 19.25V6.75A1.75 1.75 0 016.75 5h5.1a4.15 4.15 0 013.1 1.39A4.15 4.15 0 0118.05 5h.2A1.75 1.75 0 0120 6.75v12.5a.75.75 0 01-1.09.67 8.6 8.6 0 00-6.91-.26.75.75 0 01-.49 0 8.6 8.6 0 00-6.42.16A.75.75 0 015 19.25z"
                />
              </svg>
            </div>
            {!isCollapsed && (
              <div>
                <div className="font-display text-xl font-semibold tracking-[0.28em] text-text">
                  BookWorm
                </div>
                <div className="text-[0.68rem] uppercase tracking-[0.3em] text-text-muted">
                  Ethereal writing shell
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`sidebar-link tactile-press transition-spring rounded-full p-2 text-muted-foreground/80 hover:text-foreground ${
            isCollapsed ? "absolute right-2 top-4" : ""
          }`}
          aria-label="Toggle sidebar"
          aria-expanded={!isCollapsed}
          title="Toggle sidebar"
        >
          <svg
            className="h-5 w-5 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="relative shrink-0 space-y-3 px-4 pb-4 pt-6">
            <button
              type="button"
              className="sidebar-link tactile-press transition-spring flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.4)] px-4 py-3 text-sm font-medium tracking-[0.12em] text-foreground"
              aria-label="New chat"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
              </svg>
              Open a new thread
            </button>
            <div
              ref={searchSpotlight.spotlightRef}
              onPointerMove={searchSpotlight.onPointerMove}
              onPointerLeave={searchSpotlight.onPointerLeave}
              className="spotlight-surface relative mb-5 rounded-2xl border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.36)] p-3 focus-within:shadow-[0_0_0_1px_rgba(134,201,255,0.22),0_0_20px_var(--color-primary-glow)]"
            >
              <div className="mb-2 text-[0.68rem] uppercase tracking-[0.28em] text-text-muted">
                Search the stacks
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search your folios"
                  className="w-full rounded-xl border border-[var(--color-border-glass)] bg-transparent px-3 py-2.5 text-sm text-text placeholder-text-muted focus:outline-none"
                  aria-label="Search chats"
                />
                <svg
                  className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            <Link
              href="/settings"
              className="sidebar-link link-secondary-neural tactile-press transition-spring inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7zm7-3.5a7.06 7.06 0 00-.12-1.3l2.08-1.61-2-3.46-2.53 1a7.06 7.06 0 00-2.25-1.3l-.38-2.68h-4l-.38 2.68a7.06 7.06 0 00-2.25 1.3l-2.53-1-2 3.46 2.08 1.61A7.47 7.47 0 005 12c0 .44.04.87.12 1.3L3.04 14.9l2 3.46 2.53-1a7.06 7.06 0 002.25 1.3l.38 2.68h4l.38-2.68a7.06 7.06 0 002.25-1.3l2.53 1 2-3.46-2.08-1.6c.08-.43.12-.86.12-1.3z"
                />
              </svg>
              Settings
            </Link>
          </div>

          <nav className="relative shrink-0 space-y-4 px-3 py-3" aria-label="Main navigation">
            <div>
              <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
                Navigate
              </div>
              <div className="mt-2 space-y-1.5">
                {sidebarNavigationConfig.primaryNavItems.map((item) => {
                  if (item.kind === "link") {
                    const isActive = routeState.activePrimaryNavId === item.id;

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={getPrimaryNavClassName(isActive)}
                      >
                        {item.label}
                      </Link>
                    );
                  }

                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        onClick={() => setIsCodexOpen(!isCodexOpen)}
                        aria-expanded={isCodexOpen}
                        className={getCodexToggleClassName(routeState.isCodexContext)}
                      >
                        <span>{item.label}</span>
                        <svg
                          className={`h-4 w-4 transition-transform ${isCodexOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {isCodexOpen && (
                        <div className="mt-1 space-y-3 pl-3">
                          {sidebarNavigationConfig.codexGroups.map((group) => (
                            <div key={group.label} className="rounded-xl border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.32)] p-2">
                              <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
                                {group.label}
                              </div>
                              <div className="mt-1 space-y-0.5">
                                {group.items.map((codexItem) => {
                                  const isCodexItemActive =
                                    routeState.isCodexContext && routeState.activeCodexType === codexItem.type;

                                  return (
                                    <Link
                                      key={codexItem.type}
                                      href={`/admin/entities?type=${codexItem.type}`}
                                      aria-current={isCodexItemActive ? "page" : undefined}
                                      className={getCodexItemClassName(isCodexItemActive)}
                                    >
                                      {codexItem.label}
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="relative flex min-h-0 flex-1 flex-col px-3 py-3">
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
              Recent Threads
            </div>
            <div className="scroll-mask-y mt-2 flex-1 space-y-1 overflow-y-auto">
              {sidebarNavigationConfig.recentItems.map((item, index) => (
                <div
                  key={item}
                  style={{ "--stagger": index } as CSSProperties}
                  className="sidebar-link stagger-fade-up truncate rounded-lg px-4 py-3 text-sm text-muted-foreground/80 hover:text-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative shrink-0 border-t border-[var(--color-border-glass)] px-4 py-5">
            <div
              ref={profileSpotlight.spotlightRef}
              onPointerMove={profileSpotlight.onPointerMove}
              onPointerLeave={profileSpotlight.onPointerLeave}
              className="sidebar-link spotlight-surface flex items-center gap-3 rounded-[1.5rem] border border-[var(--color-border-glass)] bg-[rgba(10,16,29,0.34)] p-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(217,195,127,0.24)] bg-[rgba(10,16,29,0.44)] text-sm font-bold text-accent shadow-[0_0_22px_rgba(134,201,255,0.16)]">
                A
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text">Author</div>
                <div className="truncate text-xs text-muted-foreground">
                  author@example.com
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="relative flex flex-1 flex-col items-center justify-between px-3 py-4">
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              className="sidebar-link tactile-press transition-spring group relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-400 hover:border-[var(--color-border-glass)] hover:bg-[rgba(10,16,29,0.48)] hover:text-slate-100 focus-visible:text-slate-100"
              aria-label="New chat"
              title="Open a new thread"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
              </svg>
              <span className={collapsedTooltipClassName}>Open a new thread</span>
            </button>

            <nav aria-label="Collapsed main navigation" className="flex flex-col items-center gap-2">
              <Link
                href="/"
                aria-label="Chat"
                title="Chat"
                aria-current={routeState.activePrimaryNavId === "chat" ? "page" : undefined}
                className={getCollapsedPrimaryNavClassName(routeState.activePrimaryNavId === "chat")}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.9}
                    d="M8 10h8m-8 4h5m-9 5h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1z"
                  />
                </svg>
                <span className="sr-only">Chat</span>
                <span className={collapsedTooltipClassName}>Chat</span>
              </Link>

              <Link
                href={collapsedCodexHref}
                aria-label="Codex"
                title="Codex"
                aria-current={routeState.activePrimaryNavId === "codex" ? "page" : undefined}
                className={getCollapsedPrimaryNavClassName(routeState.activePrimaryNavId === "codex")}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M5 6.75A1.75 1.75 0 016.75 5h5.1a4.15 4.15 0 013.1 1.39A4.15 4.15 0 0118.05 5h.2A1.75 1.75 0 0120 6.75v12.5a.75.75 0 01-1.09.67 8.6 8.6 0 00-6.91-.26.75.75 0 01-.49 0 8.6 8.6 0 00-6.42.16A.75.75 0 015 19.25V6.75z"
                  />
                </svg>
                <span className="sr-only">Codex</span>
                <span className={collapsedTooltipClassName}>Codex</span>
              </Link>

              <Link
                href="/admin/review-inbox"
                aria-label="Review Inbox"
                title="Review Inbox"
                aria-current={routeState.activePrimaryNavId === "reviewInbox" ? "page" : undefined}
                className={getCollapsedPrimaryNavClassName(routeState.activePrimaryNavId === "reviewInbox")}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.9}
                    d="M7 8h10M7 12h10m-6 4h6M6 3h9l4 4v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z"
                  />
                </svg>
                <span className="sr-only">Review Inbox</span>
                <span className={collapsedTooltipClassName}>Review Inbox</span>
              </Link>
            </nav>
          </div>
          <div className="flex w-full justify-center pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d9c37f,#86c9ff)] text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(134,201,255,0.22)]">
              A
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
