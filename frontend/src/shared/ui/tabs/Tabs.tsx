import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import styles from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: ReactNode;
  panel: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: readonly TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Tabs({
  items,
  value,
  onValueChange,
  ariaLabel,
  orientation = "horizontal",
  className,
}: TabsProps) {
  const generatedId = useId();
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const enabledItems = items.filter((item) => !item.disabled);

  function activate(item: TabItem) {
    if (item.disabled) return;
    onValueChange(item.id);
    tabRefs.current.get(item.id)?.focus();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    item: TabItem,
  ) {
    const currentIndex = enabledItems.findIndex(
      (candidate) => candidate.id === item.id,
    );
    if (currentIndex < 0 || enabledItems.length === 0) return;

    let target: TabItem | undefined;
    if (event.key === "Home") target = enabledItems[0];
    if (event.key === "End") target = enabledItems.at(-1);
    if (
      (orientation === "horizontal" && event.key === "ArrowRight") ||
      (orientation === "vertical" && event.key === "ArrowDown")
    ) {
      target = enabledItems[(currentIndex + 1) % enabledItems.length];
    }
    if (
      (orientation === "horizontal" && event.key === "ArrowLeft") ||
      (orientation === "vertical" && event.key === "ArrowUp")
    ) {
      target =
        enabledItems[
          (currentIndex - 1 + enabledItems.length) % enabledItems.length
        ];
    }

    if (target) {
      event.preventDefault();
      activate(target);
    }
  }

  return (
    <div className={`${styles.root}${className ? ` ${className}` : ""}`}>
      <div
        aria-label={ariaLabel}
        aria-orientation={orientation}
        className={styles.list}
        role="tablist"
      >
        {items.map((item) => {
          const selected = item.id === value;
          const tabId = `${generatedId}-tab-${item.id}`;
          const panelId = `${generatedId}-panel-${item.id}`;
          return (
            <button
              aria-controls={panelId}
              aria-selected={selected}
              className={styles.tab}
              disabled={item.disabled}
              id={tabId}
              key={item.id}
              onClick={() => activate(item)}
              onKeyDown={(event) => handleKeyDown(event, item)}
              ref={(node) => {
                if (node) tabRefs.current.set(item.id, node);
                else tabRefs.current.delete(item.id);
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <div
            aria-labelledby={`${generatedId}-tab-${item.id}`}
            className={styles.panel}
            hidden={!selected}
            id={`${generatedId}-panel-${item.id}`}
            key={item.id}
            role="tabpanel"
            tabIndex={0}
          >
            {item.panel}
          </div>
        );
      })}
    </div>
  );
}
