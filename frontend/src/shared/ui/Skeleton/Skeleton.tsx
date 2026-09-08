import type { CSSProperties, HTMLAttributes } from "react";

import styles from "./Skeleton.module.css";

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: "small" | "medium" | "round";
}

export function Skeleton({
  className,
  height,
  radius = "medium",
  style,
  width,
  ...props
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={[styles.root, styles[radius], className]
        .filter(Boolean)
        .join(" ")}
      style={{ ...style, width, height }}
      {...props}
    />
  );
}
