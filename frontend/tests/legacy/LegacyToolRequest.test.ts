// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import {
  LEGACY_TOOL_REQUEST_EVENT,
  requestLegacyTool,
} from "../../src/shared/legacy/LegacyToolRequest";

describe("requestLegacyTool", () => {
  it("publishes a typed request without reaching into the legacy DOM", () => {
    const host = new EventTarget();
    const listener = vi.fn();
    host.addEventListener(LEGACY_TOOL_REQUEST_EVENT, listener);

    requestLegacyTool("assets", host);

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0]?.[0];
    expect(event).toBeInstanceOf(CustomEvent);
    if (!(event instanceof CustomEvent)) throw new Error("Missing tool event");
    expect(event.detail).toEqual({ tool: "assets" });
  });
});


