"use client";

import Link from "next/link";
import { useState } from "react";

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-r border-border bg-sidebar-bg">
      {/* Brand & Collapse Button */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-6">
        <div className="text-lg font-bold tracking-wider text-text">BookWorm</div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded p-1 hover:bg-subtle"
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
          {/* Top Section: New Chat, Search, Settings */}
          <div className="shrink-0 space-y-3 px-4 py-4">
            <button
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-dark"
              aria-label="New chat"
            >
              + New Chat
            </button>
            <div className="relative">
              <input
                type="text"
                placeholder="Search…"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                aria-label="Search chats"
              />
              <svg
                className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-text-muted"
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
            <Link
              href="/settings"
              className="block rounded-lg px-4 py-2 text-center text-sm text-text-muted hover:bg-subtle hover:text-text"
            >
              Settings
            </Link>
          </div>

          {/* Main Navigation */}
          <nav
            className="shrink-0 space-y-1 px-3 py-3"
            aria-label="Main navigation"
          >
            <Link
              href="/"
              className="block rounded-lg px-4 py-2.5 text-sm text-text-muted hover:bg-subtle hover:text-text"
            >
              Chat
            </Link>
            <Link
              href="/admin/entities"
              className="block rounded-lg px-4 py-2.5 text-sm text-text-muted hover:bg-subtle hover:text-text"
            >
              Codex
            </Link>
            <Link
              href="/admin/review-inbox"
              className="block rounded-lg px-4 py-2.5 text-sm text-text-muted hover:bg-subtle hover:text-text"
            >
              Review Inbox
            </Link>
            <div className="pt-2">
              <div className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Collections
              </div>
              <div className="mt-2 space-y-1 pl-2 border-l border-border">
                <div className="cursor-default px-4 py-2 text-sm text-text-muted hover:text-text">
                  Projects
                </div>
                <div className="cursor-default px-4 py-2 text-sm text-text-muted hover:text-text">
                  Artifacts
                </div>
              </div>
            </div>
          </nav>

          {/* Recents Section */}
          <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
            <div className="shrink-0 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Recents
            </div>
            <div className="mt-2 space-y-1">
              <div className="cursor-default truncate rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-subtle hover:text-text">
                Character Development Guide
              </div>
              <div className="cursor-default truncate rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-subtle hover:text-text">
                World Building Notes
              </div>
              <div className="cursor-default truncate rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-subtle hover:text-text">
                Plot Outline for Act II
              </div>
              <div className="cursor-default truncate rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-subtle hover:text-text">
                Dialogue Refinement Session
              </div>
              <div className="cursor-default truncate rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-subtle hover:text-text">
                Chapter 5 First Draft
              </div>
            </div>
          </div>

          {/* User Profile Section (Bottom) */}
          <div className="shrink-0 border-t border-border px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                A
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text truncate">Author</div>
                <div className="truncate text-xs text-text-muted">author@example.com</div>
              </div>
            </div>
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="flex flex-col items-center py-4 space-y-4">
          <button className="rounded-lg bg-primary p-2 text-white hover:bg-primary-dark">
            +
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            A
          </div>
        </div>
      )}
    </aside>
  );
}
