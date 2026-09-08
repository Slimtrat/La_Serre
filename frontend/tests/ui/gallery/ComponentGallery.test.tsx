// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComponentGallery } from "../../../src/app/dev/ComponentGallery";

describe("ComponentGallery", () => {
  it("documents every product state and every component family", () => {
    const { container } = render(<ComponentGallery />);

    expect(screen.getByRole("heading", { name: "Component gallery" })).toBeTruthy();
    for (const state of ["normal", "loading", "disabled", "error", "stale", "empty"]) {
      expect(container.querySelector(`[data-gallery-state="${state}"]`)).toBeTruthy();
    }
    expect(screen.getByRole("tablist", { name: "Preview modes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open dialog" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open drawer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open confirmation" })).toBeTruthy();
  });
});
