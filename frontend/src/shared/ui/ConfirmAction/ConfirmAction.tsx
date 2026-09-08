import { type ReactNode, useRef } from "react";

import { Dialog } from "../Dialog/Dialog";
import styles from "./ConfirmAction.module.css";

export interface ConfirmActionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  confirmDisabled?: boolean;
}

export function ConfirmAction({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmDisabled = false,
}: ConfirmActionProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      description={description}
      initialFocusRef={cancelRef}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      <div className={styles.actions}>
        <button
          className={styles.button}
          onClick={() => onOpenChange(false)}
          ref={cancelRef}
          type="button"
        >
          {cancelLabel}
        </button>
        <button
          className={`${styles.button} ${styles.confirm}`}
          disabled={confirmDisabled}
          onClick={onConfirm}
          type="button"
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
