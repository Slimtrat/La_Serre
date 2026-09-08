import {
  useId,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import styles from "./Field.module.css";

export interface FieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "value" | "onChange"
> {
  id?: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  value: string;
  onChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
}

export function Field({
  id,
  label,
  description,
  error,
  value,
  onChange,
  className,
  "aria-describedby": ariaDescribedBy,
  ...inputProps
}: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? `field-${generatedId}`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={`${styles.root}${className ? ` ${className}` : ""}`}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      {description ? (
        <span className={styles.description} id={descriptionId}>
          {description}
        </span>
      ) : null}
      <input
        {...inputProps}
        aria-describedby={describedBy}
        aria-invalid={error ? true : inputProps["aria-invalid"]}
        className={styles.control}
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value, event)}
      />
      {error ? (
        <span className={styles.error} id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
