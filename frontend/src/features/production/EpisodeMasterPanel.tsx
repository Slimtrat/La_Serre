import { type FormEvent, useState } from "react";

import { Badge, Button, ConfirmAction, MediaFrame, Progress } from "@shared";

import type { AssembleEpisodeInput, EpisodeMasterState, ProductionLocale } from "./model";
import styles from "./EpisodeProductionCockpit.module.css";

const COPY = {
  fr: {
    title: "Master de l’épisode", intro: "Assemble uniquement les sources présentes, valides et approuvées.",
    assemble: "Assembler le master", assembling: "Assemblage…", replace: "Remplacer le master existant ?",
    replaceDescription: "Le master actuel sera archivé avant la nouvelle version. Les validations des plans restent intactes.",
    confirm: "Assembler une nouvelle version", cancel: "Conserver le master", advanced: "Réglages d’export avancés",
    animatic: "Autoriser une animatique avec des images fixes", result: "Résultat", download: "Télécharger le MP4",
    manifest: "Voir le manifeste", subtitles: "Télécharger les sous-titres", unavailable: "Assemblage indisponible",
  },
  en: {
    title: "Episode master", intro: "Assemble only present, valid, and approved sources.",
    assemble: "Assemble master", assembling: "Assembling…", replace: "Replace the existing master?",
    replaceDescription: "The current master will be archived before the new version. Shot approvals remain intact.",
    confirm: "Assemble a new version", cancel: "Keep current master", advanced: "Advanced export settings",
    animatic: "Allow an animatic with still images", result: "Result", download: "Download MP4",
    manifest: "View manifest", subtitles: "Download subtitles", unavailable: "Assembly unavailable",
  },
} as const;

export interface EpisodeMasterPanelProps {
  readonly busy: boolean;
  readonly locale: ProductionLocale;
  readonly master: EpisodeMasterState;
  readonly onAssemble: (input: AssembleEpisodeInput) => void;
}

export function EpisodeMasterPanel({ busy, locale, master, onAssemble }: EpisodeMasterPanelProps) {
  const labels = COPY[locale];
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<AssembleEpisodeInput | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: AssembleEpisodeInput = {
      allowStills: data.get("allow_stills") === "on",
      force: master.exists,
      width: Number(data.get("width")),
      height: Number(data.get("height")),
      fps: Number(data.get("fps")),
      tts: String(data.get("tts")) as AssembleEpisodeInput["tts"],
    };
    if (master.exists) {
      setPending(input);
      setConfirmOpen(true);
    } else onAssemble(input);
  };
  const active = master.jobStatus && !["ANIMATIC", "PREVIEW", "FINAL", "FAILED"].includes(master.jobStatus);
  return (
    <section className={styles.masterPanel} data-master-status={master.status ?? "missing"}>
      <header><div><small>EXPORT</small><h2>{labels.title}</h2><p>{labels.intro}</p></div>{master.status ? <Badge tone={master.releaseEligible ? "success" : "warning"}>{master.status}</Badge> : null}</header>
      {master.blocker ? <p className={styles.blocker} role="status">{master.blocker}</p> : null}
      {master.jobMessage ? <Progress label={master.jobMessage} max={100} showValue value={master.jobProgress} /> : null}
      {master.exists && master.videoUrl ? <div className={styles.masterResult}><MediaFrame aspectRatio="9 / 16" caption={labels.result} fit="contain"><video controls preload="metadata" src={master.videoUrl}><track kind="captions" label="Captions" src={master.subtitlesUrl ?? "data:text/vtt,WEBVTT"} srcLang={locale} /></video></MediaFrame><div className={styles.masterLinks}><a href={master.videoUrl}>{labels.download}</a>{master.manifestUrl ? <a href={master.manifestUrl}>{labels.manifest}</a> : null}{master.subtitlesUrl ? <a href={master.subtitlesUrl}>{labels.subtitles}</a> : null}</div></div> : null}
      <form onSubmit={submit}>
        <details className={styles.exportSettings}>
          <summary>{labels.advanced}</summary>
          <div>
            <label>Width<input defaultValue="1080" max="2160" min="256" name="width" step="8" type="number" /></label>
            <label>Height<input defaultValue="1920" max="3840" min="256" name="height" step="8" type="number" /></label>
            <label>FPS<input defaultValue="24" max="120" min="1" name="fps" type="number" /></label>
            <label>TTS<select defaultValue="auto" name="tts"><option value="auto">Auto</option><option value="edge">Edge</option><option value="sapi">SAPI</option><option value="none">None</option></select></label>
            <label className={styles.check}><input name="allow_stills" type="checkbox" />{labels.animatic}</label>
          </div>
        </details>
        <Button data-production-action="assemble" disabled={busy || active || !master.canAssemble} loading={busy || Boolean(active)} loadingLabel={labels.assembling} type="submit">{master.canAssemble ? labels.assemble : labels.unavailable}</Button>
      </form>
      <ConfirmAction cancelLabel={labels.cancel} confirmLabel={labels.confirm} description={labels.replaceDescription} onConfirm={() => { if (pending) onAssemble(pending); setPending(null); setConfirmOpen(false); }} onOpenChange={setConfirmOpen} open={confirmOpen} title={labels.replace} />
    </section>
  );
}
