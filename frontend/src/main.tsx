import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { StudioReactRoot } from "@app";
import "@shared/styles/tokens.css";

const container = document.getElementById("studio-react-root");

if (container) {
  container.dataset.reactMounted = "true";
  createRoot(container).render(
    <StrictMode>
      <StudioReactRoot />
    </StrictMode>,
  );
}
