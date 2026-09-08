import type { HTMLAttributes, PropsWithChildren } from "react";

import styles from "./Card.module.css";

export interface CardProps
  extends PropsWithChildren<HTMLAttributes<HTMLElement>> {
  as?: "article" | "section" | "div";
  padding?: "none" | "small" | "medium" | "large";
  elevated?: boolean;
}

export function Card({
  as: Component = "article",
  children,
  className,
  elevated = false,
  padding = "medium",
  ...props
}: CardProps) {
  return (
    <Component
      className={[
        styles.root,
        styles[padding],
        elevated ? styles.elevated : undefined,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}
