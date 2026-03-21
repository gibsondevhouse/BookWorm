"use client";

import Link from "next/link";
import { useState } from "react";

const navigationLinks = [
  { href: "/", label: "Chat" },
  { href: "/admin/entities", label: "Codex" },
  { href: "/admin/review-inbox", label: "Review Inbox" }
];

const collectionItems = ["Projects", "Artifacts"];

const recentItems = [
  "Character Development Guide",
  "World Building Notes",
  "Plot Outline for Act II",
  "Dialogue Refinement Session",
  "Chapter 5 First Draft"
];

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
                {navigationLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="sidebar-link block rounded-2xl border border-transparent px-4 py-3 text-sm text-text-muted"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="sidebar-card rounded-[1.5rem] p-3">
              <div className="px-1 py-1 text-[0.68rem] uppercase tracking-[0.3em] text-text-muted">
                Collections
              </div>
              <div className="mt-2 space-y-1 border-l border-border pl-3">
                {collectionItems.map((item) => (
                  <div
                    key={item}
                    className="sidebar-link cursor-default rounded-xl px-3 py-2 text-sm text-text-muted"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </nav>

          <div className="relative flex min-h-0 flex-1 flex-col px-3 py-3">
            <div className="px-4 py-2 text-[0.68rem] uppercase tracking-[0.3em] text-text-muted">
              Recents
            </div>
            <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
              {recentItems.map((item) => (
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
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d9c37f,#86c9ff)] text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(134,201,255,0.22)]">
            A
          </div>
        </div>
      )}
    </aside>
  );
}
