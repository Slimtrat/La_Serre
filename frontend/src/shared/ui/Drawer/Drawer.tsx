import {
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";

import { useModalOverlay } from "../overlays/useModalOverlay";
import styles from "./Drawer.module.css";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnBackdrop?: boolean;
  placement?: "start" | "end";
  className?: string;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  initialFocusRef,
  closeOnBackdrop = true,
  placement = "end",
  className,
}: DrawerProps) {
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
    <div
      className={`${styles.backdrop} ${styles[placement]}`}
      onMouseDown={handleBackdropClick}
    >
      <aside
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
      </aside>
    </div>,
    document.body,
  );
}
