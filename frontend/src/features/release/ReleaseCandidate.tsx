import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { Badge, Button, ErrorState, MediaFrame, Skeleton } from "@shared";

import { releaseCandidateApi } from "./api";
import type { ReleaseCandidateApi, ReleaseCandidateSnapshot, ReleaseLocale } from "./model";
import styles from "./ReleaseCandidate.module.css";

const COPY = {
  fr: {
    eyebrow: "PUBLICATION", title: "Version finale", intro: "Vérifie le master, décide si l’histoire est publiable, puis exporte un pack Reel versionné.",
    technical: "Validation technique", artistic: "Décision humaine", ready: "Prêt techniquement", blocked: "Bloqué techniquement",
    quality: "La validation technique ne juge ni l’histoire, ni le rythme, ni la qualité artistique. Regarde le master en entier avant d’approuver.",
    approved: "Approuvé pour publication", pending: "À regarder et approuver", stale: "Le master a changé : cette validation est périmée.",
    refresh: "Créer ou actualiser", refreshing: "Vérification…", approve: "J’approuve cette version", approving: "Approbation…",
    export: "Exporter le pack", exporting: "Export…", save: "Enregistrer le texte et la couverture", saving: "Enregistrement…",
    caption: "Modèle du texte de publication", captionPreview: "Aperçu du texte final", cover: "Couverture", coverShot: "ID du plan de couverture", master: "Master vertical", subtitles: "Sous-titres", manifest: "Manifeste de release",
    provenance: "Sources et empreintes", history: "Exports précédents", noHistory: "Aucun pack exporté pour le moment.",
    download: "Télécharger", verified: "ffprobe vérifié", safe: "Profil de sous-titres en zone sûre",
    unavailable: "Aucun épisode sélectionné", unavailableDescription: "Sélectionne un épisode pour préparer sa publication.",
    failure: "Release indisponible", retry: "Réessayer", version: "Version", folder: "Dossier immutable",
  },
  en: {
    eyebrow: "RELEASE", title: "Final release", intro: "Verify the master, decide whether the story is publishable, then export a versioned Reel pack.",
    technical: "Technical validation", artistic: "Human decision", ready: "Technically ready", blocked: "Technically blocked",
    quality: "Technical validation does not judge the story, pacing, or artistic quality. Watch the entire master before approving.",
    approved: "Approved for release", pending: "Watch and approve", stale: "The master changed: this approval is stale.",
    refresh: "Create or refresh", refreshing: "Verifying…", approve: "Approve this version", approving: "Approving…",
    export: "Export release pack", exporting: "Exporting…", save: "Save caption and cover", saving: "Saving…",
    caption: "Publishing caption", captionPreview: "Final caption preview", cover: "Cover", coverShot: "Cover shot ID", master: "Vertical master", subtitles: "Subtitles", manifest: "Release manifest",
    provenance: "Sources and fingerprints", history: "Previous exports", noHistory: "No release pack has been exported yet.",
    download: "Download", verified: "ffprobe verified", safe: "Safe-area subtitle profile",
    unavailable: "No episode selected", unavailableDescription: "Select an episode to prepare its release.",
    failure: "Release unavailable", retry: "Try again", version: "Version", folder: "Immutable folder",
  },
} as const;

const assetLabel = (kind: string, labels: typeof COPY.fr | typeof COPY.en) => ({
  master: labels.master,
  cover: labels.cover,
  subtitles: labels.subtitles,
  caption: labels.caption,
  manifest: labels.manifest,
}[kind] ?? kind);

function ReleaseDetails({
  api, busy, locale, snapshot, onMutate,
}: {
  readonly api: ReleaseCandidateApi;
  readonly busy: boolean;
  readonly locale: ReleaseLocale;
  readonly snapshot: ReleaseCandidateSnapshot;
  readonly onMutate: (operation: () => Promise<unknown>) => void;
}) {
  const labels = COPY[locale];
  const master = snapshot.assets.find((item) => item.kind === "master");
  const subtitles = snapshot.assets.find((item) => item.kind === "subtitles");
  const cover = snapshot.assets.find((item) => item.kind === "cover");
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onMutate(() => api.update(snapshot.episode.id, {
      captionTemplate: String(data.get("caption_template") ?? ""),
      coverShotId: String(data.get("cover_shot_id") || "") || null,
      expectedRevision: snapshot.revision,
    }));
  };
  return <>
    {snapshot.stale ? <p className={styles.stale} data-release-stale role="alert">{labels.stale}{snapshot.staleReason ? ` ${snapshot.staleReason}` : ""}</p> : null}
    <div className={styles.validationGrid}>
      <section className={styles.validationCard} data-release-technical-ready={snapshot.technical.ready}>
        <header><h2>{labels.technical}</h2><Badge tone={snapshot.technical.ready ? "success" : "danger"}>{snapshot.technical.ready ? labels.ready : labels.blocked}</Badge></header>
        <dl><div><dt>Format</dt><dd>{snapshot.technical.width ?? "?"} × {snapshot.technical.height ?? "?"}</dd></div><div><dt>FPS</dt><dd>{snapshot.technical.fps ?? "?"}</dd></div><div><dt>Duration</dt><dd>{snapshot.technical.durationSeconds ?? "?"} s</dd></div></dl>
        <ul><li data-ok={snapshot.technical.verified}>{labels.verified}</li><li data-ok={snapshot.technical.safeAreaSubtitles}>{labels.safe}</li></ul>
        {snapshot.technical.blockers.length ? <ul className={styles.blockers}>{snapshot.technical.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : null}
      </section>
      <section className={styles.validationCard} data-release-human-approved={snapshot.approval.approved}>
        <header><h2>{labels.artistic}</h2><Badge tone={snapshot.approval.approved && !snapshot.stale ? "success" : "warning"}>{snapshot.approval.approved && !snapshot.stale ? labels.approved : labels.pending}</Badge></header>
        <p data-release-quality-disclaimer>{labels.quality}</p>
        <p>{snapshot.approval.approvedAt ? `${snapshot.approval.approvedAt}${snapshot.approval.approvedBy ? ` · ${snapshot.approval.approvedBy}` : ""}` : labels.pending}</p>
        <Button data-release-action="approve" disabled={busy || !snapshot.canApprove} loading={busy} loadingLabel={labels.approving} onClick={() => onMutate(() => api.approve(snapshot.episode.id, snapshot.revision))}>{labels.approve}</Button>
      </section>
    </div>
    <section className={styles.previewGrid}>
      <div>{master?.url ? <MediaFrame aspectRatio="9 / 16" caption={labels.master} fit="contain"><video aria-label={labels.master} controls preload="metadata" src={master.url}><track kind="captions" label={labels.subtitles} src={subtitles?.url ?? "data:text/vtt,WEBVTT"} srcLang={locale} /></video></MediaFrame> : <div className={styles.emptyPreview}>{labels.master}</div>}</div>
      <div>{(snapshot.selectedCoverUrl ?? cover?.url) ? <MediaFrame aspectRatio="9 / 16" caption={labels.cover}><img alt={labels.cover} src={snapshot.selectedCoverUrl ?? cover?.url ?? ""} /></MediaFrame> : <div className={styles.emptyPreview}>{labels.cover}</div>}</div>
    </section>
    <nav aria-label={labels.download} className={styles.assetLinks}>{snapshot.assets.filter((item) => item.url).map((item) => <a data-release-download={item.kind} download href={item.url ?? undefined} key={item.kind}>{labels.download} {assetLabel(item.kind, labels)}</a>)}</nav>
    <form className={styles.editor} onSubmit={save}>
      <label>{labels.caption}<textarea defaultValue={snapshot.caption} name="caption_template" rows={5} /></label>
      <div className={styles.captionPreview}><strong>{labels.captionPreview}</strong><p data-release-caption-preview>{snapshot.renderedCaption}</p></div>
      <fieldset><legend>{labels.cover}</legend><label>{labels.coverShot}<input defaultValue={snapshot.selectedCoverShotId ?? ""} name="cover_shot_id" pattern="S[0-9]{2}E[0-9]{3}-S[0-9]{2}" /></label><div className={styles.coverOptions}>{snapshot.coverOptions.map((option, index) => option.url ? <button aria-label={`${labels.cover} ${index + 1}`} key={option.shotId} onClick={(event) => { const input = event.currentTarget.closest("fieldset")?.querySelector<HTMLInputElement>('input[name="cover_shot_id"]'); if (input) input.value = option.shotId; }} type="button"><img alt="" src={option.url} /></button> : null)}</div></fieldset>
      <Button data-release-action="save" disabled={busy} loading={busy} loadingLabel={labels.saving} type="submit" variant="secondary">{labels.save}</Button>
    </form>
    <details className={styles.provenance}><summary>{labels.provenance}</summary><ul>{snapshot.provenance.map((item) => <li key={`${item.source}:${item.sha256}`}><strong>{item.source}</strong><code>{item.sha256 ?? item.revision ?? "—"}</code></li>)}</ul></details>
    <section className={styles.exportSection}><header><h2>{labels.history}</h2><Button data-release-action="export" disabled={busy || !snapshot.canExport} loading={busy} loadingLabel={labels.exporting} onClick={() => onMutate(() => api.exportPack(snapshot.episode.id, snapshot.revision))}>{labels.export}</Button></header>
      {snapshot.exports.length ? <ol className={styles.exportHistory}>{snapshot.exports.map((item) => <li key={item.id}><div><strong>{labels.version} {item.version ?? item.id}</strong><small>{item.createdAt ?? ""}</small>{item.directory ? <code title={labels.folder}>{item.directory}</code> : null}</div><nav aria-label={`${labels.version} ${item.version ?? item.id}`}>{Object.entries(item.links).map(([name, url]) => <a data-release-download={name} download href={url} key={name}>{labels.download} {name}</a>)}</nav></li>)}</ol> : <p>{labels.noHistory}</p>}
    </section>
  </>;
}

export interface ReleaseCandidateProps {
  readonly api?: ReleaseCandidateApi;
  readonly episodeId: string | null;
  readonly locale: ReleaseLocale;
}

export function ReleaseCandidate({ api = releaseCandidateApi, episodeId, locale }: ReleaseCandidateProps) {
  const labels = COPY[locale];
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["release-candidate", episodeId], queryFn: () => api.get(episodeId as string), enabled: Boolean(episodeId), retry: false });
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onMutate: () => setError(""),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["release-candidate", episodeId] }),
    onError: (reason) => setError(reason instanceof Error ? reason.message : labels.failure),
  });
  if (!episodeId) return <ErrorState description={labels.unavailableDescription} title={labels.unavailable} />;
  if (query.isPending) return <Skeleton aria-label={labels.refreshing} height="30rem" width="100%" />;
  if (query.error || !query.data) return <ErrorState action={<Button onClick={() => query.refetch()}>{labels.retry}</Button>} description={query.error instanceof Error ? query.error.message : labels.failure} title={labels.failure} />;
  const snapshot = query.data;
  const mutate = (operation: () => Promise<unknown>) => mutation.mutate(operation);
  return <main className={styles.root} data-release-candidate data-release-status={snapshot.status}>
    <header className={styles.hero}><div><small>{labels.eyebrow}</small><h1>{labels.title}</h1><p>{labels.intro}</p></div><div className={styles.heroActions}><Badge tone={snapshot.stale ? "danger" : snapshot.status === "exported" ? "success" : "neutral"}>{snapshot.status}</Badge><Button data-release-action={snapshot.status === "missing" ? "create" : "refresh"} disabled={mutation.isPending || !snapshot.canRefresh} loading={mutation.isPending} loadingLabel={labels.refreshing} onClick={() => mutate(() => api.createOrRefresh(episodeId))} variant="secondary">{labels.refresh}</Button></div></header>
    {error ? <p className={styles.stale} role="alert">{error}</p> : null}
    {snapshot.status === "missing" ? <p>{labels.intro}</p> : <ReleaseDetails api={api} busy={mutation.isPending} locale={locale} onMutate={mutate} snapshot={snapshot} />}
  </main>;
}
