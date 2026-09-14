import type { SeasonPlanStatus } from "./model";

export type SeasonPlanLocale = "fr" | "en";

const messages = {
  fr: {
    eyebrow: "PLAN DE SAISON", title: "Construis la saison",
    description: "Réorganise les intentions sans renommer les épisodes déjà créés.", revision: "Révision",
    loading: "Chargement du plan de saison", unavailable: "Plan de saison indisponible",
    unavailableDescription: "Recharge les données. Aucun changement local ne sera appliqué.", reload: "Recharger",
    emptyTitle: "La saison est encore vide", emptyDescription: "Ajoute une première intention d’épisode, puis affine-la avant de la matérialiser.",
    add: "Ajouter une intention", adding: "Ajout…", episode: "Épisode", titleField: "Titre", logline: "Promesse",
    synopsis: "Synopsis", cliffhanger: "Cliffhanger", characters: "Personnages (un identifiant par ligne)", locations: "Lieux (un identifiant par ligne)",
    save: "Enregistrer", saving: "Enregistrement…", validate: "Valider", duplicate: "Dupliquer", remove: "Retirer du plan", restore: "Restaurer",
    materialize: "Créer l’épisode", moveUp: "Monter", moveDown: "Descendre", drag: "Déplacer l’intention",
    advanced: "Détails avancés", stableId: "ID stable", productionCode: "Code de production", noProductionCode: "Pas encore attribué",
    removed: "Retiré — récupérable", conflict: "Le plan a changé ailleurs. Recharge-le avant de poursuivre.",
    genericError: "L’opération a échoué. Tes données n’ont pas été remplacées.", producedDeleteTitle: "Retirer un épisode produit ?",
    producedDeleteDescription: "L’intention sera retirée du plan, mais l’épisode et ses fichiers seront conservés.",
    confirmRemove: "Retirer en conservant l’épisode", cancel: "Annuler",
    status: { draft: "Brouillon", validated: "Validé", materialized: "Matérialisé", produced: "Produit", obsolete: "Obsolète" } satisfies Record<SeasonPlanStatus, string>,
  },
  en: {
    eyebrow: "SEASON PLAN", title: "Build the season", description: "Reorder story intentions without renaming episodes that already exist.", revision: "Revision",
    loading: "Loading season plan", unavailable: "Season plan unavailable", unavailableDescription: "Reload the data. No local change will be applied.", reload: "Reload",
    emptyTitle: "The season is still empty", emptyDescription: "Add a first episode intention, then refine it before materializing it.",
    add: "Add an intention", adding: "Adding…", episode: "Episode", titleField: "Title", logline: "Promise", synopsis: "Synopsis", cliffhanger: "Cliffhanger",
    characters: "Characters (one ID per line)", locations: "Locations (one ID per line)", save: "Save", saving: "Saving…", validate: "Validate", duplicate: "Duplicate",
    remove: "Remove from plan", restore: "Restore", materialize: "Create episode", moveUp: "Move up", moveDown: "Move down", drag: "Move intention",
    advanced: "Advanced details", stableId: "Stable ID", productionCode: "Production code", noProductionCode: "Not assigned yet", removed: "Removed — recoverable",
    conflict: "The plan changed elsewhere. Reload it before continuing.", genericError: "The operation failed. Your data was not replaced.",
    producedDeleteTitle: "Remove a produced episode?", producedDeleteDescription: "The intention will leave the plan, but the episode and its files will be kept.",
    confirmRemove: "Remove and keep episode", cancel: "Cancel",
    status: { draft: "Draft", validated: "Validated", materialized: "Materialized", produced: "Produced", obsolete: "Obsolete" } satisfies Record<SeasonPlanStatus, string>,
  },
} as const;

export function getSeasonPlanMessages(locale: SeasonPlanLocale) { return messages[locale]; }
