"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { sidebarNavigationConfig } from "./sidebarNavigationConfig";
import { getSidebarRouteState } from "./sidebarRouteState";

function getPrimaryNavClassName(isActive: boolean): string {
  return isActive
    ? "sidebar-link block rounded-2xl border border-[rgba(134,201,255,0.5)] bg-[linear-gradient(135deg,rgba(134,201,255,0.18),rgba(92,167,222,0.08))] px-4 py-3 text-sm text-text shadow-[0_0_0_1px_rgba(134,201,255,0.12)]"
    : "sidebar-link block rounded-2xl border border-transparent px-4 py-3 text-sm text-text-muted";
}

function getCodexToggleClassName(isActive: boolean): string {
  return isActive
    ? "sidebar-link flex w-full items-center justify-between rounded-2xl border border-[rgba(134,201,255,0.5)] bg-[linear-gradient(135deg,rgba(134,201,255,0.18),rgba(92,167,222,0.08))] px-4 py-3 text-sm text-text shadow-[0_0_0_1px_rgba(134,201,255,0.12)]"
    : "sidebar-link flex w-full items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm text-text-muted";
}

function getCodexItemClassName(isActive: boolean): string {
  return isActive
    ? "sidebar-link block rounded-xl border border-[rgba(134,201,255,0.42)] bg-[rgba(134,201,255,0.12)] px-3 py-2 text-sm text-text"
    : "sidebar-link block rounded-xl px-3 py-2 text-sm text-text-muted";
}

function getCollapsedPrimaryNavClassName(isActive: boolean): string {
  return isActive
    ? "sidebar-link flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(134,201,255,0.52)] bg-[linear-gradient(135deg,rgba(134,201,255,0.2),rgba(92,167,222,0.1))] text-text shadow-[0_0_0_1px_rgba(134,201,255,0.16)]"
    : "sidebar-link flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-text-muted";
}

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeState = getSidebarRouteState(pathname, searchParams.get("type"));
  const defaultCodexType = sidebarNavigationConfig.codexGroups[0].items[0].type;
  const collapsedCodexHref = `/admin/entities?type=${routeState.activeCodexType ?? defaultCodexType}`;

  return (
    <aside className="shell-panel sidebar-shell flex min-h-[18rem] flex-col overflow-y-auto rounded-[2rem] lg:h-full">
      <div className="relative flex shrink-0 items-center justify-between border-b border-border px-5 py-6">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(217,195,127,0.28)] bg-[linear-gradient(135deg,rgba(217,195,127,0.22),rgba(134,201,255,0.12))] text-accent shadow-[0_0_24px_rgba(134,201,255,0.16)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.7}
                  d="M5 19.25V6.75A1.75 1.75 0 016.75 5h5.1a4.15 4.15 0 013.1 1.39A4.15 4.15 0 0118.05 5h.2A1.75 1.75 0 0120 6.75v12.5a.75.75 0 01-1.09.67 8.6 8.6 0 00-6.91-.26.75.75 0 01-.49 0 8.6 8.6 0 00-6.42.16A.75.75 0 015 19.25z"
                />
              </svg>
            </div>
            <div>
              <div className="font-display text-xl font-semibold tracking-[0.28em] text-text">
                BookWorm
              </div>
              <div className="text-[0.68rem] uppercase tracking-[0.3em] text-text-muted">
                Ethereal writing shell
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="sidebar-link rounded-full border border-border bg-[rgba(9,18,31,0.48)] p-2 text-text-muted"
          aria-label="Toggle sidebar"
          aria-expanded={!isCollapsed}
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
          <div className="relative shrink-0 space-y-3 px-4 py-4">
            <button
              type="button"
              className="w-full rounded-2xl border border-[rgba(217,195,127,0.24)] bg-[linear-gradient(135deg,#86c9ff,#5ca7de)] px-4 py-3 text-sm font-semibold tracking-[0.18em] text-slate-950 shadow-[0_18px_36px_rgba(92,167,222,0.28)] transition-colors hover:bg-primary-dark"
              aria-label="New chat"
            >
              Open a new thread
            </button>
            <div className="sidebar-card relative rounded-2xl p-3">
              <div className="mb-2 text-[0.68rem] uppercase tracking-[0.28em] text-text-muted">
                Search the stacks
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search your folios"
                  className="w-full rounded-xl border border-border bg-[rgba(7,14,24,0.86)] px-3 py-2.5 text-sm text-text placeholder-text-muted focus:border-primary focus:outline-none"
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
              className="sidebar-link block rounded-2xl border border-border px-4 py-3 text-center text-sm text-text-muted"
            >
              Settings
            </Link>
          </div>

          <nav className="relative shrink-0 space-y-4 px-3 py-3" aria-label="Main navigation">
            <div>
              <div className="px-4 py-1 text-[0.68rem] uppercase tracking-[0.3em] text-text-muted">
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
                            <div key={group.label} className="sidebar-card rounded-xl p-2">
                              <div className="px-2 py-1 text-[0.62rem] uppercase tracking-[0.28em] text-text-muted">
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
            <div className="px-4 py-2 text-[0.68rem] uppercase tracking-[0.3em] text-text-muted">
              Recent Threads
            </div>
            <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
              {sidebarNavigationConfig.recentItems.map((item) => (
                <div
                  key={item}
                  className="sidebar-link cursor-default truncate rounded-2xl border border-transparent px-4 py-3 text-sm text-text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative shrink-0 border-t border-border px-4 py-4">
            <div className="sidebar-card flex items-center gap-3 rounded-[1.5rem] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d9c37f,#86c9ff)] text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(134,201,255,0.22)]">
                A
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-text">Author</div>
                <div className="truncate text-xs tracking-[0.16em] text-text-muted">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(217,195,127,0.28)] bg-[linear-gradient(135deg,rgba(217,195,127,0.22),rgba(134,201,255,0.12))] text-accent shadow-[0_0_24px_rgba(134,201,255,0.16)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.7}
                  d="M5 19.25V6.75A1.75 1.75 0 016.75 5h5.1a4.15 4.15 0 013.1 1.39A4.15 4.15 0 0118.05 5h.2A1.75 1.75 0 0120 6.75v12.5a.75.75 0 01-1.09.67 8.6 8.6 0 00-6.91-.26.75.75 0 01-.49 0 8.6 8.6 0 00-6.42.16A.75.75 0 015 19.25z"
                />
              </svg>
            </div>
            <button
              type="button"
              className="rounded-2xl bg-[linear-gradient(135deg,#86c9ff,#5ca7de)] p-3 text-slate-950 shadow-[0_18px_36px_rgba(92,167,222,0.28)]"
              aria-label="New chat"
            >
              +
            </button>

            <nav aria-label="Collapsed main navigation" className="flex flex-col items-center gap-2">
              <Link
                href="/"
                aria-label="Chat"
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
              </Link>

              <Link
                href={collapsedCodexHref}
                aria-label="Codex"
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
              </Link>

              <Link
                href="/admin/review-inbox"
                aria-label="Review Inbox"
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
              </Link>
            </nav>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d9c37f,#86c9ff)] text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(134,201,255,0.22)]">
            A
          </div>
        </div>
      )}
    </aside>
  );
}
