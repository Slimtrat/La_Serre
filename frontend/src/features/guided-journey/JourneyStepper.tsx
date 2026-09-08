import type { JourneyStageSnapshot, JourneyStageSnapshotId } from "@/generated/openapi";

import { useJourneyContext } from "./JourneyContext";
import styles from "./guidedJourney.module.css";

export interface JourneyStepperProps {
  readonly stages: readonly JourneyStageSnapshot[];
  readonly labels: Readonly<Record<JourneyStageSnapshotId, string>>;
  readonly navigationLabel: string;
}

export function JourneyStepper({ stages, labels, navigationLabel }: JourneyStepperProps) {
  const journey = useJourneyContext();
  return (
    <nav aria-label={navigationLabel} className={styles.stepper}>
      {stages.map((stage, index) => (
        <button
          aria-current={stage.id === journey.activeStage ? "step" : undefined}
          data-status={stage.status}
          key={stage.id}
          onClick={() => journey.selectStage(stage.id)}
          type="button"
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{labels[stage.id]}</strong>
          <small>{stage.status}</small>
        </button>
      ))}
    </nav>
  );
}
