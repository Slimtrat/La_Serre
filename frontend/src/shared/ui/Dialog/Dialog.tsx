import {
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";

import { useModalOverlay } from "../overlays/useModalOverlay";
import styles from "./Dialog.module.css";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnBackdrop?: boolean;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  initialFocusRef,
  closeOnBackdrop = true,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useModalOverlay({ open, onOpenChange, panelRef, initialFocusRef });

  if (!open || typeof document === "undefined") return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && event.target === event.currentTarget)
      onOpenChange(false);
  };

  return createPortal(
    <div className={styles.backdrop} onMouseDown={handleBackdropClick}>
      <div
        aria-describedby={description === undefined ? undefined : descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={[styles.panel, className].filter(Boolean).join(" ")}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        {description === undefined ? null : (
          <p className={styles.description} id={descriptionId}>
            {description}
          </p>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
