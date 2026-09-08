import type { ProgressHTMLAttributes } from "react";

import styles from "./Progress.module.css";

export interface ProgressProps
  extends Omit<ProgressHTMLAttributes<HTMLProgressElement>, "value" | "max"> {
  label: string;
  value?: number;
  max?: number;
  showValue?: boolean;
  formatValue?: (value: number, max: number) => string;
}

export function Progress({
  className,
  formatValue = (value, max) => `${Math.round((value / max) * 100)}%`,
  label,
  max = 100,
  showValue = false,
  value,
  ...props
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = value === undefined ? undefined : Math.min(Math.max(value, 0), safeMax);

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <div className={styles.labelRow}>
        <span id={props.id ? `${props.id}-label` : undefined}>{label}</span>
        {showValue && safeValue !== undefined ? (
          <span aria-hidden="true">{formatValue(safeValue, safeMax)}</span>
        ) : null}
      </div>
      <progress
        aria-label={props.id ? undefined : label}
        aria-labelledby={props.id ? `${props.id}-label` : undefined}
        className={styles.track}
        max={safeMax}
        value={safeValue}
        {...props}
      />
    </div>
  );
}
