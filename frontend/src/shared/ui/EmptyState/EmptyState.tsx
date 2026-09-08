import { useId, type HTMLAttributes, type ReactNode } from "react";

import styles from "./EmptyState.module.css";

export interface EmptyStateProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  action,
  className,
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <section
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={[styles.root, className].filter(Boolean).join(" ")}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      ) : null}
      <h2 className={styles.title} id={titleId}>
        {title}
      </h2>
      {description ? (
        <p className={styles.description} id={descriptionId}>
          {description}
        </p>
      ) : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  );
}
