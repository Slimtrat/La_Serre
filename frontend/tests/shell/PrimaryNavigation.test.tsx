// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getStudioMessages, studioRoute } from "../../src/app/router";
import { PrimaryNavigation } from "../../src/app/shell/PrimaryNavigation";

afterEach(cleanup);

describe("PrimaryNavigation", () => {
  it("exposes exactly the three product routes in French", () => {
    const onNavigate = vi.fn();

    render(
      <PrimaryNavigation
        messages={getStudioMessages("fr")}
        onNavigate={onNavigate}
        route={studioRoute("produce")}
      />,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Créer",
      "Produire",
      "Résultats",
    ]);
    expect(
      screen.getByRole("button", { name: "Produire" }).getAttribute("aria-current"),
    ).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "Résultats" }));
    expect(onNavigate).toHaveBeenCalledWith("results");
  });

  it("uses the strict English labels without changing route semantics", () => {
    const onNavigate = vi.fn();

    render(
      <PrimaryNavigation
        messages={getStudioMessages("en")}
        onNavigate={onNavigate}
        route={studioRoute("create")}
      />,
    );

    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["Create", "Produce", "Results"]);
  });
});