import {
  useId,
  type ChangeEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import styles from "./Textarea.module.css";

export interface TextareaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id" | "value" | "onChange"
> {
  id?: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  value: string;
  onChange: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
}

export function Textarea({
  id,
  label,
  description,
  error,
  value,
  onChange,
  className,
  "aria-describedby": ariaDescribedBy,
  ...textareaProps
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? `textarea-${generatedId}`;
  const descriptionId = description ? `${textareaId}-description` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, descriptionId, errorId].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={`${styles.root}${className ? ` ${className}` : ""}`}>
      <label className={styles.label} htmlFor={textareaId}>
        {label}
      </label>
      {description ? (
        <span className={styles.description} id={descriptionId}>
          {description}
        </span>
      ) : null}
      <textarea
        {...textareaProps}
        aria-describedby={describedBy}
        aria-invalid={error ? true : textareaProps["aria-invalid"]}
        className={styles.control}
        id={textareaId}
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
