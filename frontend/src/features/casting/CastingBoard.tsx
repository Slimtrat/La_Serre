import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, MediaFrame, Skeleton } from "@shared";

import {
  generateVariant,
  getCasting,
  importVariant,
  reviewVariant,
  type VariantKind,
  type VisualVariant,
} from "./castingApi";
import styles from "./CastingBoard.module.css";

interface CharacterOption {
  id: string;
  name: string;
  visualDescription?: string;
  wardrobe?: string;
}

export interface CastingBoardProps {
  characters: readonly CharacterOption[];
  generationLicenses?: readonly {
    id: string;
    name: string;
    url: string;
    summary: string;
    commercialUse: string;
  }[];
  locale: "fr" | "en";
  projectId: string;
}

const TEXT = {
  fr: {
    title: "Identités visuelles maîtres",
    intro: "Compare plusieurs pistes. Rien ne devient canonique sans ton approbation.",
    noCharacter: "Ajoute d’abord un personnage au casting.",
    import: "Importer une apparence",
    generate: "Générer une apparence",
    approve: "Approuver comme maître",
    restore: "Restaurer comme maître",
    reject: "Rejeter",
    compare: "Comparer",
    empty: "Aucune apparence pour ce personnage.",
    permanent: "Identité permanente",
    outfit: "Tenue",
    transient: "État transitoire",
    source: "Provenance",
    affected: "Le changement affecte",
    advanced: "Réglages techniques avancés",
    rights: "Je confirme disposer des droits correspondant à la licence indiquée.",
    packRights: "J’ai consulté les licences du pack actif.",
  },
  en: {
    title: "Master visual identities",
    intro: "Compare several directions. Nothing becomes canonical without your approval.",
    noCharacter: "Add a cast member first.",
    import: "Import an appearance",
    generate: "Generate an appearance",
    approve: "Approve as master",
    restore: "Restore as master",
    reject: "Reject",
    compare: "Compare",
    empty: "No appearance for this character.",
    permanent: "Permanent identity",
    outfit: "Outfit",
    transient: "Transient state",
    source: "Provenance",
    affected: "This change affects",
    advanced: "Advanced technical settings",
    rights: "I confirm that I hold the rights covered by the stated license.",
    packRights: "I reviewed the active pack licenses.",
  },
} as const;

function provenance(variant: VisualVariant) {
  const source = [
    variant.provenance.source_label,
    variant.provenance.model,
    variant.provenance.workflow,
    variant.provenance.seed === null ? null : `seed ${variant.provenance.seed}`,
    variant.provenance.revision,
    variant.provenance.license,
  ];
  return source.filter(Boolean).join(" · ");
}

export function CastingBoard({ characters, generationLicenses = [], locale, projectId }: CastingBoardProps) {
  const labels = TEXT[locale];
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["casting", projectId], queryFn: getCasting, enabled: characters.length > 0 });
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? "");
  const [compared, setCompared] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (characters.some((item) => item.id === characterId)) return;
    setCharacterId(characters[0]?.id ?? "");
    setCompared([]);
  }, [characterId, characters]);
  const identity = useMemo(
    () => query.data?.characters.find((item) => item.character_id === characterId),
    [characterId, query.data],
  );
  const selectedCharacter = characters.find((item) => item.id === characterId);
  const refresh = async () => queryClient.invalidateQueries({ queryKey: ["casting", projectId] });
  const mutation = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    onSuccess: async (result: unknown) => {
      const affected = (result as { affected?: { shot_ids: string[]; rendered_shot_ids: string[] } }).affected;
      setNotice(affected ? `${labels.affected} ${affected.shot_ids.length} plan(s), ${affected.rendered_shot_ids.length} rendu(s). Aucune régénération lancée.` : "");
      setError("");
      await refresh();
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Operation failed"),
  });

  if (characters.length === 0) return <EmptyState title={labels.title} description={labels.noCharacter} />;
  if (query.isPending) return <Skeleton aria-label={labels.title} height="28rem" width="100%" />;
  if (query.error || !query.data) return <ErrorState title={labels.title} description={query.error?.message ?? "Unavailable"} />;

  const toggleCompare = (id: string) => setCompared((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current.slice(-1), id]
  );

  const importImage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Select an image");
      return;
    }
    mutation.mutate(() => importVariant(characterId, query.data.revision, {
      file,
      kind: String(data.get("kind")) as VariantKind,
      permanentIdentity: String(data.get("permanent_identity")),
      outfit: String(data.get("outfit")),
      transientState: String(data.get("transient_state")),
      license: String(data.get("license")),
    }));
  };

  const generateImage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutation.mutate(() => generateVariant(characterId, {
      expected_revision: query.data.revision,
      kind: String(data.get("kind")) as VariantKind,
      permanent_identity: String(data.get("permanent_identity")),
      outfit: String(data.get("outfit")),
      transient_state: String(data.get("transient_state")),
      prompt: String(data.get("prompt")),
      model: String(data.get("model") || "") || undefined,
      workflow: String(data.get("workflow") || "") || undefined,
      seed: Number(data.get("seed")),
      license: String(data.get("license")),
    }));
  };

  const fields = (generation = false) => <>
    <label>{labels.permanent}<textarea defaultValue={selectedCharacter?.visualDescription} minLength={10} name="permanent_identity" required /></label>
    <label>{labels.outfit}<input defaultValue={selectedCharacter?.wardrobe} name="outfit" /></label>
    <label>{labels.transient}<input name="transient_state" /></label>
    <label>Type<select name="kind"><option value="portrait">Portrait</option><option value="full_body">Full body</option><option value="expression">Expression</option></select></label>
    {generation ? <>
      <label>Prompt<textarea defaultValue={[selectedCharacter?.name, selectedCharacter?.visualDescription, selectedCharacter?.wardrobe].filter(Boolean).join(", ")} minLength={10} name="prompt" required /></label>
      {generationLicenses.length ? <aside><strong>Licences du pack actif</strong><ul>{generationLicenses.map((license) => <li key={license.id}><a href={license.url} rel="noreferrer" target="_blank">{license.name}</a> · {license.summary} · {license.commercialUse}</li>)}</ul></aside> : null}
      <label><input name="pack_licenses_confirmed" required type="checkbox" />{labels.packRights}</label>
      <details><summary>{labels.advanced}</summary>
        <label>Model<input name="model" placeholder="Détecté depuis le workflow actif" /></label>
        <label>Workflow<input name="workflow" placeholder="Profil keyframe actif" /></label>
        <label>Seed<input defaultValue="42" min="0" name="seed" required type="number" /></label>
      </details>
    </> : <label>Image<input accept="image/png,image/jpeg,image/webp" name="file" required type="file" /></label>}
    <label>License<input name="license" required /></label>
    <label><input name="rights_confirmed" required type="checkbox" />{labels.rights}</label>
  </>;

  return <section className={styles.root} data-casting-board>
    <header><div><h2>{labels.title}</h2><p>{labels.intro}</p></div>
      <label>Character<select aria-label="Character" onChange={(event) => { setCharacterId(event.currentTarget.value); setCompared([]); }} value={characterId}>{characters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </header>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    <div className={styles.forms}>
      <details><summary>{labels.import}</summary><form key={`import-${characterId}`} onSubmit={importImage}>{fields()}<Button loading={mutation.isPending} type="submit">{labels.import}</Button></form></details>
      <details><summary>{labels.generate}</summary><form key={`generate-${characterId}`} onSubmit={generateImage}>{fields(true)}<Button loading={mutation.isPending} type="submit">{labels.generate}</Button></form></details>
    </div>
    {!identity || identity.variants.length === 0 ? <EmptyState title={labels.empty} /> :
      <div className={styles.grid}>{identity.variants.map((variant) => {
        const master = identity.active_master_id === variant.id;
        return <Card className={compared.includes(variant.id) ? styles.compared : ""} key={variant.id}>
          <MediaFrame aspectRatio={variant.kind === "portrait" ? "4 / 5" : "2 / 3"}><img alt={`${variant.kind} ${variant.status}`} src={variant.media_url} /></MediaFrame>
          <div className={styles.meta}><Badge tone={master ? "success" : variant.status === "rejected" ? "danger" : "neutral"}>{master ? "MASTER" : variant.status}</Badge><strong>{variant.kind}</strong></div>
          <dl><dt>{labels.permanent}</dt><dd>{variant.permanent_identity}</dd>{variant.outfit ? <><dt>{labels.outfit}</dt><dd>{variant.outfit}</dd></> : null}{variant.transient_state ? <><dt>{labels.transient}</dt><dd>{variant.transient_state}</dd></> : null}<dt>{labels.source}</dt><dd>{provenance(variant)}</dd></dl>
          <div className={styles.actions}><Button aria-pressed={compared.includes(variant.id)} onClick={() => toggleCompare(variant.id)} variant="ghost">{labels.compare}</Button>{!master && variant.status !== "rejected" ? <Button onClick={() => mutation.mutate(() => reviewVariant(variant.status === "approved" ? "restore" : "approve", characterId, variant.id, query.data.revision))}>{variant.status === "approved" ? labels.restore : labels.approve}</Button> : null}{!master && variant.status === "candidate" ? <Button onClick={() => mutation.mutate(() => reviewVariant("reject", characterId, variant.id, query.data.revision))} variant="danger">{labels.reject}</Button> : null}</div>
        </Card>;
      })}</div>}
  </section>;
}
