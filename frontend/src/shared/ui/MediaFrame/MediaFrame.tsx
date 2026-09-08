import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import styles from "./MediaFrame.module.css";

export interface MediaFrameProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  caption?: ReactNode;
  aspectRatio?: CSSProperties["aspectRatio"];
  fit?: "contain" | "cover";
}

export function MediaFrame({
  aspectRatio = "16 / 9",
  caption,
  children,
  className,
  fit = "cover",
  style,
  ...props
}: MediaFrameProps) {
  return (
    <figure
      className={[styles.root, className].filter(Boolean).join(" ")}
      style={{ ...style, "--media-frame-ratio": aspectRatio } as CSSProperties}
      {...props}
    >
      <div className={styles.media} data-fit={fit}>
        {children}
      </div>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
