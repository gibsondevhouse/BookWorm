"use client";

import Link from "next/link";
import type { ReactElement } from "react";

import styles from "../adminAccessibility.module.css";
import { AdminSurfaceHeader } from "../../../features/admin-surface/components/AdminSurfaceHeader";
import { AdminSurfaceSectionCard } from "../../../features/admin-surface/components/AdminSurfaceSectionCard";
import { AdminSurfaceShell } from "../../../features/admin-surface/components/AdminSurfaceShell";
import { AdminSurfaceSummaryPanel } from "../../../features/admin-surface/components/AdminSurfaceSummaryPanel";

type CodexQuickLink = {
  label: string;
  href: string;
};

type CodexQuickLinkGroup = {
  title: string;
  links: CodexQuickLink[];
};

const codexQuickLinkGroups: CodexQuickLinkGroup[] = [
  {
    title: "Story",
    links: [
      { label: "Characters", href: "/admin/entities?type=CHARACTER" },
      { label: "Factions", href: "/admin/entities?type=FACTION" },
      { label: "Events", href: "/admin/entities?type=EVENT" }
    ]
  },
  {
    title: "World",
    links: [
      { label: "Locations", href: "/admin/entities?type=LOCATION" },
      { label: "Creatures", href: "/admin/entities?type=CREATURE" },
      { label: "Timeline Eras", href: "/admin/entities?type=TIMELINE_ERA" }
    ]
  },
  {
    title: "Lore",
    links: [
      { label: "Belief Systems", href: "/admin/entities?type=BELIEF_SYSTEM" },
      { label: "Languages", href: "/admin/entities?type=LANGUAGE" },
      { label: "Political Bodies", href: "/admin/entities?type=POLITICAL_BODY" },
      { label: "Secrets", href: "/admin/entities?type=SECRET" },
      { label: "Reveals", href: "/admin/entities?type=REVEAL" },
      { label: "Artifacts", href: "/admin/entities?type=ARTIFACT" }
    ]
  }
];

export function CodexDashboardClient(): ReactElement {
  const totalLinks = codexQuickLinkGroups.reduce((count, group) => count + group.links.length, 0);

  return (
    <main className={styles.page}>
      <AdminSurfaceShell>
        <header className={styles.header}>
          <AdminSurfaceHeader
            title="Codex Dashboard"
            description="Jump directly into codex entity workflows by type. Each quick link opens the existing entity surface with a preselected type filter."
          />
        </header>

        <AdminSurfaceSectionCard headingId="codex-overview-title" title="Overview">
          <AdminSurfaceSummaryPanel title="Codex Access Summary">
            <ul className={styles.summaryList}>
              <li>{codexQuickLinkGroups.length} codex domains are available.</li>
              <li>{totalLinks} quick links connect to the existing entity management flows.</li>
            </ul>
          </AdminSurfaceSummaryPanel>
        </AdminSurfaceSectionCard>

        <AdminSurfaceSectionCard
          headingId="codex-quick-links-title"
          title="Quick Links"
          ariaDescribedBy="codex-quick-links-description"
        >
          <p id="codex-quick-links-description" className={styles.helperText}>
            Choose a codex domain card, then select a type to continue directly in the entities view.
          </p>
          <div className={styles.controlsRow}>
            {codexQuickLinkGroups.map((group) => (
              <section key={group.title} className={styles.sectionCard} aria-labelledby={`${group.title.toLowerCase()}-quick-links`}>
                <h3 id={`${group.title.toLowerCase()}-quick-links`} className={styles.sectionTitle}>
                  {group.title}
                </h3>
                <ul className={styles.list}>
                  {group.links.map((link) => (
                    <li key={link.href} className={styles.listItem}>
                      <Link href={link.href} className={styles.rowButton}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </AdminSurfaceSectionCard>
      </AdminSurfaceShell>
    </main>
  );
}
