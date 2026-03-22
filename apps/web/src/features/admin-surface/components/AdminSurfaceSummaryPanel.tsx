import type { AriaAttributes, ReactElement, ReactNode } from "react";

import styles from "../../../app/admin/adminAccessibility.module.css";

type AdminSurfaceSummaryPanelProps = {
  title: ReactNode;
  children: ReactNode;
  ariaLive?: AriaAttributes["aria-live"];
  ariaAtomic?: boolean;
};

export function AdminSurfaceSummaryPanel({
  title,
  children,
  ariaLive,
  ariaAtomic
}: AdminSurfaceSummaryPanelProps): ReactElement {
  return (
    <div className={styles.summaryPanel} aria-live={ariaLive} aria-atomic={ariaAtomic}>
      <h3 className={styles.summaryTitle}>{title}</h3>
      {children}
    </div>
  );
}