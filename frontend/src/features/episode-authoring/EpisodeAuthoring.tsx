import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button, ErrorState, Skeleton } from "@shared";

import { episodeAuthoringApi } from "./api";
import { editableBreakdown, type CandidateProvenance, type EpisodeBreakdownCandidate, type EpisodeDraftCandidate, type EpisodeSnapshot, type ReviewReport, type ShotBlueprint } from "./model";
import styles from "./EpisodeAuthoring.module.css";

type Tab = "summary" | "script" | "storyboard" | "coherence";
type Locale = "fr" | "en";

const TAB_LABELS: Record<Locale, Record<Tab, string>> = {
  fr: { summary: "Résumé", script: "Scénario", storyboard: "Storyboard", coherence: "Cohérence" },
  en: { summary: "Summary", script: "Script", storyboard: "Storyboard", coherence: "Coherence" },
};
const STORY_FIELDS = ["hook", "setup", "conflict", "reveal", "cliffhanger"] as const;
const STORY_LABELS: Record<Locale, Record<(typeof STORY_FIELDS)[number], string>> = {
  fr: { hook: "Accroche", setup: "Situation", conflict: "Conflit", reveal: "Bascule", cliffhanger: "Sortie / cliffhanger" },
  en: { hook: "Hook", setup: "Setup", conflict: "Conflict", reveal: "Reveal", cliffhanger: "Ending / cliffhanger" },
};

function scriptFrom(snapshot: EpisodeSnapshot): EpisodeDraftCandidate {
  const episode = snapshot.episode;
  return {
    title: episode.title,
    logline: episode.logline,
    narrative_source: episode.narrative_source,
    story: episode.story,
    character_ids: [...episode.characters],
    location_ids: [...episode.locations],
  };
}

function newShot(snapshot: EpisodeSnapshot): ShotBlueprint {
  return {
    source_text: "Décrire la nouvelle action et son rôle dans la scène.",
    duration: 5,
    location_id: snapshot.locations[0]?.id ?? "",
    character_ids: [],
    shot_type: "plan moyen",
    camera_movement: "caméra fixe",
    lens: "50mm",
    action: "Décrire l’action visible et le changement dramatique.",
    dialogue: null,
    lighting: "Lumière cohérente avec le lieu et le moment.",
    mood: "Cohérent avec le ton de l’épisode.",
    style: ["Direction visuelle de la Bible"],
  };
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

export interface EpisodeAuthoringProps {
  readonly episodeId: string;
  readonly projectId: string;
  readonly locale: Locale;
  readonly initialTab?: Tab;
  readonly onChanged?: () => Promise<unknown> | undefined;
}

export function EpisodeAuthoring({ episodeId, projectId, locale, initialTab = "summary", onChanged }: EpisodeAuthoringProps) {
  const query = useQuery({ queryKey: ["episode-authoring", projectId, episodeId], queryFn: () => episodeAuthoringApi.get(episodeId) });
  const [tab, setTab] = useState<Tab>(initialTab);
  const [draft, setDraft] = useState<EpisodeDraftCandidate | null>(null);
  const [shots, setShots] = useState<EpisodeBreakdownCandidate | null>(null);
  const [shotKeys, setShotKeys] = useState<string[]>([]);
  const [duration, setDuration] = useState(30);
  const [draftOrigin, setDraftOrigin] = useState<CandidateProvenance | undefined>();
  const [shotOrigin, setShotOrigin] = useState<CandidateProvenance | undefined>();
  const [review, setReview] = useState<ReviewReport | null>(null);
  const [scriptDirty, setScriptDirty] = useState(false);
  const [shotDirty, setShotDirty] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => setTab(initialTab), [initialTab]);
  useEffect(() => {
    if (!query.data) return;
    setDraft(scriptFrom(query.data));
    setShots(editableBreakdown(query.data));
    setShotKeys([...query.data.episode.shot_order]);
    setDuration(query.data.episode.duration_target);
    setDraftOrigin(undefined);
    setShotOrigin(undefined);
    setReview(null);
    setScriptDirty(false);
    setShotDirty(false);
  }, [query.data]);

  const run = async (label: string, action: () => Promise<unknown>, success: string, reload = true) => {
    if (busy) return;
    setBusy(label); setError(""); setMessage("");
    try {
      await action();
      if (reload) {
        await query.refetch();
        await onChanged?.();
      }
      setMessage(success);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy("");
    }
  };

  if (query.isPending) return <Skeleton aria-label="Chargement de l’épisode" height="24rem" width="100%" />;
  if (query.error || !query.data || !draft || !shots) return <ErrorState title="Épisode indisponible" description="Recharge le parcours pour retrouver cet épisode." action={<Button onClick={() => void query.refetch()}>Réessayer</Button>} />;

  const snapshot = query.data;
  const episode = snapshot.episode;
  const format = snapshot.format_output;
  const approved = ["approved", "breakdown", "production", "final"].includes(episode.status);
  const storyboardReady = approved && snapshot.locations.length > 0;
  const shotTotal = shots.shots.reduce((sum, shot) => sum + Number(shot.duration || 0), 0);
  const targetMatches = Math.abs(shotTotal - duration) <= 0.01;
  const countMatches = shots.shots.length >= format.shot_count_min && shots.shots.length <= format.shot_count_max;
  const targetRange = duration >= format.duration_seconds_min && duration <= format.duration_seconds_max;
  const budgetValid = targetMatches && countMatches && targetRange;
  const updateDraft = (patch: Partial<EpisodeDraftCandidate>) => { setDraft({ ...draft, ...patch }); setScriptDirty(true); setReview(null); };
  const updateShot = (index: number, patch: Partial<ShotBlueprint>) => {
    setShots({ shots: shots.shots.map((shot, position) => position === index ? { ...shot, ...patch } : shot) });
    setShotDirty(true);
  };
  const updateDialogue = (index: number, shot: ShotBlueprint, patch: Partial<NonNullable<ShotBlueprint["dialogue"]>>) => {
    if (shot.dialogue) updateShot(index, { dialogue: { ...shot.dialogue, ...patch } });
  };
  const moveShot = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= shots.shots.length) return;
    const reordered = [...shots.shots];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const reorderedKeys = [...shotKeys];
    [reorderedKeys[index], reorderedKeys[target]] = [reorderedKeys[target], reorderedKeys[index]];
    setShots({ shots: reordered }); setShotKeys(reorderedKeys); setShotDirty(true);
  };
  const saveScript = () => run("save-script", async () => {
    await episodeAuthoringApi.update(episodeId, { title: draft.title, logline: draft.logline, narrative_source: draft.narrative_source, story: draft.story, characters: draft.character_ids, locations: draft.location_ids, duration_target: duration });
  }, "Brouillon enregistré.");
  const submitScript = () => run("apply-script", async () => {
    if (duration !== episode.duration_target) await episodeAuthoringApi.update(episodeId, { duration_target: duration });
    await episodeAuthoringApi.applyDraft(episodeId, draft, draftOrigin);
  }, "Scénario soumis à la relecture.");
  const generateScript = () => run("generate-script", async () => {
    const proposal = await episodeAuthoringApi.generateDraft(episodeId, { source_text: draft.narrative_source, prompt });
    setDraft(proposal.candidate); setDraftOrigin(proposal.provenance); setScriptDirty(true); setReview(null);
  }, "Proposition reçue. Relis et modifie avant de l’appliquer.", false);
  const reviewScript = () => run("review", async () => { setReview(await episodeAuthoringApi.review(episodeId)); }, "Rapport de cohérence actualisé.", false);
  const approveScript = () => run("approve", async () => { await episodeAuthoringApi.approve(episodeId); }, "Scénario approuvé. Le storyboard est déverrouillé.");
  const generateShots = () => run("generate-shots", async () => {
    const proposal = await episodeAuthoringApi.generateBreakdown(episodeId, { prompt });
    setShots(proposal.candidate); setShotKeys(proposal.candidate.shots.map(() => crypto.randomUUID())); setShotOrigin(proposal.provenance); setShotDirty(true);
  }, "Storyboard proposé. Vérifie chaque carte et le budget avant application.", false);
  const applyShots = () => run("apply-shots", async () => {
    await episodeAuthoringApi.applyBreakdown(episodeId, shots, shotOrigin, snapshot.breakdown_fingerprint);
  }, "Storyboard appliqué et prêt pour la production.");

  return <div className={styles.root} data-episode-authoring>
    <header className={styles.header}><div><small>ATELIER ÉPISODE</small><h2>{episode.title}</h2><p>{episode.logline || "Écris une promesse narrative pour cet épisode."}</p></div><span>{episode.status}</span></header>
    <nav aria-label="Atelier d’épisode" className={styles.tabs}><div role="tablist">{(["summary", "script", "storyboard", "coherence"] as const).map((item) => <Button aria-selected={tab === item} key={item} onClick={() => setTab(item)} role="tab" type="button" variant={tab === item ? "primary" : "ghost"}>{TAB_LABELS[locale][item]}</Button>)}</div></nav>
    {error ? <div className={styles.status} data-tone="error" role="alert">{error}</div> : null}
    {message ? <div className={styles.status} data-tone="success" role="status">{message}</div> : null}
    {tab === "summary" ? <section aria-label={TAB_LABELS[locale].summary} className={styles.panel} role="tabpanel">
      <p>Durée cible : {duration} s · {snapshot.characters.length} personnage(s) disponibles · {snapshot.locations.length} lieu(x) disponibles.</p>
      <p>{episode.narrative_source || "Le récit n’est pas encore écrit."}</p>
      <div className={styles.actions}><Button onClick={() => setTab("script")}>Écrire le scénario</Button><Button disabled={!approved} onClick={() => setTab("storyboard")} variant="secondary">Ouvrir le storyboard</Button></div>
    </section> : null}
    {tab === "script" ? <section aria-label={TAB_LABELS[locale].script} className={styles.panel} role="tabpanel">
      <p>Modifie le texte et les rôles, puis soumets une proposition à la relecture. L’IA ne publie rien automatiquement.</p>
      <div className={styles.form}>
        <div className={styles.grid}><label>Titre<input maxLength={180} onChange={(event) => updateDraft({ title: event.target.value })} value={draft.title} /></label><label>Durée cible (secondes)<input max={format.duration_seconds_max} min={format.duration_seconds_min} onChange={(event) => { setDuration(Number(event.target.value)); setScriptDirty(true); setReview(null); }} step="0.01" type="number" value={duration} /></label></div>
        <label>Promesse / logline<input maxLength={1000} onChange={(event) => updateDraft({ logline: event.target.value })} value={draft.logline} /></label>
        <label>Scénario<textarea minLength={20} onChange={(event) => updateDraft({ narrative_source: event.target.value })} rows={8} value={draft.narrative_source} /></label>
        <div className={styles.grid}>{STORY_FIELDS.map((field) => <label key={field}>{STORY_LABELS[locale][field]}<textarea onChange={(event) => updateDraft({ story: { ...draft.story, [field]: event.target.value } })} value={draft.story[field]} /></label>)}</div>
        <fieldset><legend>Personnages de la Bible</legend><div className={styles.checks}>{snapshot.characters.map((person) => <label key={person.id}><input checked={draft.character_ids.includes(person.id)} onChange={(event) => updateDraft({ character_ids: event.target.checked ? [...draft.character_ids, person.id] : draft.character_ids.filter((id) => id !== person.id) })} type="checkbox" />{person.name}</label>)}</div></fieldset>
        <fieldset><legend>Lieux de la Bible</legend><div className={styles.checks}>{snapshot.locations.map((place) => <label key={place.id}><input checked={draft.location_ids.includes(place.id)} onChange={(event) => updateDraft({ location_ids: event.target.checked ? [...draft.location_ids, place.id] : draft.location_ids.filter((id) => id !== place.id) })} type="checkbox" />{place.name}</label>)}</div></fieldset>
        {draftOrigin ? <p className={styles.candidate}>Proposition IA non appliquée · modèle {draftOrigin.model}. Tes modifications resteront visibles avant validation.</p> : null}
        <label>Consigne facultative à l’IA<input onChange={(event) => setPrompt(event.target.value)} value={prompt} /></label>
        <div className={styles.actions}><Button disabled={Boolean(busy)} onClick={saveScript} type="button" variant="secondary">Enregistrer le brouillon</Button><Button disabled={Boolean(busy) || draft.narrative_source.trim().length < 20 || draft.logline.trim().length < 10 || !targetRange} onClick={submitScript} type="button">Soumettre à relecture</Button><Button disabled={Boolean(busy)} onClick={generateScript} type="button" variant="secondary">Proposer avec l’IA locale</Button></div>
        {scriptDirty ? <p role="status">Modifications non appliquées : relis le scénario avant approbation.</p> : null}
      </div>
    </section> : null}
    {tab === "storyboard" ? <section aria-label={TAB_LABELS[locale].storyboard} className={styles.panel} role="tabpanel">
      {!approved ? <div className={styles.empty}>Approuve d’abord le scénario dans l’onglet Cohérence.</div> : <>
        <div className={styles.budget} data-valid={budgetValid}><strong>{shots.shots.length} plans</strong><span>{shotTotal.toFixed(2)} / {duration.toFixed(2)} s</span><span>{budgetValid ? "Budget prêt" : `Il faut ${format.shot_count_min} à ${format.shot_count_max} plans, ${format.duration_seconds_min} à ${format.duration_seconds_max} s et une somme égale à la cible.`}</span></div>
        {!snapshot.locations.length ? <div className={styles.empty}>Ajoute au moins un lieu à la Bible avant de découper l’épisode.</div> : null}
        {shotOrigin ? <p className={styles.candidate}>Storyboard IA non appliqué · modèle {shotOrigin.model}. Chaque carte reste modifiable.</p> : null}
        <ol className={styles.shotList}>{shots.shots.map((shot, index) => <li className={styles.shotCard} key={shotKeys[index]}><header><strong>Plan {index + 1}</strong><div className={styles.actions}><Button disabled={index === 0 || Boolean(busy)} onClick={() => moveShot(index, -1)} size="small" type="button" variant="ghost">↑ Monter</Button><Button disabled={index === shots.shots.length - 1 || Boolean(busy)} onClick={() => moveShot(index, 1)} size="small" type="button" variant="ghost">↓ Descendre</Button><Button disabled={Boolean(busy)} onClick={() => { setShots({ shots: shots.shots.filter((_, position) => position !== index) }); setShotKeys(shotKeys.filter((_, position) => position !== index)); setShotDirty(true); }} size="small" type="button" variant="danger">Retirer</Button></div></header>
          <div className={styles.form}><label>Action narrative<textarea minLength={10} onChange={(event) => updateShot(index, { source_text: event.target.value })} value={shot.source_text} /></label><div className={styles.grid}><label>Durée (s)<input max={12} min={0.1} onChange={(event) => updateShot(index, { duration: Number(event.target.value) })} step="0.01" type="number" value={shot.duration} /></label><label>Lieu<select onChange={(event) => updateShot(index, { location_id: event.target.value })} value={shot.location_id}>{snapshot.locations.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label></div><label>Action visible<textarea onChange={(event) => updateShot(index, { action: event.target.value })} value={shot.action} /></label>
            <details><summary>Personnages, dialogue et direction visuelle</summary><div><fieldset><legend>Personnages à l’image (3 maximum)</legend><div className={styles.checks}>{snapshot.characters.map((person) => <label key={person.id}><input checked={shot.character_ids.includes(person.id)} disabled={!shot.character_ids.includes(person.id) && shot.character_ids.length >= 3} onChange={(event) => updateShot(index, { character_ids: event.target.checked ? [...shot.character_ids, person.id] : shot.character_ids.filter((id) => id !== person.id), dialogue: !event.target.checked && shot.dialogue?.speaker_id === person.id && shot.dialogue.mode === "on_screen" ? null : shot.dialogue })} type="checkbox" />{person.name}</label>)}</div></fieldset>
              <div className={styles.grid}><label>Type de plan<input onChange={(event) => updateShot(index, { shot_type: event.target.value })} value={shot.shot_type} /></label><label>Mouvement caméra<input onChange={(event) => updateShot(index, { camera_movement: event.target.value })} value={shot.camera_movement} /></label><label>Objectif<input onChange={(event) => updateShot(index, { lens: event.target.value })} value={shot.lens} /></label><label>Lumière<input onChange={(event) => updateShot(index, { lighting: event.target.value })} value={shot.lighting} /></label><label>Ambiance<input onChange={(event) => updateShot(index, { mood: event.target.value })} value={shot.mood} /></label><label>Style (séparé par virgules)<input onChange={(event) => updateShot(index, { style: event.target.value.split(",").map((part) => part.trim()).filter(Boolean) })} value={shot.style.join(", ")} /></label></div>
              <label>Dialogue<textarea onChange={(event) => updateShot(index, { dialogue: event.target.value ? { ...(shot.dialogue ?? { speaker_id: "", mode: "voice_over", intention: "", emotion: "" }), text: event.target.value } : null })} value={shot.dialogue?.text ?? ""} /></label>{shot.dialogue ? <div className={styles.grid}><label>Locuteur<select onChange={(event) => updateDialogue(index, shot, { speaker_id: event.target.value })} value={shot.dialogue.speaker_id}><option value="">Choisir…</option>{snapshot.characters.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>Présence de la voix<select onChange={(event) => updateDialogue(index, shot, { mode: event.target.value })} value={shot.dialogue.mode}><option value="on_screen">À l’image</option><option value="off_screen">Hors champ</option><option value="voice_over">Voix off</option></select></label><label>Intention<input onChange={(event) => updateDialogue(index, shot, { intention: event.target.value })} value={shot.dialogue.intention} /></label><label>Émotion<input onChange={(event) => updateDialogue(index, shot, { emotion: event.target.value })} value={shot.dialogue.emotion} /></label></div> : null}</div></details>
          </div>
        </li>)}</ol>
        <div className={styles.actions}><Button disabled={Boolean(busy) || shots.shots.length >= format.shot_count_max || !storyboardReady} onClick={() => { setShots({ shots: [...shots.shots, newShot(snapshot)] }); setShotKeys([...shotKeys, crypto.randomUUID()]); setShotDirty(true); }} type="button" variant="secondary">Ajouter un plan</Button><Button disabled={Boolean(busy) || !storyboardReady} onClick={generateShots} type="button" variant="secondary">Proposer le storyboard avec l’IA locale</Button><Button disabled={Boolean(busy) || !budgetValid || !storyboardReady} onClick={applyShots} type="button">Appliquer le storyboard</Button></div>
        {shotDirty ? <p role="status">Cartes modifiées : applique-les pour enregistrer la nouvelle version.</p> : null}
      </>}
    </section> : null}
    {tab === "coherence" ? <section aria-label={TAB_LABELS[locale].coherence} className={styles.panel} role="tabpanel"><p>La relecture vérifie le récit et les références à la Bible. Un rapport périmé ne permet pas l’approbation.</p><div className={styles.actions}><Button disabled={Boolean(busy) || scriptDirty} onClick={reviewScript} type="button" variant="secondary">Relire le scénario</Button><Button disabled={Boolean(busy) || scriptDirty || !review?.can_approve || approved} onClick={approveScript} type="button">Approuver le scénario</Button></div>{review ? <div className={styles.status} data-tone={review.can_approve ? "success" : "error"}><strong>{review.status === "pass" ? "Aucun blocage" : review.status === "warning" ? "Avertissements" : "Blocages à corriger"}</strong>{review.findings.length ? <ul className={styles.findings}>{review.findings.map((finding) => <li key={`${finding.severity}-${finding.title}-${finding.recommendation}`}><strong>{finding.title}</strong> — {finding.recommendation}</li>)}</ul> : null}</div> : <p>Aucun rapport actif. Lance une relecture après avoir enregistré le scénario.</p>}</section> : null}
  </div>;
}
