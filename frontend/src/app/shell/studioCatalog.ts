import { useQuery } from "@tanstack/react-query";

import {
  listEpisodesApiEpisodesGet,
  listProjectsApiProjectsGet,
  runtimeServicesApiRuntimeServicesGet,
} from "@/generated/openapi";

type UnknownRecord = Readonly<Record<string, unknown>>;

function record(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export interface ProjectOption {
  readonly id: string;
  readonly name: string;
}

export interface EpisodeOption {
  readonly id: string;
  readonly title: string;
  readonly seriesId: string | null;
}

export interface RuntimeSummary {
  readonly enabled: boolean | null;
  readonly serviceCount: number;
}

export function decodeProjects(value: unknown): readonly ProjectOption[] {
  const projects = record(value).projects;
  if (!Array.isArray(projects)) return [];
  return projects.flatMap((candidate) => {
    const item = record(candidate);
    const id = string(item.id);
    if (!id) return [];
    return [{ id, name: string(item.name) ?? id }];
  });
}

export function decodeEpisodes(value: unknown): readonly EpisodeOption[] {
  const episodes = record(value).episodes;
  if (!Array.isArray(episodes)) return [];
  return episodes.flatMap((candidate) => {
    const item = record(candidate);
    const id = string(item.id);
    if (!id) return [];
    return [
      {
        id,
        title: string(item.title) ?? id,
        seriesId: string(item.series_id),
      },
    ];
  });
}

export function decodeRuntime(value: unknown): RuntimeSummary {
  const payload = record(value);
  return {
    enabled: typeof payload.enabled === "boolean" ? payload.enabled : null,
    serviceCount: Array.isArray(payload.services) ? payload.services.length : 0,
  };
}

export function useStudioCatalog(projectId: string | null) {
  const projects = useQuery({
    queryKey: ["studio-shell", "projects"],
    queryFn: listProjectsApiProjectsGet,
    select: decodeProjects,
  });
  const episodes = useQuery({
    enabled: projectId !== null,
    queryKey: ["studio-shell", "episodes", projectId],
    queryFn: listEpisodesApiEpisodesGet,
    select: decodeEpisodes,
  });
  return { projects, episodes };
}

export function useRuntimeSummary() {
  return useQuery({
    queryKey: ["studio-shell", "runtime"],
    queryFn: runtimeServicesApiRuntimeServicesGet,
    refetchInterval: 30_000,
    select: decodeRuntime,
  });
}
