import type { StudioRouteName } from "../router";
import {
  requestLegacyTool,
  type LegacyTool,
} from "@shared/legacy/LegacyToolRequest";

import styles from "./StudioShell.module.css";

export interface ToolsMenuLabels {
  readonly tools: string;
  readonly assets: string;
  readonly journal: string;
  readonly guide: string;
  readonly demo: string;
  readonly writing: string;
  readonly settings: string;
  readonly services: string;
  readonly bible: string;
  readonly graph: string;
}

export interface ToolsMenuProps {
  readonly labels: ToolsMenuLabels;
  readonly onNavigate: (route: StudioRouteName) => void;
}

const LEGACY_TOOLS = [
  "assets",
  "journal",
  "guide",
  "demo",
  "writing",
  "services",
] as const satisfies readonly LegacyTool[];

export function ToolsMenu({ labels, onNavigate }: ToolsMenuProps) {
  return (
    <details className={styles.toolsMenu} data-tools-menu>
      <summary>{labels.tools}</summary>
      <div role="menu">
        <button onClick={() => onNavigate("bible")} role="menuitem" type="button">
          {labels.bible}
        </button>
        <button onClick={() => onNavigate("settings")} role="menuitem" type="button">
          {labels.settings}
        </button>
        <button onClick={() => onNavigate("graph")} role="menuitem" type="button">
          {labels.graph}
        </button>
        {LEGACY_TOOLS.map((tool) => (
          <button
            key={tool}
            onClick={() => requestLegacyTool(tool)}
            role="menuitem"
            type="button"
          >
            {labels[tool]}
          </button>
        ))}
      </div>
    </details>
  );
}
