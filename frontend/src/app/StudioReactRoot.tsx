import { studioExtensions } from "@features";
import { VisuallyHidden } from "@shared";
import { QueryClientProvider, studioQueryClient } from "@shared/query";
import { useEffect, useState } from "react";

import { ComponentGallery } from "./dev/ComponentGallery";
import { StudioShell } from "./StudioShell";
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

function StudioApplication() {
  const [legacyKernel] = useState(createLegacyAppKernel);

  useEffect(() => {
    void legacyKernel.start();
    return () => legacyKernel.dispose();
  }, [legacyKernel]);

  return (
    <AppKernelProvider kernel={legacyKernel.kernel}>
      <QueryClientProvider client={studioQueryClient}>
        <ActiveContextStatus />
        <StudioShell />
        {studioExtensions.map(({ Component, id }) => (
          <Component key={id} />
        ))}
      </QueryClientProvider>
    </AppKernelProvider>
  );
}

export function StudioReactRoot() {
  const galleryRequested =
    import.meta.env.MODE === "development" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("gallery") === "components";

  return galleryRequested ? <ComponentGallery /> : <StudioApplication />;
}
