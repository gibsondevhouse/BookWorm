"use client";

import Link from "next/link";
import { useState } from "react";

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className="flex flex-col h-full overflow-y-auto bg-[rgba(228,220,206,0.98)] border-r border-border">
      {/* Brand & Collapse Button */}
      <div className="px-5 py-6 border-b border-border flex-shrink-0 flex items-center justify-between">
        <div className="text-lg font-bold tracking-wider text-ink">BookWorm</div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-subtle rounded transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg
            className="w-5 h-5 text-muted"
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
          <div className="px-4 py-4 flex-shrink-0 space-y-3">
            <button
              className="w-full px-4 py-2 bg-accent text-white font-serif font-bold rounded-lg hover:bg-[#7f4f24] transition-colors text-sm"
              aria-label="New chat"
            >
              + New Chat
            </button>
            <div className="relative">
              <input
                type="text"
                placeholder="Search…"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-ink placeholder-muted focus:outline-none focus:border-accent transition-colors"
                aria-label="Search chats"
              />
              <svg
                className="absolute right-3 top-2.5 w-4 h-4 text-muted pointer-events-none"
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
              className="block px-4 py-2 text-sm text-muted hover:text-ink hover:bg-subtle rounded-lg transition-colors text-center"
            >
              Settings
            </Link>
          </div>

          {/* Main Navigation */}
          <nav
            className="px-3 py-3 flex-shrink-0 space-y-1"
            aria-label="Main navigation"
          >
            <Link
              href="/"
              className="block px-4 py-2.5 text-sm text-muted hover:text-ink hover:bg-subtle rounded-lg transition-colors"
            >
              Chat
            </Link>
            <Link
              href="/admin/entities"
              className="block px-4 py-2.5 text-sm text-muted hover:text-ink hover:bg-subtle rounded-lg transition-colors"
            >
              Codex
            </Link>
            <Link
              href="/admin/review-inbox"
              className="block px-4 py-2.5 text-sm text-muted hover:text-ink hover:bg-subtle rounded-lg transition-colors"
            >
              Review Inbox
            </Link>
            <div className="pt-2">
              <div className="px-4 py-1 text-xs font-semibold text-muted uppercase tracking-wide">
                Collections
              </div>
              <div className="mt-2 space-y-1 pl-2 border-l border-border">
                <div className="px-4 py-2 text-sm text-muted hover:text-ink cursor-default">
                  Projects
                </div>
                <div className="px-4 py-2 text-sm text-muted hover:text-ink cursor-default">
                  Artifacts
                </div>
              </div>
            </div>
          </nav>

          {/* Recents Section */}
          <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
            <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide flex-shrink-0">
              Recents
            </div>
            <div className="mt-2 space-y-1">
              <div className="px-4 py-2 text-sm text-muted hover:text-ink hover:bg-subtle rounded-lg transition-colors cursor-default truncate">
                Character Development Guide
              </div>
              <div className="px-4 py-2 text-sm text-muted hover:text-ink hover:bg-subtle rounded-lg transition-colors cursor-default truncate">
                World Building Notes
              </div>
              <div className="px-4 py-2 text-sm text-muted hover:text-ink hover:bg-subtle rounded-lg transition-colors cursor-default truncate">
                Plot Outline for Act II
              </div>
              <div className="px-4 py-2 text-sm text-muted hover:text-ink hover:bg-subtle rounded-lg transition-colors cursor-default truncate">
                Dialogue Refinement Session
              </div>
              <div className="px-4 py-2 text-sm text-muted hover:text-ink hover:bg-subtle rounded-lg transition-colors cursor-default truncate">
                Chapter 5 First Draft
              </div>
            </div>
          </div>

          {/* User Profile Section (Bottom) */}
          <div className="px-4 py-4 border-t border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold">
                A
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink truncate">Author</div>
                <div className="text-xs text-muted truncate">author@example.com</div>
              </div>
            </div>
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="flex flex-col items-center py-4 space-y-4">
          <button className="p-2 bg-accent text-white rounded-lg hover:bg-[#7f4f24] transition-colors">
            +
          </button>
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold">
            A
          </div>
        </div>
      )}
    </aside>
  );
}
