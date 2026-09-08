import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LegacyWorkspaceSlot,
  type LegacyWorkspaceKernel,
} from "@shared/legacy";

function createKernel() {
  const navigate = vi.fn();
  const reportError = vi.fn();
  const kernel = {
    navigation: { navigate },
    runtime: { reportError },
  } satisfies LegacyWorkspaceKernel;

  return { kernel, navigate, reportError };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("LegacyWorkspaceSlot", () => {
  it("adopts a legacy root, navigates once, and restores DOM and focus", () => {
    const { kernel, navigate } = createKernel();
    const trigger = document.createElement("button");
    const legacyParent = document.createElement("div");
    const legacyRoot = document.createElement("article");
    const followingSibling = document.createElement("span");
    legacyRoot.hidden = true;
    legacyRoot.inert = true;
    legacyRoot.setAttribute("aria-hidden", "true");
    legacyParent.append(legacyRoot, followingSibling);
    document.body.append(trigger, legacyParent);
    trigger.focus();

    const { container, unmount } = render(
      <LegacyWorkspaceSlot
        aria-label="Legacy graph"
        kernel={kernel}
        resolveLegacyRoot={() => legacyRoot}
        unavailable={<p>Unavailable fixture</p>}
        view="graph"
      />,
    );

    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(
      { kind: "workspace", view: "graph" },
      { focus: false },
    );
    expect(
      container.querySelector("[data-legacy-workspace-mount]")?.firstChild,
    ).toBe(legacyRoot);
    expect(legacyRoot.hidden).toBe(false);
    expect(legacyRoot.inert).toBe(false);
    expect(legacyRoot.getAttribute("aria-hidden")).toBeNull();
    expect(document.activeElement).toBe(legacyRoot);

    unmount();

    expect(legacyParent.firstChild).toBe(legacyRoot);
    expect(legacyRoot.nextSibling).toBe(followingSibling);
    expect(legacyRoot.hidden).toBe(true);
    expect(legacyRoot.inert).toBe(true);
    expect(legacyRoot.getAttribute("aria-hidden")).toBe("true");
    expect(legacyRoot.getAttribute("tabindex")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("renders the injected unavailable state without navigating", () => {
    const { kernel, navigate } = createKernel();

    render(
      <LegacyWorkspaceSlot
        kernel={kernel}
        resolveLegacyRoot={() => null}
        unavailable={<p>Custom unavailable state</p>}
        view="plan"
      />,
    );

    expect(screen.getByText("Custom unavailable state")).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("reports resolver failures and renders the injected fallback", () => {
    const { kernel, navigate, reportError } = createKernel();
    const failure = new Error("fixture failed");

    render(
      <LegacyWorkspaceSlot
        kernel={kernel}
        resolveLegacyRoot={() => {
          throw failure;
        }}
        unavailable={<p>Resolver fallback</p>}
        view="outputs"
      />,
    );

    expect(screen.getByText("Resolver fallback")).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledWith(failure, {
      boundary: "LegacyWorkspaceSlot",
      view: "outputs",
    });
  });
});
