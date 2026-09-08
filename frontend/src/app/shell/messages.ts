import { normalizeStudioLocale, type StudioLocale } from "../router";

const shellMessages = {
  fr: {
    brand: "La Serre",
    studio: "Studio local",
    context: {
      context: "Contexte de création",
      project: "Projet actif",
      series: "Série active",
      episode: "Épisode actif",
      shot: "Plan actif",
      loading: "Chargement…",
      noProject: "Aucun projet",
      noEpisode: "Aucun épisode",
      noSeries: "Aucune série",
      noShot: "Aucun plan",
    },
    tools: {
      tools: "Outils",
      assets: "Assets",
      journal: "Journal",
      guide: "Guide",
      demo: "Démo locale",
      writing: "Écriture",
      settings: "Réglages",
      services: "Moteurs locaux",
      bible: "Bible",
      graph: "Graphe avancé",
    },
    runtime: {
      runtime: "Moteurs locaux",
      checking: "Vérification…",
      ready: "Disponibles",
      unavailable: "À préparer",
    },
    noProjectTitle: "Commence par créer un projet",
    noProjectDescription:
      "Chaque série, épisode, média et export reste isolé dans son projet local.",
    createProject: "Créer un projet",
    language: "Langue de l’interface",
  },
  en: {
    brand: "La Serre",
    studio: "Local studio",
    context: {
      context: "Creation context",
      project: "Active project",
      series: "Active series",
      episode: "Active episode",
      shot: "Active shot",
      loading: "Loading…",
      noProject: "No project",
      noEpisode: "No episode",
      noSeries: "No series",
      noShot: "No shot",
    },
    tools: {
      tools: "Tools",
      assets: "Assets",
      journal: "Activity log",
      guide: "Guide",
      demo: "Local demo",
      writing: "Writing",
      settings: "Settings",
      services: "Local engines",
      bible: "Bible",
      graph: "Advanced graph",
    },
    runtime: {
      runtime: "Local engines",
      checking: "Checking…",
      ready: "Available",
      unavailable: "Setup required",
    },
    noProjectTitle: "Create a project to get started",
    noProjectDescription:
      "Each series, episode, media file, and export stays isolated in its local project.",
    createProject: "Create project",
    language: "Interface language",
  },
} as const;

export type StudioShellMessages = (typeof shellMessages)[StudioLocale];

export function getStudioShellMessages(
  locale: string | undefined,
): StudioShellMessages {
  return shellMessages[normalizeStudioLocale(locale)];
}
