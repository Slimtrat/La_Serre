import { Button } from "@shared";

import type { ProductionAction, ProductionLocale, ProductionQueueItem } from "./model";
import styles from "./EpisodeProductionCockpit.module.css";

const COPY = {
  fr: { approve: "Approuver la keyframe", retry: "Réessayer", waiting: "Validation humaine requise" },
  en: { approve: "Approve keyframe", retry: "Retry", waiting: "Human approval required" },
} as const;

export interface ApprovalPanelProps {
  readonly actions: readonly ProductionAction[];
  readonly busy: boolean;
  readonly locale: ProductionLocale;
  readonly queueItems: readonly ProductionQueueItem[];
  readonly onApprove: () => void;
  readonly onRetry: (queueItemId: string) => void;
}

export function ApprovalPanel({ actions, busy, locale, queueItems, onApprove, onRetry }: ApprovalPanelProps) {
  const labels = COPY[locale];
  const approval = actions.find((item) => item.kind === "approve");
  const failed = queueItems.filter((item) => item.status === "failed" || item.status === "cancelled");
  if (!approval && failed.length === 0) return null;
  return (
    <aside className={styles.approvalPanel} aria-label={labels.waiting}>
      {approval ? (
        <Button
          data-production-action="approve"
          disabled={busy || !approval.enabled}
          onClick={onApprove}
          size="small"
        >
          {labels.approve}
        </Button>
      ) : null}
      {failed.map((item) => (
        <Button
          data-production-action="retry"
          disabled={busy}
          key={item.id}
          onClick={() => onRetry(item.id)}
          size="small"
          variant="secondary"
        >
          {labels.retry} · {item.kind}
        </Button>
      ))}
    </aside>
  );
}
