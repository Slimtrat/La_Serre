import type { StudioRouteName } from "./routes";

export const STUDIO_LOCALES = ["fr", "en"] as const;
export type StudioLocale = (typeof STUDIO_LOCALES)[number];

export interface StudioMessages {
  readonly navigation: {
    readonly primaryName: string;
    readonly contextualName: string;
    readonly advancedName: string;
  };
  readonly routes: Readonly<Record<StudioRouteName, string>>;
  readonly notFound: {
    readonly title: string;
    readonly description: string;
    readonly backToCreate: string;
  };
}

const messages = {
  fr: {
    navigation: {
      primaryName: "Navigation principale",
      contextualName: "Outils du projet",
      advancedName: "Outils avancés",
    },
    routes: {
      create: "Créer",
      produce: "Produire",
      results: "Résultats",
      bible: "Bible",
      settings: "Réglages",
      graph: "Inspecter le pipeline",
    },
    notFound: {
      title: "Page introuvable",
      description: "Cet espace du Studio n’existe pas.",
      backToCreate: "Revenir à Créer",
    },
  },
  en: {
    navigation: {
      primaryName: "Primary navigation",
      contextualName: "Project tools",
      advancedName: "Advanced tools",
    },
    routes: {
      create: "Create",
      produce: "Produce",
      results: "Results",
      bible: "Bible",
      settings: "Settings",
      graph: "Inspect pipeline",
    },
    notFound: {
      title: "Page not found",
      description: "This Studio space does not exist.",
      backToCreate: "Back to Create",
    },
  },
} as const satisfies Readonly<Record<StudioLocale, StudioMessages>>;

export function normalizeStudioLocale(locale: string | undefined): StudioLocale {
  return locale?.toLowerCase().startsWith("en") ? "en" : "fr";
}

export function getStudioMessages(locale: string | undefined): StudioMessages {
  return messages[normalizeStudioLocale(locale)];
}
