import type { FormEvent, ReactNode } from "react";

import type { GuidedProjectBrief, JourneyStageSnapshot } from "@/generated/openapi";
import { Button } from "@shared";

import { useJourneyContext } from "./JourneyContext";
import type { GuidedPayload } from "./model";
import styles from "./guidedJourney.module.css";

export interface StageHostProps {
  readonly stage: JourneyStageSnapshot;
  readonly guided: GuidedPayload;
  readonly busy: boolean;
  readonly locale: "fr" | "en";
  readonly onAddCharacter: () => void;
  readonly onCreateEpisode: () => void;
  readonly onPropose: (target: string) => void;
  readonly onSaveBrief: (brief: GuidedProjectBrief) => void;
  readonly slots?: Partial<Record<JourneyStageSnapshot["id"], ReactNode>>;
}

const TITLES = {
  fr: {
    idea: "Commence par l’envie",
    casting: "Qui porte l’histoire ?",
    relationships: "Fais évoluer les relations",
    season: "Construis la saison",
    episode: "Écris et valide l’épisode",
    storyboard: "Transforme le texte en actions",
    production: "Produis sans perdre le fil",
    release: "Regarde, compare, recommence",
  },
  en: {
    idea: "Start with the idea",
    casting: "Who carries the story?",
    relationships: "Evolve relationships",
    season: "Build the season",
    episode: "Write and approve the episode",
    storyboard: "Turn text into action",
    production: "Produce without losing the thread",
    release: "Watch, compare, iterate",
  },
} as const;

export function StageHost({ stage, guided, busy, locale, onAddCharacter, onCreateEpisode, onPropose, onSaveBrief, slots }: StageHostProps) {
  const journey = useJourneyContext();
  const submitBrief = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const locked_fields = [...data.getAll("locked_fields")].map(String);
    onSaveBrief({
      ...Object.fromEntries(
        [...data.entries()].filter(([key]) => key !== "locked_fields"),
      ),
      locked_fields,
    } as GuidedProjectBrief);
  };
  let content: ReactNode = slots?.[stage.id];
  if (!content && stage.id === "idea") {
    const field = (name: keyof GuidedProjectBrief, label: string, area = false) => (
      <label>{label}{area ? <textarea defaultValue={String(guided.brief[name] ?? "")} name={name} /> : <input defaultValue={String(guided.brief[name] ?? "")} name={name} />}<span><input defaultChecked={guided.brief.locked_fields?.includes(name)} name="locked_fields" type="checkbox" value={name} /> Verrouiller</span></label>
    );
    content = <form className={styles.form} onSubmit={submitBrief}>{field("working_title", "Titre de travail")}{field("genre", "Genre")}{field("idea", "Idée", true)}{field("tone", "Ton")}{field("audience", "Public")}{field("episode_title", "Titre de l’épisode")}{field("episode_concept", "Promesse de l’épisode", true)}<div className={styles.actions}><Button disabled={busy} type="submit">Enregistrer le brouillon</Button><Button disabled={busy} onClick={() => onPropose("brief")} type="button" variant="secondary">Améliorer avec l’IA</Button></div></form>;
  }
  if (!content && stage.id === "episode") {
    content = guided.activeEpisodeId ? (
      <div className={styles.statusCard}>
        <strong>{guided.activeEpisodeId}</strong>
        <p>Épisode lié au parcours.</p>
        <Button onClick={() => journey.navigate("produce")}>Écrire et valider</Button>
      </div>
    ) : (
      <div className={styles.statusCard}>
        <p>Crée un épisode depuis le titre et la promesse du brief.</p>
        <Button disabled={busy} onClick={onCreateEpisode}>
          Créer et lier l’épisode
        </Button>
      </div>
    );
  }
  if (!content && stage.id === "casting") {
    content = <div><div className={styles.cards}>{guided.characters.map((character) => <article key={character.id}><strong>{character.name || "Nouveau personnage"}</strong><p>{character.role || "Rôle à préciser"}</p><small>{character.promoted_revision ? "Dans la Bible" : "Brouillon"}</small><Button onClick={() => onPropose(`character:${character.id}`)} variant="ghost">Améliorer</Button></article>)}</div><Button disabled={busy} onClick={onAddCharacter}>Ajouter un personnage</Button></div>;
  }
  if (!content) {
    content = <div className={styles.statusCard}><p>{stage.blockers?.[0]?.message ?? `État : ${stage.status}`}</p><Button onClick={() => stage.primary_action.target.includes("results") ? journey.navigate("results") : stage.primary_action.target.includes("settings") ? journey.navigate("settings") : stage.primary_action.target.includes("bible") ? journey.navigate("bible") : journey.navigate("produce")}>{stage.primary_action.label}</Button></div>;
  }
  return <section aria-labelledby={`journey-${stage.id}`} className={styles.stage}><header><div><small>ÉTAPE · {stage.status}</small><h1 id={`journey-${stage.id}`}>{TITLES[locale][stage.id]}</h1></div><span data-status={stage.status}>{stage.status}</span></header>{content}</section>;
}
