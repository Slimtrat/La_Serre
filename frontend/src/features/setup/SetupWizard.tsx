import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Badge, Button, Card, ErrorState, MediaFrame, Progress, Skeleton } from "@shared";

import { setupApi, type SetupApi, type SetupStartInput } from "./api";
import { getSetupMessages } from "./messages";
import { formatBytes, type SetupDiagnosis, type SetupJob, type SetupLocale } from "./model";
import { SetupStepper } from "./SetupStepper";
import styles from "./SetupWizard.module.css";

export const SETUP_ROUTE_NAME = "create" as const;

export interface SetupWizardProps {
  readonly locale: SetupLocale;
  readonly api?: SetupApi;
  readonly readyContent?: ReactNode;
  readonly onReady?: () => void;
}

function requiredLicenses(diagnosis: SetupDiagnosis) {
  return [...new Map(
    diagnosis.components
      .filter((component) => component.required && component.state !== "installed")
      .map((component) => [component.license.id, component.license]),
  ).values()];
}

function capabilityReady(id: string, diagnosis: SetupDiagnosis) {
  const matches: Record<string, readonly string[]> = {
    write: ["ollama", "narrative"],
    characters: ["comfy", "keyframe"],
    animate: ["video", "text-encoder", "node"],
    voices: ["voice", "audio"],
    edit: ["workflow", "edit"],
  };
  const components = diagnosis.components.filter((component) =>
    matches[id].some((needle) => `${component.id} ${component.role}`.toLowerCase().includes(needle)),
  );
  return components.length === 0 || components.every((component) => component.state === "installed");
}

function completedSteps(job: SetupJob) {
  return job.steps.filter((step) => ["installed", "skipped", "completed"].includes(step.status)).length;
}

export function SetupWizard({ locale, api = setupApi, readyContent, onReady }: SetupWizardProps) {
  const messages = getSetupMessages(locale);
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState(false);
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [personalModels, setPersonalModels] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [enteredStudio, setEnteredStudio] = useState(false);

  const diagnosis = useQuery({ queryKey: ["runtime-pack", "diagnosis"], queryFn: () => api.diagnose() });
  const latest = useQuery({ queryKey: ["runtime-pack", "latest"], queryFn: () => api.latest() });
  const activeId = jobId ?? latest.data?.id ?? null;
  const jobQuery = useQuery({
    queryKey: ["runtime-pack", "job", activeId],
    queryFn: () => api.getJob(activeId as string),
    enabled: activeId !== null,
    refetchInterval: (query) => ["queued", "running"].includes((query.state.data as SetupJob | undefined)?.status ?? "") ? 750 : false,
  });
  const job = jobQuery.data ?? (latest.data?.id === activeId ? latest.data : null);
  const licenses = useMemo(() => diagnosis.data ? requiredLicenses(diagnosis.data) : [], [diagnosis.data]);
  const logs = useQuery({
    queryKey: ["runtime-pack", "logs", activeId],
    queryFn: () => api.logs(activeId as string),
    enabled: showLogs && activeId !== null,
  });

  const updateJob = (next: SetupJob) => {
    setJobId(next.id);
    queryClient.setQueryData(["runtime-pack", "job", next.id], next);
  };
  const action = useMutation({
    mutationFn: (operation: () => Promise<SetupJob>) => operation(),
    onSuccess: updateJob,
  });
  const start = useMutation({
    mutationFn: (input: SetupStartInput) => api.start(input),
    onSuccess: updateJob,
  });

  if (enteredStudio) return <>{readyContent}</>;
  if (diagnosis.isPending || latest.isPending) {
    return <main className={styles.root}><Skeleton aria-label={messages.loading} height="18rem" /></main>;
  }
  if (diagnosis.isError || latest.isError || !diagnosis.data) {
    return (
      <main className={styles.root}>
        <ErrorState title={messages.loadError} description={messages.intro} action={<Button onClick={() => { void diagnosis.refetch(); void latest.refetch(); }}>{messages.retryDiagnosis}</Button>} />
      </main>
    );
  }

  const phase = job?.status === "completed" || diagnosis.data.status === "ready" ? 4
    : job ? (job.status === "queued" || job.status === "running" || job.status === "paused" ? 2 : 3)
    : reviewing ? 1 : 0;
  const acceptedIds = [...new Set([...(job?.acceptedLicenseIds ?? []), ...accepted])];
  const canStart = confirmed && licenses.every((license) => accepted.has(license.id));
  const invoke = (operation: () => Promise<SetupJob>) => action.mutate(operation);

  if (phase === 4) {
    const smokeChecks = job?.smokeChecks ?? [];
    return (
      <main className={styles.root}>
        <SetupStepper current={4} messages={messages} />
        <section className={styles.ready} aria-labelledby="setup-ready-title">
          <Badge tone="success">{messages.steps[4]}</Badge>
          <h1 id="setup-ready-title">{messages.readyTitle}</h1>
          <p>{messages.readyIntro}</p>
          <div className={styles.readyGrid}>
            <Card as="section"><h2>{messages.smokeTitle}</h2><ul>{smokeChecks.map((check) => <li key={check.checkId}><Badge tone={check.status === "passed" ? "success" : "danger"}>{check.status === "passed" ? "✓" : "!"}</Badge> {check.message || check.checkId}</li>)}</ul></Card>
            <MediaFrame caption={messages.preview}><div className={styles.preview} aria-label={messages.preview} role="img"><span className={styles.previewLabel}>LA SERRE</span><strong>Studio local</strong></div></MediaFrame>
          </div>
          <Button size="large" onClick={() => { onReady?.(); setEnteredStudio(true); }}>{messages.continue}</Button>
        </section>
      </main>
    );
  }

  if (job) {
    const total = Math.max(job.steps.length, 1);
    const errorLike = ["failed", "cancelled", "awaiting_license", "awaiting_manual"].includes(job.status);
    return (
      <main className={styles.root}>
        <SetupStepper current={phase} messages={messages} />
        <section aria-labelledby="setup-progress-title" aria-live="polite">
          <Badge tone={errorLike ? "warning" : "info"}>{job.status.replaceAll("_", " ")}</Badge>
          <h1 id="setup-progress-title">{errorLike ? messages.errorTitle : messages.progressTitle}</h1>
          {job.recovered ? <p className={styles.notice}>{messages.resumed}</p> : null}
          {job.status === "awaiting_license" ? <p>{messages.awaitingLicense}</p> : null}
          {job.status === "awaiting_manual" ? <p>{messages.awaitingManual}</p> : null}
          {job.error ? <p role="alert">{job.error}</p> : null}
          <Progress id="setup-progress" label={messages.progress} max={total} value={completedSteps(job)} showValue />
          <ol className={styles.jobSteps}>{job.steps.map((step) => <li key={step.componentId}><Badge tone={["installed", "completed", "skipped"].includes(step.status) ? "success" : step.status === "failed" ? "danger" : "neutral"}>{step.status}</Badge><span><strong>{step.componentId}</strong>{step.message ? <small>{step.message}</small> : null}</span></li>)}</ol>
          {action.isError ? <p role="alert">{locale === "fr" ? "L’action n’a pas abouti. Vous pouvez réessayer." : "The action did not complete. You can try again."}</p> : null}
          <div className={styles.actions}>
          {job.status === "awaiting_license" && licenses.length ? <fieldset className={styles.fieldset}><legend>{messages.licenses}</legend>{licenses.map((license) => <label key={license.id}><input checked={accepted.has(license.id)} onChange={(event) => { const checked = event.currentTarget.checked; setAccepted((current) => { const next = new Set(current); checked ? next.add(license.id) : next.delete(license.id); return next; }); }} type="checkbox" /><span>{messages.licenseAccept.replace("{name}", license.name)} <a href={license.url} rel="noreferrer" target="_blank">{messages.reviewLicense}</a><small>{license.summary}</small></span></label>)}</fieldset> : null}
            {["queued", "running"].includes(job.status) ? <Button variant="secondary" onClick={() => invoke(() => api.pause(job.id))}>{messages.pause}</Button> : null}
            {job.status === "paused" ? <Button onClick={() => invoke(() => api.resume(job.id, acceptedIds))}>{messages.resume}</Button> : null}
            {errorLike ? <Button disabled={job.status === "awaiting_license" && !licenses.every((license) => acceptedIds.includes(license.id))} onClick={() => invoke(() => api.resume(job.id, acceptedIds))}>{messages.retry}</Button> : null}
            {errorLike ? <Button variant="secondary" onClick={() => invoke(() => api.repair(job.id, acceptedIds))}>{messages.repair}</Button> : null}
            {errorLike ? <Button variant="ghost" onClick={() => start.mutate({ packId: diagnosis.data.packId, mode: "manual", acceptedLicenseIds: acceptedIds, usePersonalComfyModels: true })}>{messages.manual}</Button> : null}
            {["queued", "running", "paused", "awaiting_license", "awaiting_manual"].includes(job.status) ? <Button variant="danger" onClick={() => invoke(() => api.cancel(job.id))}>{messages.cancel}</Button> : null}
          </div>
          <details className={styles.technical} onToggle={(event) => setShowLogs(event.currentTarget.open)}><summary>{messages.details}</summary><h2>{messages.logs}</h2>{logs.isPending ? <p>{messages.loading}</p> : <pre>{logs.data?.join("\n") || messages.noLogs}</pre>}</details>
        </section>
      </main>
    );
  }

  if (reviewing) {
    return (
      <main className={styles.root}>
        <SetupStepper current={1} messages={messages} />
        <section aria-labelledby="setup-review-title">
          <h1 id="setup-review-title">{messages.reviewTitle}</h1><p>{messages.reviewIntro}</p>
          <Card as="section"><h2>{messages.download}: {formatBytes(diagnosis.data.requiredDownloadBytes, locale)}</h2><p>{messages.variableTime}</p></Card>
          <fieldset className={styles.fieldset}><legend>{messages.destination}</legend><label><input checked={!personalModels} name="destination" onChange={() => setPersonalModels(false)} type="radio" /> <strong>{messages.managed}</strong></label><label><input checked={personalModels} name="destination" onChange={() => setPersonalModels(true)} type="radio" /> <strong>{messages.personal}</strong><small>{messages.personalHelp}</small></label></fieldset>
          {licenses.length ? <fieldset className={styles.fieldset}><legend>{messages.licenses}</legend>{licenses.map((license) => <label key={license.id}><input checked={accepted.has(license.id)} onChange={(event) => { const checked = event.currentTarget.checked; setAccepted((current) => { const next = new Set(current); checked ? next.add(license.id) : next.delete(license.id); return next; }); }} type="checkbox" /><span>{messages.licenseAccept.replace("{name}", license.name)} <a href={license.url} rel="noreferrer" target="_blank">{messages.reviewLicense}</a><small>{license.summary}</small></span></label>)}</fieldset> : null}
          <label className={styles.consent}><input checked={confirmed} onChange={(event) => setConfirmed(event.currentTarget.checked)} type="checkbox" /> {messages.consent}</label>
          <div className={styles.actions}><Button variant="secondary" onClick={() => setReviewing(false)}>{messages.back}</Button><Button disabled={!canStart} loading={start.isPending} loadingLabel={messages.starting} onClick={() => start.mutate({ packId: diagnosis.data.packId, mode: "automatic", acceptedLicenseIds: acceptedIds, usePersonalComfyModels: personalModels })}>{messages.start}</Button></div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.root}>
      <SetupStepper current={0} messages={messages} />
      <section className={styles.hero} aria-labelledby="setup-title"><Badge tone={diagnosis.data.status === "incompatible" ? "warning" : "info"}>{diagnosis.data.summary}</Badge><h1 id="setup-title">{messages.title}</h1><p>{messages.intro}</p></section>
      <Card as="section"><h2>{messages.machine}</h2><dl className={styles.machine}><div><dt>{messages.graphics}</dt><dd>{diagnosis.data.hardware.gpuName ?? messages.unknown}</dd></div><div><dt>{messages.memory}</dt><dd>{diagnosis.data.hardware.vramGb === null ? messages.unknown : `${diagnosis.data.hardware.vramGb} GB`}</dd></div><div><dt>{messages.disk}</dt><dd>{formatBytes(diagnosis.data.hardware.diskFreeBytes, locale)}</dd></div><div><dt>{messages.download}</dt><dd>{formatBytes(diagnosis.data.requiredDownloadBytes, locale)}</dd></div></dl></Card>
      <section aria-labelledby="setup-capabilities"><h2 id="setup-capabilities">{messages.capabilitiesTitle}</h2><div className={styles.capabilities}>{messages.capabilities.map(([id, title, description]) => { const ready = capabilityReady(id, diagnosis.data); return <Card key={id}><Badge tone={ready ? "success" : diagnosis.data.status === "incompatible" ? "warning" : "neutral"}>{ready ? messages.available : diagnosis.data.status === "incompatible" ? messages.incompatible : messages.toPrepare}</Badge><h3>{title}</h3><p>{description}</p></Card>; })}</div></section>
      <div className={styles.primaryAction}><Button disabled={diagnosis.data.status === "incompatible"} size="large" onClick={() => setReviewing(true)}>{messages.prepare}</Button></div>
    </main>
  );
}
