import { useActiveContext, useActiveContextPort } from "@app/kernel";

import { useStudioCatalog } from "./studioCatalog";
import styles from "./StudioShell.module.css";

export interface ContextBarLabels {
  readonly context: string;
  readonly project: string;
  readonly episode: string;
  readonly series: string;
  readonly shot: string;
  readonly loading: string;
  readonly noProject: string;
  readonly noEpisode: string;
  readonly noSeries: string;
  readonly noShot: string;
}

export interface ContextBarProps {
  readonly labels: ContextBarLabels;
  readonly onOpenShot: () => void;
}

export function ContextBar({ labels, onOpenShot }: ContextBarProps) {
  const context = useActiveContext();
  const activeContext = useActiveContextPort();
  const { projects, episodes } = useStudioCatalog(context.projectId);

  return (
    <nav aria-label={labels.context} className={styles.contextBar} data-context-bar>
      <label className={styles.contextControl}>
        <span>{labels.project}</span>
        <select
          aria-label={labels.project}
          disabled={projects.isPending || projects.data?.length === 0}
          onChange={(event) =>
            activeContext.selectProject(event.currentTarget.value || null)
          }
          value={context.projectId ?? ""}
        >
          <option value="">
            {projects.isPending ? labels.loading : labels.noProject}
          </option>
          {projects.data?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <span className={styles.contextValue}>
        <small>{labels.series}</small>
        <strong>{context.seriesId ?? labels.noSeries}</strong>
      </span>
      <label className={styles.contextControl}>
        <span>{labels.episode}</span>
        <select
          aria-label={labels.episode}
          disabled={
            context.projectId === null ||
            episodes.isPending ||
            episodes.data?.length === 0
          }
          onChange={(event) =>
            activeContext.selectEpisode(event.currentTarget.value || null)
          }
          value={context.episodeId ?? ""}
        >
          <option value="">
            {episodes.isPending ? labels.loading : labels.noEpisode}
          </option>
          {episodes.data?.map((episode) => (
            <option key={episode.id} value={episode.id}>
              {episode.title}
            </option>
          ))}
        </select>
      </label>
      <button
        aria-label={`${labels.shot}: ${context.shotId ?? labels.noShot}`}
        className={styles.contextLink}
        disabled={context.episodeId === null}
        onClick={onOpenShot}
        type="button"
      >
        <small>{labels.shot}</small>
        <strong>{context.shotId ?? labels.noShot}</strong>
      </button>
    </nav>
  );
}

