import {
  useId,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

import styles from "./Select.module.css";

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "id" | "value" | "onChange"
> {
  id?: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  value: string;
  onChange: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
}

export function Select({
  id,
  label,
  description,
  error,
  value,
  onChange,
  className,
  children,
  "aria-describedby": ariaDescribedBy,
  ...selectProps
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? `select-${generatedId}`;
  const descriptionId = description ? `${selectId}-description` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={`${styles.root}${className ? ` ${className}` : ""}`}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      {description ? (
        <span className={styles.description} id={descriptionId}>
          {description}
        </span>
      ) : null}
      <select
        {...selectProps}
        aria-describedby={describedBy}
        aria-invalid={error ? true : selectProps["aria-invalid"]}
        className={styles.control}
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value, event)}
      >
        {children}
      </select>
      {error ? (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
