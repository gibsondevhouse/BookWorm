import type { ReactElement, ReactNode } from "react";

import styles from "../../../app/admin/adminAccessibility.module.css";

type AdminSurfaceShellProps = {
  children: ReactNode;
};

export function AdminSurfaceShell({ children }: AdminSurfaceShellProps): ReactElement {
  return <div className={styles.shell}>{children}</div>;
}