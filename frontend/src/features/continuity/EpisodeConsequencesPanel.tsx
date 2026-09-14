import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from "@shared";
import { ApiError } from "@shared/api";

import type { ContinuityApi, ContinuityEvidence, ContinuitySeverity, EpisodeContinuitySnapshot } from "./model";
import styles from "./EpisodeConsequencesPanel.module.css";

export interface EpisodeConsequencesPanelProps {
  readonly api: ContinuityApi;
  readonly episodeId: string;
  readonly locale?: "fr" | "en";
}

const TONE: Record<ContinuitySeverity, "warning" | "info" | "neutral"> = { blocker: "warning", warning: "info", suggestion: "neutral" };

function Evidence({ evidence, fr }: { readonly evidence: readonly ContinuityEvidence[]; readonly fr: boolean }) {
  if (evidence.length === 0) return null;
  return <details className={styles.evidence}><summary>{fr ? "Preuves et causes" : "Evidence and causes"} ({evidence.length})</summary>
    <ul>{evidence.map((item) => <li key={`${item.source_type}-${item.source_id}-${item.label}-${item.excerpt}`}><strong>{item.label || item.source_id}</strong>{item.excerpt ? <> — <q>{item.excerpt}</q></> : null}<small>{item.source_type} · {item.source_id}</small></li>)}</ul>
  </details>;
}

export function EpisodeConsequencesPanel({ api, episodeId, locale = "fr" }: EpisodeConsequencesPanelProps) {
  const fr = locale === "fr"; const queryClient = useQueryClient(); const key = ["continuity", episodeId] as const;
  const query = useQuery({ queryKey: key, queryFn: () => api.getEpisodeContinuity(episodeId) });
  const [busy, setBusy] = useState<"generate" | "approve" | "refuse" | null>(null);
  const [reason, setReason] = useState(""); const [error, setError] = useState(""); const [forcedStale, setForcedStale] = useState(false);
  const snapshot = query.data; const proposal = snapshot?.proposal;
  const stale = forcedStale || proposal?.stale === true || Boolean(proposal && proposal.source_fingerprint !== proposal.current_source_fingerprint);

  const run = async (kind: NonNullable<typeof busy>, action: () => Promise<EpisodeContinuitySnapshot>, message: string) => {
    setBusy(kind);
    try { queryClient.setQueryData(key, await action()); setError(message); setForcedStale(false); }
    catch (failure) {
      if (failure instanceof ApiError && failure.status === 409) {
        setForcedStale(true); setError(fr ? "La source a changé. Réévalue les conséquences avant toute approbation." : "The source changed. Re-evaluate consequences before approval.");
      } else setError(fr ? "L’opération a échoué sans modifier le canon." : "The operation failed without changing canon.");
    } finally { setBusy(null); }
  };

  if (query.isPending) return <Skeleton aria-label={fr ? "Chargement des conséquences" : "Loading consequences"} height="20rem" width="100%" />;
  if (query.error || !snapshot) return <ErrorState action={<Button onClick={() => query.refetch()}>{fr ? "Recharger" : "Reload"}</Button>} description={fr ? "Aucune conséquence n’a été appliquée." : "No consequence was applied."} title={fr ? "Continuité indisponible" : "Continuity unavailable"} />;

  return <section aria-labelledby={`consequences-${episodeId}`} className={styles.root}>
    <header className={styles.header}><div><small>{fr ? "CONTINUITÉ CANONIQUE" : "CANON CONTINUITY"}</small><h2 id={`consequences-${episodeId}`}>{fr ? "Conséquences de l’épisode" : "Episode consequences"}</h2><p>{episodeId} · {fr ? "état révision" : "state revision"} {snapshot.input_state.revision}</p></div>
      <Button loading={busy === "generate"} onClick={() => void run("generate", () => api.generateDelta(episodeId), fr ? "Nouvelle proposition prête à examiner." : "New proposal ready for review.")}>{proposal ? (fr ? "Réévaluer" : "Re-evaluate") : (fr ? "Proposer un delta" : "Propose delta")}</Button>
    </header>
    {error ? <p aria-live="polite" className={stale ? styles.stale : styles.notice} role={stale ? "alert" : undefined}>{error}</p> : null}

    <div className={styles.columns}>
      <section aria-labelledby={`input-state-${episodeId}`}><h3 id={`input-state-${episodeId}`}>{fr ? "État d’entrée" : "Input state"}</h3>
        {snapshot.input_state.entries.length === 0 ? <p>{fr ? "Aucun fait canonique avant cet épisode." : "No canonical fact before this episode."}</p> :
          <ul className={styles.entries}>{snapshot.input_state.entries.map((entry) => <li key={entry.id}><Badge tone="neutral">{entry.category}</Badge><strong>{entry.label}</strong><span>{entry.value}</span><Evidence evidence={entry.evidence} fr={fr} /></li>)}</ul>}
      </section>
      <section aria-labelledby={`delta-${episodeId}`}><h3 id={`delta-${episodeId}`}>{fr ? "Delta proposé — non appliqué" : "Proposed delta — not applied"}</h3>
        {!proposal ? <EmptyState description={fr ? "Génère ou saisis une proposition. Le canon reste inchangé jusqu’à une approbation distincte." : "Generate or enter a proposal. Canon remains unchanged until separate approval."} title={fr ? "Aucune proposition" : "No proposal"} /> :
          <><div className={styles.provenance}><Badge tone={proposal.status === "approved" ? "success" : stale ? "warning" : "info"}>{stale ? (fr ? "Périmé" : "Stale") : proposal.status}</Badge><span>{proposal.provenance.model}</span><code>{proposal.provenance.task_id}@{proposal.provenance.task_version}</code><code>{proposal.provenance.source_fingerprint.slice(0, 12)}</code></div>
            {stale ? <p className={styles.stale} role="alert">{fr ? "Cette proposition ne correspond plus à sa source et ne peut pas être approuvée." : "This proposal no longer matches its source and cannot be approved."}</p> : null}
            {proposal.findings && proposal.findings.length > 0 ? <ul className={styles.changes}>{proposal.findings.map((finding) => <li key={finding.code}><header><Badge tone={TONE[finding.severity]}>{finding.severity}</Badge><strong>{finding.code}</strong></header><p>{finding.message}</p></li>)}</ul> : null}
            <ul className={styles.changes}>{proposal.changes.map((change) => <li key={change.id}><header><Badge tone="info">{change.category}</Badge><strong>{change.label}</strong><small>{change.operation}</small></header><div className={styles.diff}>{change.before !== null ? <del>{change.before}</del> : null}<span aria-hidden="true">→</span>{change.after !== null ? <ins>{change.after}</ins> : <em>∅</em>}</div><Evidence evidence={change.evidence} fr={fr} /></li>)}</ul>
            {proposal.status === "proposed" ? <div className={styles.decisions}><label>{fr ? "Motif du refus" : "Refusal reason"}<textarea onChange={(event) => setReason(event.currentTarget.value)} required value={reason} /></label><div><Button disabled={!reason.trim()} loading={busy === "refuse"} onClick={() => void run("refuse", () => api.refuseDelta(episodeId, proposal.id, { expected_revision: snapshot.revision, reason: reason.trim() }), fr ? "Delta refusé. Le canon reste inchangé." : "Delta refused. Canon remains unchanged.")} variant="danger">{fr ? "Refuser sans appliquer" : "Refuse without applying"}</Button><Button disabled={stale || proposal.changes.length === 0} loading={busy === "approve"} onClick={() => void run("approve", () => api.approveDelta(episodeId, proposal.id, { expected_revision: snapshot.revision, expected_source_fingerprint: proposal.current_source_fingerprint }), fr ? "Delta approuvé et appliqué au canon." : "Delta approved and applied to canon.")}>{fr ? "Approuver et appliquer" : "Approve and apply"}</Button></div></div> : null}
          </>}
      </section>
    </div>
    {snapshot.impact_report ? <section aria-labelledby={`impact-${episodeId}`} className={styles.impact}><h3 id={`impact-${episodeId}`}>{snapshot.impact_report.trigger === "reorder" ? (fr ? "Rapport d’impact du réordonnancement" : "Reorder impact report") : (fr ? "Rapport d’impact" : "Impact report")}</h3>
      {snapshot.impact_report.affected_items.length === 0 ? <p>{fr ? "Aucun item suivant affecté." : "No following item affected."}</p> : <ol>{snapshot.impact_report.affected_items.map((item) => <li key={item.season_item_id}><Card padding="small"><header><Badge tone={TONE[item.severity]}>{item.severity}</Badge><strong>{item.title}</strong></header><ul>{item.reasons.map((cause) => <li key={cause}>{cause}</li>)}</ul><Evidence evidence={item.evidence} fr={fr} /></Card></li>)}</ol>}
    </section> : null}
  </section>;
}
