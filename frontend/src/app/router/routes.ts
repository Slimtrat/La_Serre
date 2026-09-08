export const STUDIO_ROUTE_NAMES = [
  "create",
  "produce",
  "results",
  "bible",
  "settings",
  "graph",
] as const;

export type StudioRouteName = (typeof STUDIO_ROUTE_NAMES)[number];
export type StudioRouteKind = "primary" | "contextual" | "advanced";

export interface StudioRouteContext {
  readonly projectId?: string;
  readonly seriesId?: string;
  readonly episodeId?: string;
  readonly shotId?: string;
}

export interface KnownStudioRoute {
  readonly kind: StudioRouteKind;
  readonly name: StudioRouteName;
  readonly context: StudioRouteContext;
}

export interface NotFoundStudioRoute {
  readonly kind: "not-found";
  readonly attemptedHref: string;
  readonly context: StudioRouteContext;
}

export type StudioRoute = KnownStudioRoute | NotFoundStudioRoute;

interface RouteDefinition {
  readonly kind: StudioRouteKind;
  readonly name: StudioRouteName;
  readonly path: string;
}

export const STUDIO_ROUTES = [
  { kind: "primary", name: "create", path: "/create" },
  { kind: "primary", name: "produce", path: "/produce" },
  { kind: "primary", name: "results", path: "/results" },
  { kind: "contextual", name: "bible", path: "/bible" },
  { kind: "contextual", name: "settings", path: "/settings" },
  { kind: "advanced", name: "graph", path: "/advanced/graph" },
] as const satisfies readonly RouteDefinition[];

export const DEFAULT_STUDIO_ROUTE: KnownStudioRoute = {
  kind: "primary",
  name: "create",
  context: {},
};

const routeByPath = new Map<string, RouteDefinition>(
  STUDIO_ROUTES.map((route) => [route.path, route]),
);
const routeByName = new Map<StudioRouteName, RouteDefinition>(
  STUDIO_ROUTES.map((route) => [route.name, route]),
);

const CONTEXT_PARAMETERS = [
  ["project", "projectId"],
  ["series", "seriesId"],
  ["episode", "episodeId"],
  ["shot", "shotId"],
] as const satisfies ReadonlyArray<
  readonly [string, keyof StudioRouteContext]
>;

function normalizedValue(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readContext(searchParams: URLSearchParams): StudioRouteContext {
  const context: Record<string, string> = {};
  for (const [parameter, property] of CONTEXT_PARAMETERS) {
    const value = normalizedValue(searchParams.get(parameter));
    if (value !== undefined) context[property] = value;
  }
  return context;
}

function routeHrefFromInput(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("#")) return trimmed.slice(1);

  const parsed = new URL(trimmed || "/", "http://studio.local");
  if (parsed.hash.startsWith("#/")) return parsed.hash.slice(1);
  return `${parsed.pathname}${parsed.search}`;
}

/** Parse a canonical hash deep-link, or a path for tests and host integrations. */
export function parseStudioRoute(input: string): StudioRoute {
  const attemptedHref = routeHrefFromInput(input);
  const parsed = new URL(attemptedHref, "http://studio.local");
  const definition = routeByPath.get(parsed.pathname);
  const context = readContext(parsed.searchParams);

  if (definition === undefined) {
    return { kind: "not-found", attemptedHref, context };
  }
  return { kind: definition.kind, name: definition.name, context };
}

/** Create the stable reload-safe URL used by both the desktop WebView and browsers. */
export function formatStudioRoute(route: KnownStudioRoute): string {
  const definition = routeByName.get(route.name);
  if (definition === undefined || definition.kind !== route.kind) {
    throw new Error(`Invalid Studio route: ${route.kind}/${route.name}`);
  }

  const searchParams = new URLSearchParams();
  for (const [parameter, property] of CONTEXT_PARAMETERS) {
    const value = normalizedValue(route.context[property] ?? null);
    if (value !== undefined) searchParams.set(parameter, value);
  }
  const search = searchParams.toString();
  return `#${definition.path}${search ? `?${search}` : ""}`;
}

export function studioRoute(
  name: StudioRouteName,
  context: StudioRouteContext = {},
): KnownStudioRoute {
  const definition = routeByName.get(name);
  if (definition === undefined) throw new Error(`Unknown Studio route: ${name}`);
  return { kind: definition.kind, name, context };
}
