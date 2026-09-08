import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  children,
  className,
  disabled,
  leadingIcon,
  loading = false,
  loadingLabel,
  size = "medium",
  trailingIcon,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = [styles.root, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      type={type}
      aria-busy={loading || undefined}
      {...props}
    >
      {leadingIcon ? <span className={styles.icon}>{leadingIcon}</span> : null}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
      {trailingIcon ? <span className={styles.icon}>{trailingIcon}</span> : null}
    </button>
  );
}
