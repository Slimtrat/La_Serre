import { VisuallyHidden } from "@shared";
import { useQuery } from "@shared/query";

import { apiStatusQuery } from "./apiStatusQuery";

export function ApiStatus() {
  const status = useQuery(apiStatusQuery);
  const message = status.isPending
    ? "Connexion à l’API…"
    : status.isError
      ? "API indisponible"
      : `API connectée : ${status.data.status}`;
  return <VisuallyHidden role="status">{message}</VisuallyHidden>;
}
