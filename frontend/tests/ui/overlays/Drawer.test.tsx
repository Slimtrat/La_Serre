// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Drawer } from "../../../src/shared/ui/Drawer/Drawer";

afterEach(cleanup);

describe("Drawer", () => {
  it("is controlled, labelled and dismissible from the keyboard", () => {
    const onOpenChange = vi.fn();

    function Example() {
      const [open, setOpen] = useState(true);
      const changeOpen = (nextOpen: boolean) => {
        setOpen(nextOpen);
        onOpenChange(nextOpen);
      };
      return (
        <Drawer
          description="Available filters"
          onOpenChange={changeOpen}
          open={open}
          placement="start"
          title="Filters"
        >
          <button>Apply filters</button>
        </Drawer>
      );
    }

    render(<Example />);
    const drawer = screen.getByRole("dialog", { name: "Filters" });
    expect(drawer.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Apply filters" }),
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("can keep backdrop presses non-dismissible", () => {
    const onOpenChange = vi.fn();
    render(
      <Drawer
        closeOnBackdrop={false}
        onOpenChange={onOpenChange}
        open
        title="Details"
      >
        <button>Continue</button>
      </Drawer>,
    );

    const drawer = screen.getByRole("dialog");
    fireEvent.mouseDown(drawer.parentElement!);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
