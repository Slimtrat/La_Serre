import { useRuntimeSummary } from "./studioCatalog";
import styles from "./StudioShell.module.css";

export interface RuntimeStatusLabels {
  readonly runtime: string;
  readonly checking: string;
  readonly ready: string;
  readonly unavailable: string;
}

export function RuntimeStatus({ labels }: { labels: RuntimeStatusLabels }) {
  const runtime = useRuntimeSummary();
  const state = runtime.isPending
    ? "checking"
    : runtime.isError || runtime.data?.enabled === false
      ? "unavailable"
      : "ready";
  const label = labels[state];

  return (
    <output
      aria-label={`${labels.runtime}: ${label}`}
      className={styles.runtimeStatus}
      data-state={state}
    >
      <span aria-hidden="true" />
      {label}
    </output>
  );
}
