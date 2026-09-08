import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type SlotStatus = "pending" | "mounted" | "unavailable";

type LegacyWorkspaceView =
  | "guided"
  | "graph"
  | "plan"
  | "outputs"
  | "bible"
  | "settings";

/** The AppKernel ports consumed by the migration slot. */
export interface LegacyWorkspaceKernel {
  readonly navigation: {
    navigate(
      target: { readonly kind: "workspace"; readonly view: LegacyWorkspaceView },
      options?: { readonly focus?: boolean; readonly replace?: boolean },
    ): void;
  };
  readonly runtime: {
    reportError(
      error: unknown,
      context?: Readonly<Record<string, unknown>>,
    ): void;
  };
}

export interface LegacyWorkspaceSlotProps
  extends Omit<ComponentPropsWithoutRef<"section">, "children"> {
  readonly view: LegacyWorkspaceView;
  readonly kernel: LegacyWorkspaceKernel;
  readonly resolveLegacyRoot: () => HTMLElement | null;
  readonly unavailable: ReactNode;
  readonly focusOnMount?: boolean;
}

interface ElementState {
  readonly parent: Node | null;
  readonly nextSibling: Node | null;
  readonly hidden: boolean;
  readonly ariaHidden: string | null;
  readonly inert: boolean;
  readonly tabIndex: string | null;
}

function restoreAttribute(
  element: HTMLElement,
  name: string,
  value: string | null,
): void {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

function restorePosition(element: HTMLElement, state: ElementState): void {
  if (state.parent === null || !state.parent.isConnected) {
    element.remove();
    return;
  }

  if (state.nextSibling?.parentNode === state.parent) {
    state.parent.insertBefore(element, state.nextSibling);
  } else {
    state.parent.appendChild(element);
  }
}

/**
 * Temporarily adopts an existing legacy workspace root into React's shell.
 * Navigation remains owned by AppKernel; the slot only manages DOM placement
 * and focus during the migration.
 */
export function LegacyWorkspaceSlot({
  view,
  kernel,
  resolveLegacyRoot,
  unavailable,
  focusOnMount = true,
  ...sectionProps
}: LegacyWorkspaceSlotProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<SlotStatus>("pending");

  useLayoutEffect(() => {
    const mount = mountRef.current;
    const previouslyFocused =
      mount?.ownerDocument.activeElement instanceof HTMLElement
        ? mount.ownerDocument.activeElement
        : null;

    let legacyRoot: HTMLElement | null;
    try {
      legacyRoot = resolveLegacyRoot();
    } catch (error) {
      kernel.runtime.reportError(error, {
        boundary: "LegacyWorkspaceSlot",
        view,
      });
      setStatus("unavailable");
      return;
    }

    if (mount === null || legacyRoot === null || legacyRoot === mount) {
      setStatus("unavailable");
      return;
    }

    const elementState: ElementState = {
      parent: legacyRoot.parentNode,
      nextSibling: legacyRoot.nextSibling,
      hidden: legacyRoot.hasAttribute("hidden"),
      ariaHidden: legacyRoot.getAttribute("aria-hidden"),
      inert: legacyRoot.inert,
      tabIndex: legacyRoot.getAttribute("tabindex"),
    };

    kernel.navigation.navigate(
      { kind: "workspace", view },
      { focus: false },
    );
    mount.appendChild(legacyRoot);
    legacyRoot.hidden = false;
    legacyRoot.inert = false;
    legacyRoot.removeAttribute("aria-hidden");
    setStatus("mounted");

    if (focusOnMount) {
      if (!legacyRoot.hasAttribute("tabindex")) legacyRoot.tabIndex = -1;
      legacyRoot.focus({ preventScroll: true });
    }

    return () => {
      restorePosition(legacyRoot, elementState);
      legacyRoot.hidden = elementState.hidden;
      legacyRoot.inert = elementState.inert;
      restoreAttribute(legacyRoot, "aria-hidden", elementState.ariaHidden);
      restoreAttribute(legacyRoot, "tabindex", elementState.tabIndex);

      if (focusOnMount && previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [focusOnMount, kernel, resolveLegacyRoot, view]);

  return (
    <section {...sectionProps} data-legacy-workspace-status={status}>
      <div ref={mountRef} data-legacy-workspace-mount="" />
      {status === "unavailable" ? unavailable : null}
    </section>
  );
}
