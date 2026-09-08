import { useId, type HTMLAttributes, type ReactNode } from "react";

import styles from "./ErrorState.module.css";

export interface ErrorStateProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function ErrorState({
  action,
  className,
  description,
  icon,
  title,
  ...props
}: ErrorStateProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <section
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={[styles.root, className].filter(Boolean).join(" ")}
      role="alert"
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
