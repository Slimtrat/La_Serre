import type { StudioExtension } from "@shared";

import { StudioStatus } from "./StudioStatus";

export { StudioStatus } from "./StudioStatus";

export const studioStatusExtension = {
  id: "studio-status",
  Component: StudioStatus,
} satisfies StudioExtension;
