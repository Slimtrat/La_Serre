import type { StudioExtension } from "@shared";

import { ApiStatus } from "./ApiStatus";

export { ApiStatus } from "./ApiStatus";
export { apiStatusQuery } from "./apiStatusQuery";

export const apiStatusExtension = {
  id: "api-status",
  Component: ApiStatus,
} satisfies StudioExtension;
