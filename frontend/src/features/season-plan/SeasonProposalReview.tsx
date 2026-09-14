import { useEffect, useState } from "react";

import { Badge, Button, Card } from "@shared";

import type { SeasonPlanApi } from "./api";
import { EMPTY_SEASON_PROPOSAL_ITEM, type SeasonPlanProposal, type SeasonPlanSnapshot, type SeasonProposalItem, type SeasonProposalItemFields } from "./model";
import styles from "./SeasonPlanBoard.module.css";

interface Props {
  readonly api: SeasonPlanApi;
  readonly locale: "fr" | "en";
  readonly plan: SeasonPlanSnapshot;
  readonly proposal: SeasonPlanProposal | null;
  readonly onPlanAccepted: (plan: SeasonPlanSnapshot) => void;
  readonly onProposalChanged: (proposal: SeasonPlanProposal | null) => void;
  readonly onError: (error: unknown) => void;
}

const copyItem = (item: SeasonProposalItem): SeasonProposalItem => ({
  id: item.id, position: item.position, season: item.season, manually_edited_fields: [...item.manually_edited_fields],
  title: item.title, logline: item.logline, synopsis: item.synopsis, cliffhanger: item.cliffhanger,
  hook: item.hook, conflict: item.conflict, relationship_shift: item.relationship_shift,
  relationship_ids: [...item.relationship_ids], secret_id: item.secret_id,
  character_ids: [...item.character_ids], location_ids: [...item.location_ids],
});
const lines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

export function SeasonProposalReview({ api, locale, onError, onPlanAccepted, onProposalChanged, plan, proposal }: Props) {
  const fr = locale === "fr";
  const [count, setCount] = useState(6);
  const [draft, setDraft] = useState<readonly SeasonProposalItem[]>([]);
  const [busy, setBusy] = useState<"generate" | "save" | "accept" | null>(null);
  const planChanged = proposal !== null && proposal.base_plan_revision !== plan.revision;
  const stale = proposal?.stale === true || planChanged;

  useEffect(() => setDraft(proposal?.items.map(copyItem) ?? []), [proposal]);

  const run = async <T,>(kind: NonNullable<typeof busy>, action: () => Promise<T>, done: (value: T) => void) => {
    setBusy(kind);
    try { done(await action()); } catch (reason) { onError(reason); } finally { setBusy(null); }
  };
  const generate = () => void run("generate", () => api.generateProposal({ episode_count: count }), onProposalChanged);
  const save = () => {
    if (!proposal) return;
    void run("save", () => api.updateProposal({ expected_revision: proposal.revision, items: draft }), onProposalChanged);
  };
  const accept = () => {
    if (!proposal || stale || !proposal.validation.valid) return;
    void run("accept", async () => {
      const saved = await api.updateProposal({ expected_revision: proposal.revision, items: draft });
      onProposalChanged(saved);
      return api.acceptProposal({ expected_revision: saved.revision, expected_plan_revision: saved.base_plan_revision });
    }, (snapshot) => { onPlanAccepted(snapshot); onProposalChanged(null); });
  };
  const update = (index: number, patch: Partial<SeasonProposalItemFields>) => setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const move = (index: number, delta: number) => setDraft((current) => {
    const target = index + delta;
    if (target < 0 || target >= current.length) return current;
    const next = [...current]; const [item] = next.splice(index, 1); next.splice(target, 0, item); return next;
  });

  return <section aria-labelledby="season-proposal-title" className={styles.proposal}>
    <header className={styles.proposalHeader}>
      <div><small>{fr ? "ASSISTANT IA" : "AI ASSISTANT"}</small><h2 id="season-proposal-title">{fr ? "Proposition de saison" : "Season proposal"}</h2>
        <p>{fr ? "Génère un brouillon isolé, puis révise-le avant toute application au plan." : "Generate an isolated draft, then review it before applying anything to the plan."}</p></div>
      <div className={styles.generate}>
        <label>{fr ? "Épisodes" : "Episodes"}<input aria-label={fr ? "Nombre d’épisodes" : "Episode count"} max={20} min={6} onChange={(event) => setCount(event.currentTarget.valueAsNumber)} type="number" value={count} /></label>
        <Button loading={busy === "generate"} onClick={generate}>{proposal ? (fr ? "Régénérer" : "Regenerate") : (fr ? "Générer" : "Generate")}</Button>
      </div>
    </header>
    {!proposal ? <p className={styles.proposalEmpty}>{fr ? "Aucune proposition active. Le plan actuel reste inchangé." : "No active proposal. The current plan remains unchanged."}</p> :
      <>
        <div className={styles.proposalMeta}>
          <Badge tone={stale ? "warning" : proposal.validation.valid ? "success" : "warning"}>
            {stale ? (fr ? "Périmée" : "Stale") : proposal.validation.valid ? (fr ? "Prête à réviser" : "Ready to review") : (fr ? "À corriger" : "Needs fixes")}
          </Badge>
          <span>{fr ? "Base du plan" : "Plan baseline"} <strong>r{proposal.base_plan_revision}</strong></span>
          <span>{fr ? "Modèle" : "Model"} <strong>{proposal.provenance.model}</strong></span>
          <span>{fr ? "Tâche" : "Task"} <strong>{proposal.provenance.task_id}@{proposal.provenance.task_version}</strong></span>
          <code title={fr ? "Empreinte du contexte" : "Context fingerprint"}>{proposal.source_fingerprint.slice(0, 12)}</code>
        </div>
        {stale ? <div className={styles.stale} role="alert">{fr ? "Le casting, les relations ou le plan ont changé. Régénère la proposition : elle ne sera pas appliquée silencieusement." : "Casting, relationships, or the plan changed. Regenerate the proposal; it will not be silently applied."}</div> : null}
        {proposal.validation.issues.length > 0 ? <ul className={styles.issues}>{proposal.validation.issues.map((issue, index) => <li key={`${issue.code}-${issue.item_id ?? index}`}><strong>{issue.code}</strong> — {issue.message}</li>)}</ul> : null}
        <ol className={styles.proposalList}>{draft.map((item, index) => {
          const before = plan.items[index];
          const changed = before ? before.title !== item.title || before.logline !== item.logline || before.synopsis !== item.synopsis || before.cliffhanger !== item.cliffhanger : true;
          return <li key={proposal.items[index]?.id ?? `new-${index}`}>
            <Card className={styles.proposalCard} padding="medium">
              <header className={styles.cardHeader}><div className={styles.identity}><strong>{fr ? "Épisode" : "Episode"} {index + 1}</strong><Badge tone={before ? changed ? "info" : "neutral" : "success"}>{before ? changed ? (fr ? "Modifié" : "Changed") : (fr ? "Inchangé" : "Unchanged") : (fr ? "Nouveau" : "New")}</Badge></div>
                <div className={styles.moveActions}><Button aria-label={fr ? "Monter la proposition" : "Move proposal up"} disabled={index === 0} onClick={() => move(index, -1)} size="small" variant="ghost">↑</Button><Button aria-label={fr ? "Descendre la proposition" : "Move proposal down"} disabled={index === draft.length - 1} onClick={() => move(index, 1)} size="small" variant="ghost">↓</Button><Button aria-label={fr ? "Retirer de la proposition" : "Remove from proposal"} onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))} size="small" variant="danger">×</Button></div>
              </header>
              {before && changed ? <p className={styles.diff}><span>{fr ? "Avant :" : "Before:"} <del>{before.title}</del></span><span>{fr ? "Après :" : "After:"} <ins>{item.title || "—"}</ins></span></p> : null}
              <div className={styles.form}>
                <label>{fr ? "Titre" : "Title"}<input onChange={(event) => update(index, { title: event.currentTarget.value })} required value={item.title} /></label>
                <label>Hook<textarea onChange={(event) => update(index, { hook: event.currentTarget.value })} required value={item.hook} /></label>
                <label>{fr ? "Conflit" : "Conflict"}<textarea onChange={(event) => update(index, { conflict: event.currentTarget.value })} required value={item.conflict} /></label>
                <label>{fr ? "Bascule relationnelle" : "Relationship shift"}<textarea onChange={(event) => update(index, { relationship_shift: event.currentTarget.value })} required value={item.relationship_shift} /></label>
                <label>Cliffhanger<textarea onChange={(event) => update(index, { cliffhanger: event.currentTarget.value })} required value={item.cliffhanger} /></label>
                <details className={styles.advanced}><summary>{fr ? "Tous les champs" : "All fields"}</summary>
                  <label>Logline<textarea onChange={(event) => update(index, { logline: event.currentTarget.value })} value={item.logline} /></label>
                  <label>Synopsis<textarea onChange={(event) => update(index, { synopsis: event.currentTarget.value })} value={item.synopsis} /></label>
                  <label>{fr ? "Personnages (un ID par ligne)" : "Characters (one ID per line)"}<textarea onChange={(event) => update(index, { character_ids: lines(event.currentTarget.value) })} value={item.character_ids.join("\n")} /></label>
                  <label>{fr ? "Lieux (un ID par ligne)" : "Locations (one ID per line)"}<textarea onChange={(event) => update(index, { location_ids: lines(event.currentTarget.value) })} value={item.location_ids.join("\n")} /></label>
                  <label>{fr ? "Relations (un ID par ligne)" : "Relationships (one ID per line)"}<textarea onChange={(event) => update(index, { relationship_ids: lines(event.currentTarget.value) })} value={item.relationship_ids.join("\n")} /></label>
                  <label>{fr ? "Secret éventuel" : "Optional secret"}<input onChange={(event) => update(index, { secret_id: event.currentTarget.value || null })} value={item.secret_id ?? ""} /></label>
                </details>
              </div>
            </Card>
          </li>;
        })}</ol>
        <div className={styles.proposalActions}>
          <Button onClick={() => setDraft((current) => [...current, { ...EMPTY_SEASON_PROPOSAL_ITEM, id: `proposal-item-local-${current.length + 1}`, position: current.length + 1, season: 1, manually_edited_fields: [] }])} variant="secondary">{fr ? "Ajouter un épisode" : "Add episode"}</Button>
          <Button loading={busy === "save"} onClick={save} variant="secondary">{fr ? "Enregistrer le brouillon" : "Save draft"}</Button>
          <Button disabled={stale || !proposal.validation.valid || draft.length < 6 || draft.length > 20} loading={busy === "accept"} onClick={accept}>{fr ? "Valider et appliquer au plan" : "Validate and apply to plan"}</Button>
        </div>
      </>}
  </section>;
}
