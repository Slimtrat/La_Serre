import { healthHealthGet } from "@shared/api";
import { queryOptions } from "@shared/query";

export const apiStatusQuery = queryOptions({
  queryKey: ["api", "health"] as const,
  queryFn: ({ signal }) => healthHealthGet({ signal }),
});