import type { StudioExtension } from "@shared";

import { apiStatusExtension } from "./api-status";
import { studioStatusExtension } from "./studio-status";

export { ApiStatus, apiStatusExtension } from "./api-status";
export { StudioStatus, studioStatusExtension } from "./studio-status";

export const studioExtensions: readonly StudioExtension[] = [
  studioStatusExtension,
  apiStatusExtension,
];
