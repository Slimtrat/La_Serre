import { createContext, type ReactNode, useContext } from "react";

import type { JourneyStageSnapshotId } from "@/generated/openapi";

export interface JourneyContextValue {
  readonly activeStage: JourneyStageSnapshotId;
  readonly selectStage: (stage: JourneyStageSnapshotId) => void;
  readonly navigate: (target: "produce" | "results" | "bible" | "settings" | "graph") => void;
}

const Context = createContext<JourneyContextValue | null>(null);

export function JourneyContext({ children, value }: { readonly children: ReactNode; readonly value: JourneyContextValue }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useJourneyContext(): JourneyContextValue {
  const value = useContext(Context);
  if (!value) throw new Error("JourneyContext is missing");
  return value;
}
