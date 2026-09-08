import { studioExtensions } from "@features";

export function StudioReactRoot() {
  return studioExtensions.map(({ Component, id }) => <Component key={id} />);
}
