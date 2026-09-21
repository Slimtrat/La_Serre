import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  activateProjectApiProjectsProjectIdActivatePost,
  createProjectApiProjectsPost,
  getExamplesApiGuidedExamplesGet,
  getGuidedApiGuidedGet,
  listProjectsApiProjectsGet,
  putBriefApiGuidedBriefPut,
  type ExampleStory,
} from "@/generated/openapi";
import { Button } from "@shared";

import { decodeGuidedPayload } from "./model";
import styles from "./guidedJourney.module.css";

const PENDING_EXAMPLE_KEY = "serre:guided-example-pending";
type PendingExample = { projectId: string; example: ExampleStory };

function readPendingExample(): PendingExample | null {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(PENDING_EXAMPLE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    const pending = parsed as Record<string, unknown>;
    const example = pending.example as Record<string, unknown> | undefined;
    if (typeof pending.projectId !== "string" || !pending.projectId || !example
      || typeof example.id !== "string" || typeof example.name !== "string"
      || typeof example.language !== "string" || !example.brief || typeof example.brief !== "object") return null;
    return parsed as PendingExample;
  } catch {
    return null;
  }
}

function rememberPendingExample(pending: PendingExample | null) {
  try {
    if (pending) window.sessionStorage.setItem(PENDING_EXAMPLE_KEY, JSON.stringify(pending));
    else window.sessionStorage.removeItem(PENDING_EXAMPLE_KEY);
  } catch {
    // Retry remains possible while this view stays mounted, even if storage is disabled.
  }
}

function activeProjectId(value: unknown): string {
  const id = value && typeof value === "object" ? (value as Record<string, unknown>).active_id : null;
  if (typeof id !== "string" || !id) throw new Error("Le nouveau projet n’a pas d’identifiant actif.");
  return id;
}

function announceProject(value: unknown) {
  const projects = window as Window & { SerreProjects?: { refresh?: () => Promise<unknown> } };
  void projects.SerreProjects?.refresh?.().catch(() => {});
  window.dispatchEvent(new CustomEvent("studio:project-changed", { detail: value }));
}

export function ExampleBriefPicker({ locale, currentProjectId }: {
  readonly locale: "fr" | "en";
  readonly currentProjectId: string;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [pending, setPending] = useState<PendingExample | null>(readPendingExample);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const examples = useQuery({ queryKey: ["guided-examples"], queryFn: getExamplesApiGuidedExamplesGet, retry: false, staleTime: Infinity });
  const selected = examples.data?.examples.find((example) => example.id === selectedId);
  const french = locale === "fr";

  const refreshProject = async () => {
    await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== "guided-examples" });
  };

  const saveExample = async (projectId: string, example: ExampleStory) => {
    const listing = await listProjectsApiProjectsGet();
    if (activeProjectId(listing) !== projectId) {
      const activated = await activateProjectApiProjectsProjectIdActivatePost(projectId);
      announceProject(activated);
    }
    const guided = decodeGuidedPayload(await getGuidedApiGuidedGet());
    const brief = {
      ...guided.brief,
      ...example.brief,
      language: example.language,
      source_example_id: example.id,
      learning_goals: example.learning_goals ?? [],
      continuity_notes: example.continuity_notes ?? [],
    };
    await putBriefApiGuidedBriefPut({ expected_revision: guided.revision, brief });
    await refreshProject();
  };

  const start = async () => {
    if (busy || (!selected && !pending)) return;
    const example = pending?.example ?? selected;
    if (!example) return;
    if (!pending && !window.confirm(french
      ? "Créer un nouveau projet vierge pour cette histoire ? Le projet actuel, sa Bible et ses épisodes resteront intacts."
      : "Create a new empty project for this story? The current project, its story bible and episodes will stay untouched.")) return;
    setBusy(true);
    setError("");
    setSuccess("");
    let createdProjectId = pending?.projectId ?? null;
    try {
      if (!createdProjectId) {
        window.dispatchEvent(new CustomEvent("studio:project-changing", { detail: { previous: currentProjectId } }));
        const listing = await createProjectApiProjectsPost({
          name: example.name.slice(0, 80),
          template_id: "custom",
          clone_content: false,
          include_example_content: false,
        });
        createdProjectId = activeProjectId(listing);
        const createdPending = { projectId: createdProjectId, example };
        rememberPendingExample(createdPending);
        setPending(createdPending);
        announceProject(listing);
      }
      await saveExample(createdProjectId, example);
      rememberPendingExample(null);
      setPending(null);
      setSuccess(french ? "Projet séparé créé avec ce brief. Tu peux maintenant le modifier." : "Separate project created with this brief. You can now edit it.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(createdProjectId
        ? (french ? `Le projet a été créé, mais son brief n’est pas encore enregistré : ${message}. Réessaie sans recréer de projet.` : `The project was created, but its brief was not saved: ${message}. Retry without creating another project.`)
        : message);
      if (createdProjectId) await refreshProject().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  return <section aria-label={french ? "Histoires exemples" : "Example stories"} className={styles.examplePicker}>
    <div>
      <strong>{french ? "Partir d’une histoire exemple" : "Start from an example story"}</strong>
      <p>{french ? "Chaque exemple démarre un projet vierge séparé : aucune Bible ni aucun épisode existant n’est repris." : "Each example starts a separate empty project: no existing story bible or episode is copied."}</p>
    </div>
    {examples.isPending ? <p role="status">{french ? "Chargement des exemples…" : "Loading examples…"}</p> : null}
    {examples.isError ? <div><p role="alert">{french ? "Impossible de charger les exemples." : "Could not load examples."}</p><Button onClick={() => void examples.refetch()} type="button" variant="secondary">{french ? "Réessayer" : "Retry"}</Button></div> : null}
    {examples.isSuccess && !examples.data.examples.length && !pending ? <p>{french ? "Aucun exemple disponible." : "No examples available."}</p> : null}
    {(examples.isSuccess && examples.data.examples.length > 0) || pending ? <>
      <div className={styles.exampleControls}>
        <label htmlFor="guided-example-select">{french ? "Histoire" : "Story"}
          <select disabled={busy || !!pending} id="guided-example-select" onChange={(event) => { setSelectedId(event.target.value); setSuccess(""); }} value={selectedId}>
            <option value="">{french ? "Choisir un exemple…" : "Choose an example…"}</option>
            {examples.data?.examples.map((example) => <option key={example.id} value={example.id}>{example.name} · {example.language}</option>)}
          </select>
        </label>
        <Button disabled={busy || (!selected && !pending)} onClick={() => void start()} type="button" variant="secondary">{pending ? (french ? "Réessayer l’enregistrement" : "Retry saving") : (french ? "Créer ce projet" : "Create this project")}</Button>
      </div>
      {(pending?.example ?? selected) ? <p>{(pending?.example ?? selected)?.description}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {pending ? <Button disabled={busy} onClick={() => {
        rememberPendingExample(null);
        setPending(null);
        setError("");
        setSuccess(french ? "Projet conservé sans brief. Tu peux le reprendre depuis la liste des projets." : "Project kept without its brief. You can reopen it from the project list.");
      }} type="button" variant="secondary">{french ? "Continuer sans enregistrer" : "Continue without saving"}</Button> : null}
      {success ? <p role="status">{success}</p> : null}
    </> : null}
  </section>;
}
