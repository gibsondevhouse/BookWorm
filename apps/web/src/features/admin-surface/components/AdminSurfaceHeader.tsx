import type { ReactElement, ReactNode, Ref } from "react";

import styles from "../../../app/admin/adminAccessibility.module.css";

type AdminSurfaceHeaderProps = {
  title: ReactNode;
  description: ReactNode;
  titleId?: string;
  titleRef?: Ref<HTMLHeadingElement>;
  titleTabIndex?: number;
};

export function AdminSurfaceHeader({
  title,
  description,
  titleId,
  titleRef,
  titleTabIndex
}: AdminSurfaceHeaderProps): ReactElement {
  return (
    <>
      <h1 id={titleId} ref={titleRef} tabIndex={titleTabIndex}>
        {title}
      </h1>
      <p className={styles.muted}>{description}</p>
    </>
  );
}