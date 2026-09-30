import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button, ConfirmAction, EmptyState, ErrorState, Progress, Skeleton } from "@shared";

import { productionApi } from "./api";
import { EpisodeMasterPanel } from "./EpisodeMasterPanel";
import type {
  ArtifactKind,
  AssembleEpisodeInput,
  EpisodeProductionApi,
  ProductionLocale,
  ShotProductionState,
} from "./model";
import { ShotProductionCard } from "./ShotProductionCard";
import styles from "./EpisodeProductionCockpit.module.css";

const COPY = {
  fr: {
    eyebrow: "PRODUCTION D’ÉPISODE", title: "Produire, valider, assembler", intro: "Chaque plan garde ses sources, sa provenance et sa validation. Le graphe reste un outil d’inspection.",
    loading: "Chargement de la production", unavailable: "Cockpit indisponible", retryLoad: "Réessayer",
    noEpisode: "Aucun épisode sélectionné", noEpisodeDescription: "Choisis ou crée un épisode avant de lancer la production.",
    readiness: "Plans prêts", produceMissing: "Produire les manquants", inspect: "Inspecter le pipeline",
    recovered: "Une file interrompue a été retrouvée. Relance uniquement les tâches que tu souhaites reprendre.",
    paused: "La file de production est en pause.", overwrite: "Remplacer une source approuvée ?",
    overwriteDescription: "La version actuelle restera dans l’historique. La nouvelle version devra être approuvée explicitement.",
    confirm: "Créer une nouvelle variante", cancel: "Conserver la version approuvée", operationFailed: "L’action a échoué.",
  },
  en: {
    eyebrow: "EPISODE PRODUCTION", title: "Produce, approve, assemble", intro: "Every shot keeps its sources, provenance, and approval. The graph remains an inspection tool.",
    loading: "Loading production", unavailable: "Cockpit unavailable", retryLoad: "Retry",
    noEpisode: "No episode selected", noEpisodeDescription: "Choose or create an episode before starting production.",
    readiness: "Ready shots", produceMissing: "Produce missing", inspect: "Inspect pipeline",
    recovered: "An interrupted queue was recovered. Retry only the tasks you want to resume.",
    paused: "The production queue is paused.", overwrite: "Replace an approved source?",
    overwriteDescription: "The current version stays in history. The new variant must be approved explicitly.",
    confirm: "Create a new variant", cancel: "Keep approved version", operationFailed: "The action failed.",
  },
} as const;

type PendingAction =
  | { readonly kind: "enqueue"; readonly shot: ShotProductionState; readonly artifact: ArtifactKind; readonly force: boolean }
  | { readonly kind: "import"; readonly shot: ShotProductionState; readonly artifact: ArtifactKind; readonly file: File; readonly confirmReplaceApproved: boolean }
  | { readonly kind: "restore"; readonly shot: ShotProductionState; readonly runId: string };

export interface EpisodeProductionCockpitProps {
  readonly api?: EpisodeProductionApi;
  readonly episodeId: string | null;
  readonly locale: ProductionLocale;
  readonly onOpenGraph?: () => void;
  readonly onOpenSetup?: () => void;
}

const activeQueue = (shot: ShotProductionState) =>
  shot.queueItems.some((item) => item.status === "running" || item.status === "queued");

export function EpisodeProductionCockpit({
  api = productionApi, episodeId, locale, onOpenGraph, onOpenSetup,
}: EpisodeProductionCockpitProps) {
  const labels = COPY[locale];
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const queryKey = ["production-cockpit", episodeId] as const;
  const query = useQuery({
    enabled: Boolean(episodeId),
    queryKey,
    queryFn: () => api.get(episodeId ?? ""),
    refetchInterval: (state) => {
      const snapshot = state.state.data;
      if (!snapshot) return false;
      const activeMaster = snapshot.master.jobStatus && !["ANIMATIC", "PREVIEW", "FINAL", "FAILED"].includes(snapshot.master.jobStatus);
      return snapshot.shots.some(activeQueue) || activeMaster ? 1_000 : false;
    },
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ["studio-journey"] }),
    ]);
  };
  const mutation = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      setError("");
      await refresh();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : labels.operationFailed),
  });
  const execute = (action: PendingAction) => {
    if (action.kind === "enqueue") mutation.mutate(() => api.enqueue(action.shot, action.artifact, action.force));
    if (action.kind === "import") mutation.mutate(() => api.importAsset(
      action.shot.id,
      action.artifact,
      action.file,
      action.confirmReplaceApproved,
    ));
    if (action.kind === "restore") mutation.mutate(() => api.restore(action.shot.id, action.runId));
  };
  const approved = (shot: ShotProductionState, artifact: ArtifactKind) =>
    shot.artifacts.some((item) => item.kind === artifact && item.approved);
  const protect = (action: PendingAction) => {
    const replacing = action.kind === "restore" || approved(action.shot, action.artifact);
    if (replacing) {
      setPending(action.kind === "import" ? { ...action, confirmReplaceApproved: true } : action);
    }
    else execute(action);
  };

  if (!episodeId) {
    return <EmptyState className={styles.state} description={labels.noEpisodeDescription} title={labels.noEpisode} />;
  }
  if (query.isPending) return <Skeleton aria-label={labels.loading} height="32rem" width="100%" />;
  if (query.error || !query.data) {
    return <ErrorState action={<Button onClick={() => void query.refetch()}>{labels.retryLoad}</Button>} className={styles.state} description={query.error?.message ?? labels.operationFailed} title={labels.unavailable} />;
  }
  const snapshot = query.data;
  const produceMissing = () => {
    setNotice("");
    mutation.mutate(() => api.produceMissing(snapshot.episode.id), {
      onSuccess: () => setNotice(labels.produceMissing),
    });
  };
  const assemble = (input: AssembleEpisodeInput) => mutation.mutate(() => api.assemble(snapshot.episode.id, input));
  return (
    <main className={styles.root} data-production-cockpit>
      <header className={styles.hero}>
        <div><small>{labels.eyebrow}</small><h1>{snapshot.episode.title}</h1><p>{labels.intro}</p></div>
        <div className={styles.heroProgress} data-assemblable={String(snapshot.master.canAssemble)} data-production-readiness>
          <Progress formatValue={(value, max) => `${value} / ${max}`} label={labels.readiness} max={snapshot.totalShots || 1} showValue value={snapshot.completedShots} />
          <div className={styles.heroActions}>
            <Button data-production-action="produce-missing" disabled={mutation.isPending} onClick={produceMissing}>{labels.produceMissing}</Button>
            {onOpenGraph ? <Button data-production-action="inspect-graph" onClick={onOpenGraph} variant="ghost">{labels.inspect}</Button> : null}
          </div>
        </div>
      </header>
      {snapshot.queue.recovered ? <p className={styles.notice} role="status">{labels.recovered}</p> : null}
      {snapshot.queue.paused ? <p className={styles.notice} role="status">{labels.paused}</p> : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <section className={styles.shotGrid} aria-label={labels.readiness}>
        {snapshot.shots.map((shot) => (
          <ShotProductionCard
            busy={mutation.isPending}
            canImport={snapshot.capabilities.manualImport}
            key={shot.id}
            locale={locale}
            onApprove={() => mutation.mutate(() => api.approve(shot.id))}
            onEnqueue={(artifact, force) => protect({ kind: "enqueue", shot, artifact, force })}
            onImport={(artifact, file) => protect({
              kind: "import",
              shot,
              artifact,
              file,
              confirmReplaceApproved: false,
            })}
            onOpenSetup={() => onOpenSetup?.()}
            onRestore={(runId) => protect({ kind: "restore", shot, runId })}
            onRetry={(queueItemId) => mutation.mutate(() => api.retry(queueItemId))}
            shot={shot}
          />
        ))}
      </section>
      <EpisodeMasterPanel busy={mutation.isPending} locale={locale} master={snapshot.master} onAssemble={assemble} />
      <ConfirmAction
        cancelLabel={labels.cancel}
        confirmLabel={labels.confirm}
        description={labels.overwriteDescription}
        onConfirm={() => { if (pending) execute(pending); setPending(null); }}
        onOpenChange={(open) => { if (!open) setPending(null); }}
        open={pending !== null}
        title={labels.overwrite}
      />
    </main>
  );
}
