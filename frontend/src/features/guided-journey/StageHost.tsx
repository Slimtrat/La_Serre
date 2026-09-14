import type { FormEvent, ReactNode } from "react";

import type { GuidedCharacterDraft, GuidedProjectBrief, JourneyStageSnapshot } from "@/generated/openapi";
import { Button } from "@shared";

import { CastingBoard } from "@features/casting";

import { useJourneyContext } from "./JourneyContext";
import type { GuidedPayload } from "./model";
import styles from "./guidedJourney.module.css";

export interface StageHostProps {
  readonly stage: JourneyStageSnapshot;
  readonly guided: GuidedPayload;
  readonly busy: boolean;
  readonly locale: "fr" | "en";
  readonly projectId: string;
  readonly onAddCharacter: () => void;
  readonly onCreateEpisode: () => void;
  readonly onPromoteCharacter: (characterId: string) => void;
  readonly onPropose: (target: string) => void;
  readonly onSaveBrief: (brief: GuidedProjectBrief) => void;
  readonly onSaveCharacter: (character: GuidedCharacterDraft) => void;
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

const CASTING_TEXT = {
  fr: {
    add: "Ajouter un personnage", draft: "brouillon", canonical: "dans la Bible",
    newCharacter: "Nouveau personnage", name: "Nom", role: "Rôle", appearance: "Apparence",
    wardrobe: "Tenue", signature: "Détails signature, séparés par des virgules",
    palette: "Palette, 3 couleurs minimum", personality: "Personnalité",
    wants: "Désirs, séparés par des virgules", fears: "Peurs, séparées par des virgules",
    voice: "Voix", negative: "Éléments à éviter", missing: "À compléter",
    save: "Enregistrer la fiche", promote: "Valider dans la Bible", ai: "Compléter avec l’IA",
  },
  en: {
    add: "Add a character", draft: "draft", canonical: "in the Bible",
    newCharacter: "New character", name: "Name", role: "Role", appearance: "Appearance",
    wardrobe: "Wardrobe", signature: "Signature details, comma-separated",
    palette: "Palette, at least 3 colors", personality: "Personality",
    wants: "Wants, comma-separated", fears: "Fears, comma-separated",
    voice: "Voice", negative: "Elements to avoid", missing: "Still needed",
    save: "Save character sheet", promote: "Validate in the Bible", ai: "Complete with AI",
  },
} as const;

export function StageHost({ stage, guided, busy, locale, projectId, onAddCharacter, onCreateEpisode, onPromoteCharacter, onPropose, onSaveBrief, onSaveCharacter, slots }: StageHostProps) {
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
    const labels = CASTING_TEXT[locale];
    const list = (value: FormDataEntryValue | null) => String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    const saveCharacter = (event: FormEvent<HTMLFormElement>, character: GuidedCharacterDraft) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      onSaveCharacter({
        ...character,
        name: String(data.get("name")),
        role: String(data.get("role")),
        visual_description: String(data.get("visual_description")),
        wardrobe: String(data.get("wardrobe")),
        signature_details: list(data.get("signature_details")),
        palette: list(data.get("palette")),
        personality: String(data.get("personality")),
        wants: list(data.get("wants")),
        fears: list(data.get("fears")),
        voice_description: String(data.get("voice_description")),
        generation_negative_prompt: String(data.get("generation_negative_prompt")),
      });
    };
    content = <div>
      <div className={styles.actions}><Button disabled={busy} onClick={onAddCharacter}>{labels.add}</Button></div>
      {guided.characters.map((character) => {
        const completion = guided.characterCompletion[character.id];
        return <details className={styles.statusCard} key={character.id} open={!completion?.promoted}>
          <summary>{character.name || labels.newCharacter} · {completion?.promoted ? labels.canonical : labels.draft}</summary>
          <form className={styles.form} onSubmit={(event) => saveCharacter(event, character)}>
            <label>{labels.name}<input defaultValue={character.name} name="name" required /></label>
            <label>{labels.role}<input defaultValue={character.role} name="role" required /></label>
            <label>{labels.appearance}<textarea defaultValue={character.visual_description} minLength={20} name="visual_description" required /></label>
            <label>{labels.wardrobe}<textarea defaultValue={character.wardrobe} minLength={20} name="wardrobe" required /></label>
            <label>{labels.signature}<input defaultValue={(character.signature_details ?? []).join(", ")} name="signature_details" required /></label>
            <label>{labels.palette}<input defaultValue={(character.palette ?? []).join(", ")} name="palette" required /></label>
            <label>{labels.personality}<textarea defaultValue={character.personality} minLength={10} name="personality" required /></label>
            <label>{labels.wants}<input defaultValue={(character.wants ?? []).join(", ")} name="wants" required /></label>
            <label>{labels.fears}<input defaultValue={(character.fears ?? []).join(", ")} name="fears" required /></label>
            <label>{labels.voice}<textarea defaultValue={character.voice_description} minLength={10} name="voice_description" required /></label>
            <label>{labels.negative}<input defaultValue={character.generation_negative_prompt} name="generation_negative_prompt" /></label>
            {completion?.missing.length ? <p role="status">{labels.missing} : {completion.missing.join(", ")}</p> : null}
            <div className={styles.actions}>
              <Button disabled={busy} type="submit">{labels.save}</Button>
              <Button disabled={busy || !completion?.ready || completion.promoted} onClick={() => onPromoteCharacter(character.id)} type="button">{labels.promote}</Button>
              <Button disabled={busy} onClick={() => onPropose(`character:${character.id}`)} type="button" variant="secondary">{labels.ai}</Button>
            </div>
          </form>
        </details>;
      })}
      <CastingBoard characters={guided.canonicalCharacters} generationLicenses={guided.generationLicenses} locale={locale} projectId={projectId} />
    </div>;
  }
  if (!content) {
    content = <div className={styles.statusCard}><p>{stage.blockers?.[0]?.message ?? `État : ${stage.status}`}</p><Button onClick={() => stage.primary_action.target.includes("results") ? journey.navigate("results") : stage.primary_action.target.includes("settings") ? journey.navigate("settings") : stage.primary_action.target.includes("bible") ? journey.navigate("bible") : journey.navigate("produce")}>{stage.primary_action.label}</Button></div>;
  }
  return <section aria-labelledby={`journey-${stage.id}`} className={styles.stage}><header><div><small>ÉTAPE · {stage.status}</small><h1 id={`journey-${stage.id}`}>{TITLES[locale][stage.id]}</h1></div><span data-status={stage.status}>{stage.status}</span></header>{content}</section>;
}
