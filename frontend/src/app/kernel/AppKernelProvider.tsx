import {
  createContext,
  type PropsWithChildren,
  useContext,
  useSyncExternalStore,
} from "react";

import type {
  ActiveContext,
  ActiveContextPort,
  ActivityPort,
  AppKernel,
  NavigationPort,
  NotificationPort,
  RuntimePort,
} from "./contracts";

const AppKernelContext = createContext<AppKernel | null>(null);

export interface AppKernelProviderProps extends PropsWithChildren {
  readonly kernel: AppKernel;
}

export function AppKernelProvider({
  children,
  kernel,
}: AppKernelProviderProps) {
  return (
    <AppKernelContext.Provider value={kernel}>
      {children}
    </AppKernelContext.Provider>
  );
}

export function useAppKernel(): AppKernel {
  const kernel = useContext(AppKernelContext);

  if (kernel === null) {
    throw new Error("AppKernelProvider is missing from the React tree.");
  }

  return kernel;
}

export function useActiveContextPort(): ActiveContextPort {
  return useAppKernel().activeContext;
}

export function useActiveContext(): ActiveContext {
  const port = useActiveContextPort();
  return useSyncExternalStore(
    port.subscribe,
    port.getSnapshot,
    port.getSnapshot,
  );
}

export function useNavigation(): NavigationPort {
  return useAppKernel().navigation;
}

export function useNotifications(): NotificationPort {
  return useAppKernel().notifications;
}

export function useRuntime(): RuntimePort {
  return useAppKernel().runtime;
}

export function useActivity(): ActivityPort {
  return useAppKernel().activity;
}
