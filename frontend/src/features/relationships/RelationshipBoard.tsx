import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Button, EmptyState, ErrorState, Skeleton, Tabs } from "@shared";

import {
  createSummaryCandidate,
  getRelationshipBoard,
  saveRelationship,
  saveSecret,
} from "./api";
import { getRelationshipMessages } from "./messages";
import {
  emptyRelationship,
  emptySecret,
  RELATIONSHIP_AXES,
  type RelationshipAxis,
  type RelationshipBoardSnapshot,
  type RelationshipState,
  type SecretState,
  type StudioLocale,
  type SummaryCandidate,
} from "./model";
import styles from "./RelationshipBoard.module.css";

const QUERY_KEY = ["relationship-board"] as const;

export interface RelationshipBoardProps {
  readonly locale: StudioLocale;
  readonly advancedView?: ReactNode;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function RelationshipBoard({
  locale,
  advancedView,
}: RelationshipBoardProps) {
  const labels = getRelationshipMessages(locale);
  const queryClient = useQueryClient();
  const boardQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getRelationshipBoard,
  });
  const [tab, setTab] = useState("relationships");
  const [relationshipDraft, setRelationshipDraft] =
    useState<RelationshipState | null>(null);
  const [secretDraft, setSecretDraft] = useState<SecretState | null>(null);
  const [candidate, setCandidate] = useState<SummaryCandidate | null>(null);
  const [impact, setImpact] = useState<
    RelationshipBoardSnapshot["impact"] | null
  >(null);
  const [error, setError] = useState("");

  const board = boardQuery.data;
  useEffect(() => {
    if (!board || relationshipDraft) return;
    const first = board.relationships[0];
    if (first) setRelationshipDraft(first);
    else if (board.characters.length >= 2) {
      setRelationshipDraft(
        emptyRelationship(board.characters[0].id, board.characters[1].id),
      );
    }
  }, [board, relationshipDraft]);

  useEffect(() => {
    if (!board || secretDraft) return;
    if (board.secrets[0]) setSecretDraft(board.secrets[0]);
  }, [board, secretDraft]);

  const commitSnapshot = (snapshot: RelationshipBoardSnapshot) => {
    queryClient.setQueryData(QUERY_KEY, snapshot);
    setImpact(snapshot.impact);
    setError("");
  };
  const relationshipMutation = useMutation({
    mutationFn: ({
      revision,
      relationship,
    }: {
      revision: number;
      relationship: RelationshipState;
    }) =>
      saveRelationship(revision, relationship, relationship.provenance.note),
    onSuccess: (snapshot) => {
      commitSnapshot(snapshot);
      const saved = snapshot.relationships.find(
        (item) => item.id === relationshipDraft?.id,
      );
      if (saved) setRelationshipDraft(saved);
    },
    onError: (reason) =>
      setError(errorMessage(reason, labels.unavailableDescription)),
  });
  const secretMutation = useMutation({
    mutationFn: ({
      revision,
      secret,
    }: {
      revision: number;
      secret: SecretState;
    }) => saveSecret(revision, secret, secret.provenance.note),
    onSuccess: (snapshot) => {
      commitSnapshot(snapshot);
      const saved = snapshot.secrets.find(
        (item) => item.id === secretDraft?.id,
      );
      if (saved) setSecretDraft(saved);
    },
    onError: (reason) =>
      setError(errorMessage(reason, labels.unavailableDescription)),
  });
  const summaryMutation = useMutation({
    mutationFn: ({
      revision,
      relationshipIds,
      secretIds,
    }: {
      revision: number;
      relationshipIds: readonly string[];
      secretIds: readonly string[];
    }) => createSummaryCandidate(revision, relationshipIds, secretIds, locale),
    onSuccess: (nextCandidate) => {
      setCandidate(nextCandidate);
      setError("");
    },
    onError: (reason) =>
      setError(errorMessage(reason, labels.unavailableDescription)),
  });

  const charactersById = useMemo(
    () => new Map(board?.characters.map((item) => [item.id, item.name]) ?? []),
    [board?.characters],
  );

  if (boardQuery.isPending) {
    return <Skeleton aria-label={labels.loading} height="28rem" width="100%" />;
  }
  if (boardQuery.error || !board) {
    return (
      <ErrorState
        action={
          <Button onClick={() => boardQuery.refetch()}>{labels.reload}</Button>
        }
        description={labels.unavailableDescription}
        title={labels.unavailable}
      />
    );
  }
  if (board.characters.length < 2) {
    return <EmptyState description={labels.empty} title={labels.title} />;
  }

  const selectPair = (source: string, target: string) => {
    const existing = board.relationships.find(
      (item) => item.source === source && item.target === target,
    );
    setRelationshipDraft(existing ?? emptyRelationship(source, target));
    setCandidate(null);
  };

  const relationshipPanel = (
    <div className={styles.relationshipLayout}>
      <section aria-label={labels.relations} className={styles.matrixPanel}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th scope="col">↘</th>
              {board.characters.map((character) => (
                <th key={character.id} scope="col">
                  {character.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {board.characters.map((source) => (
              <tr key={source.id}>
                <th scope="row">{source.name}</th>
                {board.characters.map((target) => {
                  if (source.id === target.id)
                    return <td key={target.id}>—</td>;
                  const relation = board.relationships.find(
                    (item) =>
                      item.source === source.id && item.target === target.id,
                  );
                  const selected =
                    relationshipDraft?.source === source.id &&
                    relationshipDraft.target === target.id;
                  return (
                    <td key={target.id}>
                      <button
                        aria-label={`${labels.choosePair}: ${source.name} → ${target.name}`}
                        aria-pressed={selected}
                        className={styles.matrixButton}
                        data-filled={Boolean(relation)}
                        onClick={() => selectPair(source.id, target.id)}
                        type="button"
                      >
                        <strong>{relation?.jealousy ?? 0}</strong>
                        <small>{labels.axes.jealousy}</small>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {relationshipDraft ? (
        <RelationshipEditor
          busy={relationshipMutation.isPending}
          draft={relationshipDraft}
          labels={labels}
          names={charactersById}
          onChange={setRelationshipDraft}
          onGenerate={() =>
            summaryMutation.mutate({
              revision: board.bible_revision,
              relationshipIds: [relationshipDraft.id],
              secretIds: [],
            })
          }
          onSave={() =>
            relationshipMutation.mutate({
              revision: board.bible_revision,
              relationship: relationshipDraft,
            })
          }
          summaryBusy={summaryMutation.isPending}
        />
      ) : null}
    </div>
  );

  const secretPanel = (
    <div className={styles.secretLayout}>
      <aside className={styles.secretList}>
        <Button
          onClick={() => setSecretDraft(emptySecret(board.characters[0].id))}
          size="small"
          variant="secondary"
        >
          {labels.newSecret}
        </Button>
        {board.secrets.map((secret) => (
          <button
            aria-pressed={secretDraft?.id === secret.id}
            className={styles.secretButton}
            key={secret.id}
            onClick={() => setSecretDraft(secret)}
            type="button"
          >
            <strong>{secret.summary}</strong>
            <small>{Math.round(secret.severity * 100)}%</small>
          </button>
        ))}
      </aside>
      {secretDraft ? (
        <SecretEditor
          busy={secretMutation.isPending}
          characters={board.characters}
          draft={secretDraft}
          labels={labels}
          onChange={setSecretDraft}
          onGenerate={() =>
            summaryMutation.mutate({
              revision: board.bible_revision,
              relationshipIds: [],
              secretIds: [secretDraft.id],
            })
          }
          onSave={() =>
            secretMutation.mutate({
              revision: board.bible_revision,
              secret: secretDraft,
            })
          }
          summaryBusy={summaryMutation.isPending}
        />
      ) : null}
    </div>
  );

  const historyPanel = (
    <section className={styles.history}>
      <h2>{labels.changes}</h2>
      {board.history.length ? (
        <ol>
          {[...board.history].reverse().map((change) => (
            <li
              key={`${change.revision}-${change.entity_type}-${change.entity_id}`}
            >
              <strong>
                r{change.revision} · {change.entity_id}
              </strong>
              <span>{labels.operation[change.operation]}</span>
              <time dateTime={change.changed_at}>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(change.changed_at))}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p>{labels.noHistory}</p>
      )}
    </section>
  );

  const items = [
    { id: "relationships", label: labels.relations, panel: relationshipPanel },
    { id: "secrets", label: labels.secrets, panel: secretPanel },
    { id: "history", label: labels.history, panel: historyPanel },
    ...(advancedView
      ? [
          {
            id: "advanced",
            label: labels.advanced,
            panel: tab === "advanced" ? advancedView : null,
          },
        ]
      : []),
  ];

  return (
    <main className={styles.root} data-relationship-board>
      <header className={styles.header}>
        <div>
          <small>{labels.eyebrow}</small>
          <h1>{labels.title}</h1>
          <p>{labels.description}</p>
        </div>
        <div className={styles.revision}>
          <span>{labels.revision}</span>
          <strong>{board.bible_revision}</strong>
        </div>
      </header>
      {error ? (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <Button
            onClick={() => boardQuery.refetch()}
            size="small"
            variant="secondary"
          >
            {labels.reload}
          </Button>
        </div>
      ) : null}
      {impact ? <ImpactNotice impact={impact} labels={labels} /> : null}
      {candidate ? (
        <aside className={styles.candidate}>
          <strong>{labels.candidate}</strong>
          <p>{labels.candidateDescription}</p>
          <pre>{candidate.summary}</pre>
          <small>
            {labels.provenance}: {candidate.provenance.method}
          </small>
        </aside>
      ) : null}
      <Tabs
        ariaLabel={labels.tabs}
        items={items}
        onValueChange={setTab}
        value={tab}
      />
    </main>
  );
}

type Labels = ReturnType<typeof getRelationshipMessages>;

function RelationshipEditor({
  busy,
  draft,
  labels,
  names,
  onChange,
  onGenerate,
  onSave,
  summaryBusy,
}: {
  readonly busy: boolean;
  readonly draft: RelationshipState;
  readonly labels: Labels;
  readonly names: ReadonlyMap<string, string>;
  readonly onChange: (value: RelationshipState) => void;
  readonly onGenerate: () => void;
  readonly onSave: () => void;
  readonly summaryBusy: boolean;
}) {
  return (
    <form
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <header>
        <div>
          <small>{labels.source}</small>
          <strong>{names.get(draft.source)}</strong>
        </div>
        <span aria-hidden="true">→</span>
        <div>
          <small>{labels.target}</small>
          <strong>{names.get(draft.target)}</strong>
        </div>
      </header>
      <label>
        {labels.label}
        <input
          required
          value={draft.label}
          onChange={(event) =>
            onChange({ ...draft, label: event.currentTarget.value })
          }
        />
      </label>
      <label>
        {labels.summary}
        <textarea
          required
          value={draft.summary}
          onChange={(event) =>
            onChange({ ...draft, summary: event.currentTarget.value })
          }
        />
      </label>
      <div className={styles.axes}>
        {RELATIONSHIP_AXES.map((axis) => (
          <AxisControl
            axis={axis}
            key={axis}
            labels={labels}
            onChange={(value) => onChange({ ...draft, [axis]: value })}
            value={draft[axis]}
          />
        ))}
      </div>
      <label>
        {labels.provenance}
        <input
          maxLength={500}
          value={draft.provenance.note}
          onChange={(event) =>
            onChange({
              ...draft,
              provenance: { source: "manual", note: event.currentTarget.value },
            })
          }
        />
      </label>
      <div className={styles.actions}>
        <Button loading={busy} loadingLabel={labels.saving} type="submit">
          {labels.save}
        </Button>
        <Button
          loading={summaryBusy}
          loadingLabel={labels.generating}
          onClick={onGenerate}
          variant="secondary"
        >
          {labels.generateSummary}
        </Button>
      </div>
    </form>
  );
}

function AxisControl({
  axis,
  labels,
  onChange,
  value,
}: {
  readonly axis: RelationshipAxis;
  readonly labels: Labels;
  readonly onChange: (value: number) => void;
  readonly value: number;
}) {
  const minimum = axis === "jealousy" || axis === "toxicity" ? 0 : -100;
  return (
    <fieldset className={styles.axis}>
      <legend>{labels.axes[axis]}</legend>
      <input
        aria-label={`${labels.axes[axis]} slider`}
        max={100}
        min={minimum}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        type="range"
        value={value}
      />
      <input
        aria-label={`${labels.axes[axis]} value`}
        max={100}
        min={minimum}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        type="number"
        value={value}
      />
    </fieldset>
  );
}

function SecretEditor({
  busy,
  characters,
  draft,
  labels,
  onChange,
  onGenerate,
  onSave,
  summaryBusy,
}: {
  readonly busy: boolean;
  readonly characters: readonly {
    readonly id: string;
    readonly name: string;
  }[];
  readonly draft: SecretState;
  readonly labels: Labels;
  readonly onChange: (value: SecretState) => void;
  readonly onGenerate: () => void;
  readonly onSave: () => void;
  readonly summaryBusy: boolean;
}) {
  const toggle = (field: "owners" | "known_by" | "hidden_from", id: string) => {
    const values = draft[field].includes(id)
      ? draft[field].filter((item) => item !== id)
      : [...draft[field], id];
    const next = { ...draft, [field]: values };
    if (field === "known_by" && values.includes(id))
      next.hidden_from = next.hidden_from.filter((item) => item !== id);
    if (field === "hidden_from" && values.includes(id))
      next.known_by = next.known_by.filter((item) => item !== id);
    onChange(next);
  };
  return (
    <form
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <label>
        {labels.secretSummary}
        <textarea
          minLength={10}
          required
          value={draft.summary}
          onChange={(event) =>
            onChange({ ...draft, summary: event.currentTarget.value })
          }
        />
      </label>
      {(["owners", "known_by", "hidden_from"] as const).map((field) => (
        <fieldset className={styles.people} key={field}>
          <legend>
            {
              {
                owners: labels.owners,
                known_by: labels.knownBy,
                hidden_from: labels.hiddenFrom,
              }[field]
            }
          </legend>
          {characters.map((character) => (
            <label key={character.id}>
              <input
                checked={draft[field].includes(character.id)}
                onChange={() => toggle(field, character.id)}
                type="checkbox"
              />
              {character.name}
            </label>
          ))}
        </fieldset>
      ))}
      <div className={styles.twoColumns}>
        <label>
          {labels.severity}
          <input
            max={1}
            min={0}
            onChange={(event) =>
              onChange({
                ...draft,
                severity: event.currentTarget.valueAsNumber,
              })
            }
            step={0.05}
            type="number"
            value={draft.severity}
          />
        </label>
        <label>
          {labels.createdEpisode}
          <input
            min={1}
            onChange={(event) =>
              onChange({
                ...draft,
                created_episode: event.currentTarget.valueAsNumber,
              })
            }
            type="number"
            value={draft.created_episode}
          />
        </label>
      </div>
      <label className={styles.checkbox}>
        <input
          checked={draft.revealed}
          onChange={(event) =>
            onChange({ ...draft, revealed: event.currentTarget.checked })
          }
          type="checkbox"
        />
        {labels.revealed}
      </label>
      <label>
        {labels.provenance}
        <input
          maxLength={500}
          value={draft.provenance.note}
          onChange={(event) =>
            onChange({
              ...draft,
              provenance: { source: "manual", note: event.currentTarget.value },
            })
          }
        />
      </label>
      <div className={styles.actions}>
        <Button loading={busy} loadingLabel={labels.saving} type="submit">
          {labels.save}
        </Button>
        <Button
          loading={summaryBusy}
          loadingLabel={labels.generating}
          onClick={onGenerate}
          variant="secondary"
        >
          {labels.generateSummary}
        </Button>
      </div>
    </form>
  );
}

function ImpactNotice({
  impact,
  labels,
}: {
  readonly impact: RelationshipBoardSnapshot["impact"];
  readonly labels: Labels;
}) {
  const affected = [...impact.affected_episodes, ...impact.affected_shots];
  return (
    <aside className={styles.impact}>
      <strong>{labels.affected}</strong>
      <span>{affected.length ? affected.join(", ") : labels.noImpact}</span>
    </aside>
  );
}
