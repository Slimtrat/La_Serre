import { studioExtensions } from "@features";
import { VisuallyHidden } from "@shared";
import { QueryClientProvider, studioQueryClient } from "@shared/query";
import { useEffect, useState } from "react";

import {
  AppKernelProvider,
  createLegacyAppKernel,
  useActiveContext,
} from "./kernel";

function ActiveContextStatus() {
  const context = useActiveContext();
  return (
    <VisuallyHidden
      data-episode-id={context.episodeId ?? ""}
      data-project-id={context.projectId ?? ""}
      data-series-id={context.seriesId ?? ""}
      data-shot-id={context.shotId ?? ""}
      data-studio-kernel-context
      role="status"
    >
      {context.projectId
        ? "Contexte Studio synchronisé"
        : "Contexte Studio en attente"}
    </VisuallyHidden>
  );
}

export function StudioReactRoot() {
  const [legacyKernel] = useState(createLegacyAppKernel);

  useEffect(() => {
    void legacyKernel.start();
    return () => legacyKernel.dispose();
  }, [legacyKernel]);

  return (
    <AppKernelProvider kernel={legacyKernel.kernel}>
      <QueryClientProvider client={studioQueryClient}>
        <ActiveContextStatus />
        {studioExtensions.map(({ Component, id }) => (
          <Component key={id} />
        ))}
      </QueryClientProvider>
    </AppKernelProvider>
  );
}
