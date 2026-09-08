import type { HTMLAttributes, PropsWithChildren } from "react";

import styles from "./Badge.module.css";

export interface BadgeProps
  extends PropsWithChildren<HTMLAttributes<HTMLSpanElement>> {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}

export function Badge({
  children,
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={[styles.root, styles[tone], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
