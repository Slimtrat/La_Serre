// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmAction } from "../../../src/shared/ui/ConfirmAction/ConfirmAction";

afterEach(cleanup);

describe("ConfirmAction", () => {
  it("requires caller-provided copy and initially focuses the safe action", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmAction
        cancelLabel="Keep item"
        confirmLabel="Remove item"
        description="This cannot be reversed."
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open
        title="Remove item?"
      />,
    );

    expect(screen.getByRole("dialog", { name: "Remove item?" })).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Keep item" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove item" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("delegates cancellation to the controlled owner", () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmAction
        cancelLabel="Not now"
        confirmLabel="Proceed"
        description="Review this operation."
        onConfirm={vi.fn()}
        onOpenChange={onOpenChange}
        open
        title="Confirm operation"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("supports a disabled confirmation", () => {
    render(
      <ConfirmAction
        cancelLabel="Cancel"
        confirmDisabled
        confirmLabel="Confirm"
        description="Missing required input."
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
        open
        title="Complete action"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Confirm" }).hasAttribute("disabled"),
    ).toBe(true);
  });
});
