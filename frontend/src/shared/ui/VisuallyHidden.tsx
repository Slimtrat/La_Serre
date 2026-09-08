import "./visually-hidden.css";

import type { HTMLAttributes, PropsWithChildren } from "react";

export function VisuallyHidden({
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLSpanElement>>) {
  return (
    <span className="visually-hidden" {...props}>
      {children}
    </span>
  );
}
