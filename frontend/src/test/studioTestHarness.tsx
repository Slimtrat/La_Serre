import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";
import {
  render,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  AppKernelProvider,
  type ActiveContext,
  type AppKernel,
  type NotificationInput,
} from "@app/kernel";
import { ApiError } from "@shared/api";

export interface MockApiCall {
  readonly operation: string;
  readonly input: unknown;
}

export type MockApiHandler = (input: unknown) => unknown | Promise<unknown>;
export type MockApiRoute = unknown | Error | MockApiHandler;

export interface MockApiAdapter {
  readonly calls: readonly MockApiCall[];
  request<TResult>(operation: string, input?: unknown): Promise<TResult>;
}

export function createMockApi(
  routes: Readonly<Record<string, MockApiRoute>> = {},
): MockApiAdapter {
  const calls: MockApiCall[] = [];

  return {
    calls,
    async request<TResult>(operation: string, input?: unknown) {
      calls.push({ operation, input });
      if (!(operation in routes)) {
        throw new ApiError({
          status: 501,
          data: {
            code: "missing_test_route",
            detail: `No test route for ${operation}`,
          },
        });
      }

      const route = routes[operation];
      if (route instanceof Error) throw route;
      const result = typeof route === "function" ? await route(input) : route;
      return result as TResult;
    },
  };
}

interface StudioTestEnvironment {
  readonly locale: string;
  readonly api: MockApiAdapter;
}

const StudioTestContext = createContext<StudioTestEnvironment | null>(null);

export function useStudioTestEnvironment(): StudioTestEnvironment {
  const environment = useContext(StudioTestContext);
  if (environment === null) {
    throw new Error("Studio test environment is missing from the React tree.");
  }
  return environment;
}

export interface TestKernel extends AppKernel {
  readonly recorded: {
    readonly navigation: Array<{ target: unknown; options: unknown }>;
    readonly notifications: NotificationInput[];
    readonly errors: Array<{ error: unknown; context: unknown }>;
  };
}

export function createTestKernel(
  initialContext: Partial<ActiveContext> = {},
): TestKernel {
  let snapshot: ActiveContext = {
    projectId: "project-test",
    seriesId: "series-test",
    episodeId: "episode-test",
    shotId: null,
    ...initialContext,
  };
  const listeners = new Set<() => void>();
  const navigation: Array<{ target: unknown; options: unknown }> = [];
  const notifications: NotificationInput[] = [];
  const errors: Array<{ error: unknown; context: unknown }> = [];
  let nextId = 1;

  const updateContext = (change: Partial<ActiveContext>) => {
    snapshot = { ...snapshot, ...change };
    listeners.forEach((listener) => {
      listener();
    });
  };

  return {
    activeContext: {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      selectProject: (projectId) => updateContext({ projectId }),
      selectSeries: (seriesId) => updateContext({ seriesId }),
      selectEpisode: (episodeId) => updateContext({ episodeId }),
      selectShot: (shotId) => updateContext({ shotId }),
    },
    navigation: {
      navigate: (target, options) => navigation.push({ target, options }),
    },
    notifications: {
      notify: (notification) => {
        notifications.push(notification);
        return `notification-${nextId++}`;
      },
    },
    runtime: {
      environment: "test",
      capabilities: { filesystem: false, generation: true, export: true },
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      createId: () => `test-${nextId++}`,
      reportError: (error, context) => errors.push({ error, context }),
    },
    activity: {
      start: () => ({
        id: `activity-${nextId++}`,
        update: () => undefined,
        finish: () => undefined,
      }),
    },
    recorded: { navigation, notifications, errors },
  };
}

export interface RenderWithStudioOptions
  extends Omit<RenderOptions, "wrapper"> {
  readonly api?: MockApiAdapter;
  readonly context?: Partial<ActiveContext>;
  readonly kernel?: TestKernel;
  readonly locale?: string;
  readonly queryClient?: QueryClient;
}

export interface StudioRenderResult extends RenderResult {
  readonly api: MockApiAdapter;
  readonly kernel: TestKernel;
  readonly queryClient: QueryClient;
}

export function renderWithStudio(
  ui: ReactElement,
  options: RenderWithStudioOptions = {},
): StudioRenderResult {
  const {
    api = createMockApi(),
    context,
    kernel = createTestKernel(context),
    locale = "fr-FR",
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    }),
    ...renderOptions
  } = options;

  function Providers({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AppKernelProvider kernel={kernel}>
          <StudioTestContext.Provider value={{ api, locale }}>
            {children}
          </StudioTestContext.Provider>
        </AppKernelProvider>
      </QueryClientProvider>
    );
  }

  return Object.assign(render(ui, { wrapper: Providers, ...renderOptions }), {
    api,
    kernel,
    queryClient,
  });
}
