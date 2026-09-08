export type LegacyTool =
  | "assets"
  | "journal"
  | "guide"
  | "demo"
  | "writing"
  | "settings"
  | "services"
  | "project-new";

export const LEGACY_TOOL_REQUEST_EVENT = "studio:tool-open-request";

/**
 * Explicit event boundary used while tools are still owned by the legacy UI.
 * The legacy adapter decides how a supported tool is opened.
 */
export function requestLegacyTool(
  tool: LegacyTool,
  host: EventTarget = window,
): void {
  host.dispatchEvent(
    new CustomEvent(LEGACY_TOOL_REQUEST_EVENT, { detail: { tool } }),
  );
}
