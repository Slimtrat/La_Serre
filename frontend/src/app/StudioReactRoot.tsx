import { studioExtensions } from "@features";
import { QueryClientProvider, studioQueryClient } from "@shared/query";

export function StudioReactRoot() {
  return (
    <QueryClientProvider client={studioQueryClient}>
      {studioExtensions.map(({ Component, id }) => <Component key={id} />)}
    </QueryClientProvider>
  );
}
