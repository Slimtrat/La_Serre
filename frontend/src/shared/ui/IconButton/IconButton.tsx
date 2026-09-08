import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./IconButton.module.css";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  icon: ReactNode;
  label: string;
  size?: "small" | "medium" | "large";
  variant?: "secondary" | "ghost" | "danger";
}

export function IconButton({
  className,
  icon,
  label,
  size = "medium",
  type = "button",
  variant = "ghost",
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={[styles.root, styles[size], styles[variant], className]
        .filter(Boolean)
        .join(" ")}
      type={type}
      {...props}
    >
      <span aria-hidden="true" className={styles.icon}>
        {icon}
      </span>
    </button>
  );
}
