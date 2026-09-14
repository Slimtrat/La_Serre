import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type DragEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";

import { Badge, Button, Card, ConfirmAction, EmptyState, ErrorState, Skeleton } from "@shared";
import { ApiError } from "@shared/api";

import type { SeasonPlanApi } from "./api";
import { getSeasonPlanMessages, type SeasonPlanLocale } from "./messages";
import { editableFields, EMPTY_SEASON_PLAN_ITEM, type SeasonPlanItem, type SeasonPlanItemFields, type SeasonPlanSnapshot, type SeasonPlanStatus } from "./model";
import styles from "./SeasonPlanBoard.module.css";
import { SeasonProposalReview } from "./SeasonProposalReview";

const QUERY_KEY = ["season-plan"] as const;
const PROPOSAL_QUERY_KEY = ["season-plan", "proposal"] as const;
export interface SeasonPlanBoardProps {
  readonly api: SeasonPlanApi;
  readonly locale: SeasonPlanLocale;
  readonly renderEpisodeConsequences?: (episodeId: string) => ReactNode;
}
const STATUS_TONE: Record<SeasonPlanStatus, "neutral" | "success" | "warning" | "info"> = {
  draft: "neutral", validated: "success", materialized: "info", produced: "success", obsolete: "warning",
};
const lines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

export function SeasonPlanBoard({ api, locale, renderEpisodeConsequences }: SeasonPlanBoardProps) {
  const labels = getSeasonPlanMessages(locale);
  const queryClient = useQueryClient();
  const planQuery = useQuery({ queryKey: QUERY_KEY, queryFn: api.getPlan });
  const proposalQuery = useQuery({ queryKey: PROPOSAL_QUERY_KEY, queryFn: api.getProposal });
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SeasonPlanItem | null>(null);
  const handles = useRef(new Map<string, HTMLButtonElement>());
  const plan = planQuery.data;

  const commit = (snapshot: SeasonPlanSnapshot, message: string) => {
    queryClient.setQueryData(QUERY_KEY, snapshot); setAnnouncement(message); setError("");
  };
  const perform = async (key: string, action: () => Promise<SeasonPlanSnapshot>, message: string) => {
    setBusyItem(key);
    try { commit(await action(), message); }
    catch (reason) { setError(reason instanceof ApiError && reason.status === 409 ? labels.conflict : labels.genericError); }
    finally { setBusyItem(null); }
  };
  const operationError = (reason: unknown) => setError(reason instanceof ApiError && reason.status === 409 ? labels.proposalConflict : labels.genericError);
  const reorder = async (sourceId: string, targetId: string) => {
    if (!plan || sourceId === targetId || busyItem) return;
    const ids = plan.items.filter((item) => !item.deleted_at).map((item) => item.id);
    const from = ids.indexOf(sourceId); const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const nextIds = [...ids]; nextIds.splice(from, 1); nextIds.splice(to, 0, sourceId);
    const previous = plan;
    const deleted = plan.items.filter((item) => item.deleted_at);
    const optimistic: SeasonPlanSnapshot = { ...plan, items: [...nextIds.map((id, position) => ({ ...(plan.items.find((item) => item.id === id) as SeasonPlanItem), position: position + 1 })), ...deleted] };
    queryClient.setQueryData(QUERY_KEY, optimistic); setBusyItem(sourceId);
    try { commit(await api.reorder({ expected_revision: plan.revision, item_ids: nextIds }), `${labels.episode} ${to + 1}: ${optimistic.items[to].title}`); }
    catch (reason) { queryClient.setQueryData(QUERY_KEY, previous); setError(reason instanceof ApiError && reason.status === 409 ? labels.conflict : labels.genericError); }
    finally { setBusyItem(null); setTimeout(() => handles.current.get(sourceId)?.focus(), 0); }
  };
  const moveBy = (itemId: string, delta: number) => {
    if (!plan) return;
    const index = plan.items.findIndex((item) => item.id === itemId);
    const target = plan.items[index + delta];
    if (target) void reorder(itemId, target.id);
  };

  if (planQuery.isPending) return <Skeleton aria-label={labels.loading} height="30rem" width="100%" />;
  if (planQuery.error || !plan) return <ErrorState action={<Button onClick={() => planQuery.refetch()}>{labels.reload}</Button>} description={labels.unavailableDescription} title={labels.unavailable} />;
  const add = () => void perform("new", () => api.createItem({ expected_revision: plan.revision, item: EMPTY_SEASON_PLAN_ITEM }), labels.add);

  return <div className={styles.root} data-season-plan-board>
    <header className={styles.header}>
      <div><small>{labels.eyebrow}</small><h1>{labels.title}</h1><p>{labels.description}</p></div>
      <div className={styles.headerActions}><span>{labels.revision} <strong>{plan.revision}</strong></span><Button loading={busyItem === "new"} loadingLabel={labels.adding} onClick={add}>{labels.add}</Button></div>
    </header>
    <p aria-live="polite" className={styles.live}>{announcement}</p>
    {error ? <div className={styles.error} role="alert"><span>{error}</span><Button onClick={() => planQuery.refetch()} size="small" variant="secondary">{labels.reload}</Button></div> : null}
    <SeasonProposalReview api={api} locale={locale} onError={operationError}
      onPlanAccepted={(snapshot) => commit(snapshot, labels.proposalAccepted)}
      onProposalChanged={(proposal) => queryClient.setQueryData(PROPOSAL_QUERY_KEY, proposal)}
      plan={plan} proposal={proposalQuery.data ?? null} />
    {plan.items.length === 0 ? <EmptyState action={<Button onClick={add}>{labels.add}</Button>} description={labels.emptyDescription} title={labels.emptyTitle} /> :
      <ol className={styles.list}>{plan.items.map((item, index) =>
        <li className={styles.listItem} data-deleted={Boolean(item.deleted_at)} data-season-item-id={item.id} key={item.id}
          onDragOver={(event) => { if (draggedId && !item.deleted_at) event.preventDefault(); }}
          onDrop={(event) => { event.preventDefault(); if (draggedId) void reorder(draggedId, item.id); setDraggedId(null); }}>
          <SeasonPlanCard busy={busyItem === item.id}
            consequences={item.episode_id && renderEpisodeConsequences ? renderEpisodeConsequences(item.episode_id) : null}
            index={index} item={item} labels={labels}
            moveDown={() => moveBy(item.id, 1)} moveUp={() => moveBy(item.id, -1)}
            onDelete={() => item.status === "produced" ? setConfirmDelete(item) : void perform(item.id, () => api.deleteItem(item.id, { expected_revision: plan.revision }), labels.removed)}
            onDragEnd={() => setDraggedId(null)} onDragStart={(event) => { setDraggedId(item.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); }}
            onDuplicate={() => void perform(item.id, () => api.duplicateItem(item.id, { expected_revision: plan.revision }), labels.duplicate)}
            onMaterialize={() => void perform(item.id, () => api.materializeItem(item.id, { expected_revision: plan.revision }), labels.materialize)}
            onValidate={() => void perform(item.id, () => api.validateItem(item.id, { expected_revision: plan.revision }), labels.validate)}
            onRestore={() => void perform(item.id, () => api.restoreItem(item.id, { expected_revision: plan.revision }), labels.restore)}
            onSave={(fields) => void perform(item.id, () => api.updateItem(item.id, { expected_revision: plan.revision, item: fields }), labels.save)}
            registerHandle={(node) => { if (node) handles.current.set(item.id, node); else handles.current.delete(item.id); }} total={plan.items.length} />
        </li>)}</ol>}
    <ConfirmAction cancelLabel={labels.cancel} confirmDisabled={busyItem === confirmDelete?.id} confirmLabel={labels.confirmRemove}
      description={labels.producedDeleteDescription} onConfirm={() => { if (!confirmDelete) return; const item = confirmDelete; void perform(item.id, () => api.deleteItem(item.id, { expected_revision: plan.revision, decision: "detach_keep_episode" }), labels.removed).then(() => setConfirmDelete(null)); }}
      onOpenChange={(open) => { if (!open) setConfirmDelete(null); }} open={confirmDelete !== null} title={labels.producedDeleteTitle} />
  </div>;
}

type Labels = ReturnType<typeof getSeasonPlanMessages>;
interface CardProps {
  readonly busy: boolean; readonly consequences?: ReactNode; readonly index: number; readonly item: SeasonPlanItem; readonly labels: Labels;
  readonly moveDown: () => void; readonly moveUp: () => void; readonly onDelete: () => void; readonly onDragEnd: () => void;
  readonly onDragStart: (event: DragEvent<HTMLButtonElement>) => void; readonly onDuplicate: () => void;
  readonly onMaterialize: () => void; readonly onRestore: () => void; readonly onSave: (fields: SeasonPlanItemFields) => void;
  readonly onValidate: () => void;
  readonly registerHandle: (node: HTMLButtonElement | null) => void; readonly total: number;
}

function SeasonPlanCard({ busy, consequences, index, item, labels, moveDown, moveUp, onDelete, onDragEnd, onDragStart, onDuplicate, onMaterialize, onRestore, onSave, onValidate, registerHandle, total }: CardProps) {
  const [draft, setDraft] = useState(() => editableFields(item));
  useEffect(() => setDraft(editableFields(item)), [item]);
  const deleted = Boolean(item.deleted_at);
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp") { event.preventDefault(); moveUp(); }
    if (event.key === "ArrowDown") { event.preventDefault(); moveDown(); }
  };
  return <Card className={styles.card} elevated padding="medium">
    <header className={styles.cardHeader}><div className={styles.identity}>
      <button aria-label={`${labels.drag}: ${item.title || `${labels.episode} ${index + 1}`}`} className={styles.dragHandle} disabled={deleted || busy}
        draggable={!deleted && !busy} onDragEnd={onDragEnd} onDragStart={onDragStart} onKeyDown={handleKey} ref={registerHandle} type="button">⋮⋮</button>
      <strong>{labels.episode} {index + 1}</strong><Badge tone={STATUS_TONE[item.status]}>{labels.status[item.status]}</Badge>{deleted ? <Badge tone="warning">{labels.removed}</Badge> : null}
    </div><div className={styles.moveActions}>
      <Button aria-label={`${labels.moveUp}: ${item.title}`} disabled={deleted || busy || index === 0} onClick={moveUp} size="small" variant="ghost">↑</Button>
      <Button aria-label={`${labels.moveDown}: ${item.title}`} disabled={deleted || busy || index === total - 1} onClick={moveDown} size="small" variant="ghost">↓</Button>
    </div></header>
    <form className={styles.form} onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <label>{labels.titleField}<input disabled={deleted} onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })} required value={draft.title} /></label>
      <label>{labels.logline}<textarea disabled={deleted} onChange={(event) => setDraft({ ...draft, logline: event.currentTarget.value })} value={draft.logline} /></label>
      <label>{labels.synopsis}<textarea disabled={deleted} onChange={(event) => setDraft({ ...draft, synopsis: event.currentTarget.value })} value={draft.synopsis} /></label>
      <label>{labels.cliffhanger}<textarea disabled={deleted} onChange={(event) => setDraft({ ...draft, cliffhanger: event.currentTarget.value })} value={draft.cliffhanger} /></label>
      <details className={styles.advanced}><summary>{labels.advanced}</summary>
        <dl><div><dt>{labels.stableId}</dt><dd><code>{item.id}</code></dd></div><div><dt>{labels.productionCode}</dt><dd><code>{item.episode_id ?? labels.noProductionCode}</code></dd></div></dl>
        <label>{labels.characters}<textarea disabled={deleted} onChange={(event) => setDraft({ ...draft, character_ids: lines(event.currentTarget.value) })} value={draft.character_ids.join("\n")} /></label>
        <label>{labels.locations}<textarea disabled={deleted} onChange={(event) => setDraft({ ...draft, location_ids: lines(event.currentTarget.value) })} value={draft.location_ids.join("\n")} /></label>
      </details>
      <div className={styles.actions}>{deleted ? <Button disabled={busy} onClick={onRestore}>{labels.restore}</Button> : <>
        <Button loading={busy} loadingLabel={labels.saving} type="submit">{labels.save}</Button>{item.status === "draft" ? <Button disabled={busy} onClick={onValidate} variant="secondary">{labels.validate}</Button> : null}<Button disabled={busy} onClick={onDuplicate} variant="secondary">{labels.duplicate}</Button>
        <Button disabled={busy || item.episode_id !== null || item.status !== "validated"} onClick={onMaterialize} variant="secondary">{labels.materialize}</Button><Button disabled={busy} onClick={onDelete} variant="danger">{labels.remove}</Button>
      </>}</div>
    </form>
    {consequences}
  </Card>;
}
