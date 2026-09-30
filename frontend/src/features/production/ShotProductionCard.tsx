import type { FormEvent } from "react";

import { Badge, Button, Card, MediaFrame, Progress } from "@shared";

import { ApprovalPanel } from "./ApprovalPanel";
import type {
  ArtifactKind,
  ProductionAction,
  ProductionLocale,
  ShotArtifact,
  ShotProductionState,
} from "./model";
import styles from "./EpisodeProductionCockpit.module.css";

const COPY = {
  fr: {
    shot: "Plan", seconds: "s", ready: "Prêt", blocked: "Bloqué", stale: "Périmé",
    running: "En cours", queued: "En file", awaiting_approval: "À valider", failed: "Échec", complete: "Complet", missing: "À produire",
    noPreview: "Aucun aperçu", next: "Prochaine action", artifacts: "Sources requises",
    present: "présent", approved: "approuvé", required: "requis", optional: "optionnel",
    provenance: "Provenance", generate: "Générer", reroll: "Relancer", import: "Importer",
    restore: "Restaurer", versions: "Versions précédentes", advanced: "Provenance et versions",
    setup: "Ouvrir la configuration", selectFile: "Fichier", mediaType: "Type de média",
  },
  en: {
    shot: "Shot", seconds: "s", ready: "Ready", blocked: "Blocked", stale: "Stale",
    running: "Running", queued: "Queued", awaiting_approval: "Needs approval", failed: "Failed", complete: "Complete", missing: "Missing",
    noPreview: "No preview", next: "Next action", artifacts: "Required sources",
    present: "present", approved: "approved", required: "required", optional: "optional",
    provenance: "Provenance", generate: "Generate", reroll: "Reroll", import: "Import",
    restore: "Restore", versions: "Previous versions", advanced: "Provenance and versions",
    setup: "Open setup", selectFile: "File", mediaType: "Media type",
  },
} as const;

const artifactLabel = (kind: ArtifactKind) => ({ keyframe: "Keyframe", video: "Video", voice: "Voice" })[kind];
const tone = (state: ShotProductionState["readiness"]) =>
  state === "ready" || state === "complete" ? "success" : state === "failed" ? "danger" : state === "running" || state === "queued" ? "info" : "warning";

function provenanceLabel(artifact: ShotArtifact): string {
  const value = artifact.provenance;
  return [value.source, value.model, value.workflow, value.seed === null ? null : `seed ${value.seed}`, value.revision]
    .filter(Boolean)
    .join(" · ");
}

function actionArtifact(action: ProductionAction): ArtifactKind {
  return action.artifact ?? "keyframe";
}

export interface ShotProductionCardProps {
  readonly busy: boolean;
  readonly canImport: boolean;
  readonly locale: ProductionLocale;
  readonly shot: ShotProductionState;
  readonly onApprove: () => void;
  readonly onEnqueue: (artifact: ArtifactKind, force: boolean) => void;
  readonly onImport: (artifact: ArtifactKind, file: File) => void;
  readonly onOpenSetup: () => void;
  readonly onRestore: (runId: string) => void;
  readonly onRetry: (queueItemId: string) => void;
}

export function ShotProductionCard({
  busy, canImport, locale, shot, onApprove, onEnqueue, onImport, onOpenSetup, onRestore, onRetry,
}: ShotProductionCardProps) {
  const labels = COPY[locale];
  const generationActions = shot.actions.filter((item) => item.kind === "generate" || item.kind === "reroll");
  const setupAction = shot.actions.find((item) => item.kind === "setup");
  const submitImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    const artifact = data.get("artifact");
    if (!(file instanceof File) || file.size === 0) return;
    if (artifact !== "keyframe" && artifact !== "video" && artifact !== "voice") return;
    onImport(artifact, file);
  };
  const active = shot.queueItems.find((item) => item.status === "running" || item.status === "queued");
  return (
    <Card
      className={styles.shotCard}
      data-shot-id={shot.id}
      data-shot-status={shot.readiness}
    >
      <header className={styles.shotHeader}>
        <div>
          <small>{labels.shot} {shot.position}</small>
          <h3>{shot.title}</h3>
        </div>
        <Badge tone={tone(shot.readiness)}>{labels[shot.readiness]}</Badge>
      </header>
      <MediaFrame aspectRatio="9 / 16" caption={shot.durationSeconds === null ? undefined : `${shot.durationSeconds} ${labels.seconds}`} fit="contain">
        {shot.previewKind === "video" && shot.previewUrl ? (
          <video controls preload="metadata" src={shot.previewUrl}>
            <track kind="captions" label="Captions unavailable" src="data:text/vtt,WEBVTT" srcLang={locale} />
          </video>
        ) : shot.previewUrl ? (
          <img alt={`${labels.shot} ${shot.position}`} src={shot.previewUrl} />
        ) : (
          <span className={styles.emptyPreview}>{labels.noPreview}</span>
        )}
      </MediaFrame>
      {shot.action ? <p className={styles.shotAction}>{shot.action}</p> : null}
      {shot.blocker ? <p className={styles.blocker} role="status">{shot.blocker}</p> : null}
      {shot.error ? <p className={styles.error} role="alert">{shot.error}</p> : null}
      {shot.nextAction ? <p className={styles.nextAction}><strong>{labels.next}:</strong> {shot.nextAction}</p> : null}
      {active ? <Progress label={active.message || active.kind} max={100} showValue value={active.progress} /> : null}
      <section aria-label={labels.artifacts} className={styles.artifacts}>
        {shot.artifacts.map((artifact) => (
          <div data-artifact={artifact.kind} key={artifact.kind}>
            <strong>{artifactLabel(artifact.kind)}</strong>
            <small>{artifact.required ? labels.required : labels.optional}</small>
            <span>{artifact.present ? labels.present : "—"}{artifact.approved ? ` · ${labels.approved}` : ""}</span>
            {artifact.stale ? <Badge tone="warning">{labels.stale}</Badge> : null}
          </div>
        ))}
      </section>
      <div className={styles.cardActions}>
        {generationActions.map((item, index) => (
          <Button
            data-production-action={item.kind}
            disabled={busy || !item.enabled}
            key={`${item.kind}-${item.artifact ?? index}`}
            onClick={() => onEnqueue(actionArtifact(item), item.kind === "reroll")}
            size="small"
            title={item.reason ?? undefined}
            variant={item.kind === "generate" ? "primary" : "secondary"}
          >
            {item.kind === "generate" ? labels.generate : labels.reroll} {artifactLabel(actionArtifact(item)).toLocaleLowerCase()}
          </Button>
        ))}
        {setupAction ? <Button data-production-action="setup" onClick={onOpenSetup} size="small" variant="secondary">{labels.setup}</Button> : null}
      </div>
      <ApprovalPanel actions={shot.actions} busy={busy} locale={locale} onApprove={onApprove} onRetry={onRetry} queueItems={shot.queueItems} />
      {canImport ? (
        <details className={styles.importPanel}>
          <summary>{labels.import}</summary>
          <form onSubmit={submitImport}>
            <label>{labels.mediaType}<select name="artifact"><option value="keyframe">Keyframe</option><option value="video">Video</option><option value="voice">Voice</option></select></label>
            <label>{labels.selectFile}<input name="file" required type="file" /></label>
            <Button data-production-action="import" disabled={busy} size="small" type="submit" variant="secondary">{labels.import}</Button>
          </form>
        </details>
      ) : null}
      <details className={styles.technical}>
        <summary>{labels.advanced}</summary>
        <div>
          {shot.artifacts.map((artifact) => {
            const source = provenanceLabel(artifact);
            return source || artifact.sha256 ? <p key={artifact.kind}><strong>{artifactLabel(artifact.kind)} · {labels.provenance}</strong><br />{source || "—"}{artifact.sha256 ? <code>{artifact.sha256}</code> : null}</p> : null;
          })}
          {shot.history.length ? <section aria-label={labels.versions}><h4>{labels.versions}</h4>{shot.history.filter((run) => !run.current).map((run) => <div className={styles.historyRow} key={run.id}><span>{run.createdAt ?? run.id} · {run.status ?? "—"}</span><Button data-production-action="restore" disabled={busy} onClick={() => onRestore(run.id)} size="small" variant="ghost">{labels.restore}</Button></div>)}</section> : null}
        </div>
      </details>
    </Card>
  );
}
