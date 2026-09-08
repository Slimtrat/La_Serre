import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./studio-react-root.css";

export function StudioReactRoot() {
  return (
    <span className="studio-react-root__status" role="status">
      Interface React initialisée
    </span>
  );
}

const container = document.getElementById("studio-react-root");

if (container) {
  container.dataset.reactMounted = "true";
  createRoot(container).render(
    <StrictMode>
      <StudioReactRoot />
    </StrictMode>,
  );
}
