// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Badge } from "../../../src/shared/ui/Badge";
import { Button } from "../../../src/shared/ui/Button";
import { Card } from "../../../src/shared/ui/Card";
import { EmptyState } from "../../../src/shared/ui/EmptyState";
import { ErrorState } from "../../../src/shared/ui/ErrorState";
import { IconButton } from "../../../src/shared/ui/IconButton";
import { MediaFrame } from "../../../src/shared/ui/MediaFrame";
import { Progress } from "../../../src/shared/ui/Progress";
import { Skeleton } from "../../../src/shared/ui/Skeleton";

describe("basic UI primitives", () => {
  it("keeps buttons semantic and prevents interaction while loading", () => {
    const onClick = vi.fn();
    render(
      <>
        <Button loading loadingLabel="Saving" onClick={onClick}>
          Save
        </Button>
        <IconButton icon={<svg />} label="Open settings" onClick={onClick} />
      </>,
    );

    const loadingButton = screen.getByRole("button", { name: "Saving" });
    expect(loadingButton.getAttribute("type")).toBe("button");
    expect(loadingButton.getAttribute("aria-busy")).toBe("true");
    expect((loadingButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(loadingButton);

    const iconButton = screen.getByRole("button", { name: "Open settings" });
    fireEvent.click(iconButton);
    expect(iconButton.querySelector("svg")?.parentElement?.getAttribute("aria-hidden")).toBe("true");
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("exposes determinate and indeterminate progress with accessible names", () => {
    render(
      <>
        <Progress label="Rendering" showValue value={25} />
        <Progress label="Preparing" />
      </>,
    );

    const rendering = screen.getByRole("progressbar", { name: "Rendering" });
    expect(rendering.getAttribute("value")).toBe("25");
    expect(rendering.getAttribute("max")).toBe("100");
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Preparing" }).hasAttribute("value")).toBe(false);
  });

  it("uses structural elements without inventing product copy", () => {
    render(
      <>
        <Card aria-label="Preview"><Badge tone="success">Ready</Badge></Card>
        <MediaFrame caption="Frame 12"><img alt="Sequence preview" src="preview.png" /></MediaFrame>
        <EmptyState title="Nothing selected" description="Choose an item" action={<Button>Browse</Button>} />
        <ErrorState title="Export failed" description="Try again" action={<Button>Retry</Button>} />
        <Skeleton data-testid="placeholder" width="10rem" />
      </>,
    );

    expect(screen.getByRole("article", { name: "Preview" })).toBeTruthy();
    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.getByRole("figure").textContent).toContain("Frame 12");
    expect(screen.getByRole("region", { name: "Nothing selected" })).toBeTruthy();
    expect(screen.getByRole("alert").getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByTestId("placeholder").getAttribute("aria-hidden")).toBe("true");
  });
});
