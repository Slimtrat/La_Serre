// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Field } from "../../../src/shared/ui/field/Field";
import { Select } from "../../../src/shared/ui/select/Select";
import { Tabs } from "../../../src/shared/ui/tabs/Tabs";
import { Textarea } from "../../../src/shared/ui/textarea/Textarea";

afterEach(cleanup);

describe("controlled form primitives", () => {
  it("associates labels, descriptions and actionable errors with their controls", () => {
    const onChange = vi.fn();
    render(
      <Field
        description="Publicly visible"
        error="Use at least three characters"
        label="Display name"
        onChange={onChange}
        value="ab"
      />,
    );

    const input = screen.getByLabelText("Display name");
    const description = screen.getByText("Publicly visible");
    const error = screen.getByRole("alert");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toEqual([
      description.id,
      error.id,
    ]);

    fireEvent.change(input, { target: { value: "fern" } });
    expect(onChange).toHaveBeenCalledWith("fern", expect.any(Object));
    expect(input.getAttribute("value")).toBe("ab");
  });

  it("keeps textarea and select values controlled", () => {
    function Fixture() {
      const [notes, setNotes] = useState("seed");
      const [status, setStatus] = useState("draft");
      return (
        <>
          <Textarea label="Notes" value={notes} onChange={setNotes} />
          <Select label="Status" value={status} onChange={setStatus}>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
          </Select>
        </>
      );
    }

    render(<Fixture />);
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "grown" },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "ready" },
    });
    expect((screen.getByLabelText("Notes") as HTMLTextAreaElement).value).toBe(
      "grown",
    );
    expect((screen.getByLabelText("Status") as HTMLSelectElement).value).toBe(
      "ready",
    );
  });
});

describe("Tabs", () => {
  const items = [
    { id: "story", label: "Story", panel: "Story panel" },
    { id: "locked", label: "Locked", panel: "Locked panel", disabled: true },
    { id: "cast", label: "Cast", panel: "Cast panel" },
  ] as const;

  function Fixture({
    orientation = "horizontal",
  }: {
    orientation?: "horizontal" | "vertical";
  }) {
    const [value, setValue] = useState("story");
    return (
      <Tabs
        ariaLabel="Workspace sections"
        items={items}
        onValueChange={setValue}
        orientation={orientation}
        value={value}
      />
    );
  }

  it("links tabs to panels and changes the controlled selection on click", () => {
    render(<Fixture />);
    const castTab = screen.getByRole("tab", { name: "Cast" });
    fireEvent.click(castTab);
    expect(castTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Cast panel");
    expect(castTab.getAttribute("aria-controls")).toBe(
      screen.getByRole("tabpanel").id,
    );
  });

  it("supports arrows, Home and End while skipping disabled tabs", () => {
    render(<Fixture />);
    const storyTab = screen.getByRole("tab", { name: "Story" });
    storyTab.focus();
    fireEvent.keyDown(storyTab, { key: "ArrowRight" });
    const castTab = screen.getByRole("tab", { name: "Cast" });
    expect(document.activeElement).toBe(castTab);
    expect(castTab.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(castTab, { key: "Home" });
    expect(document.activeElement).toBe(storyTab);
    fireEvent.keyDown(storyTab, { key: "End" });
    expect(document.activeElement).toBe(castTab);
  });

  it("uses vertical arrow keys only in vertical orientation", () => {
    render(<Fixture orientation="vertical" />);
    const storyTab = screen.getByRole("tab", { name: "Story" });
    storyTab.focus();
    fireEvent.keyDown(storyTab, { key: "ArrowDown" });
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Cast" }),
    );
  });
});
