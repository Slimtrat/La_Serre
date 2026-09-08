// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Dialog } from "../../../src/shared/ui/Dialog/Dialog";

afterEach(cleanup);

function ControlledDialog({
  onOpenChange = vi.fn(),
}: {
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  const changeOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange(nextOpen);
  };

  return (
    <>
      <button type="button" onClick={() => changeOpen(true)}>
        Open settings
      </button>
      <Dialog
        description="Choose an option"
        initialFocusRef={initialFocusRef}
        onOpenChange={changeOpen}
        open={open}
        title="Settings"
      >
        <button type="button" ref={initialFocusRef}>
          First action
        </button>
        <button type="button">Last action</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("exposes an accessible name and description and focuses the requested control", () => {
    render(<ControlledDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));

    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("Choose an option").id).toBe(
      dialog.getAttribute("aria-describedby"),
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "First action" }),
    );
  });

  it("traps tab focus in both directions", () => {
    render(<ControlledDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    const first = screen.getByRole("button", { name: "First action" });
    const last = screen.getByRole("button", { name: "Last action" });

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("closes on Escape and restores focus to the opener", () => {
    const onOpenChange = vi.fn();
    render(<ControlledDialog onOpenChange={onOpenChange} />);
    const opener = screen.getByRole("button", { name: "Open settings" });
    opener.focus();
    fireEvent.click(opener);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes only when the backdrop itself is pressed", () => {
    const onOpenChange = vi.fn();
    render(<ControlledDialog onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.mouseDown(dialog);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    const backdrop = dialog.parentElement;
    expect(backdrop).not.toBeNull();
    if (backdrop) fireEvent.mouseDown(backdrop);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
