import type { StudioExtension } from "@shared";

import { studioStatusExtension } from "./studio-status";

export { StudioStatus, studioStatusExtension } from "./studio-status";

export const studioExtensions: readonly StudioExtension[] = [studioStatusExtension];
