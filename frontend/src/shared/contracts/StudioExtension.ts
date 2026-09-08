import type { ComponentType } from "react";

export interface StudioExtension {
  readonly id: string;
  readonly Component: ComponentType;
}
