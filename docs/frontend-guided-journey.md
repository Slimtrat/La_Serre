# Parcours guidé React

La route #/create est composée par la feature frontend/src/features/guided-journey. Elle ne monte aucun sélecteur ou composant DOM historique.

## Responsabilités

- GuidedJourney charge en parallèle GET /api/studio/journey et GET /api/guided avec TanStack Query.
- JourneyStepper reprend automatiquement la première étape non approuvée ou non terminée du snapshot.
- StageHost compose les huit étapes et accepte des slots typés pour casting, relations, saison, épisode, storyboard, production et release.
- JourneyContext fournit uniquement l’étape active et la navigation produit.
- ProposalReviewDrawer maintient la proposition hors de l’état canonique jusqu’à acceptation explicite.

Les mutations envoient toujours expected_revision. Un conflit optimiste reste visible dans le parcours et n’est jamais remplacé silencieusement. Les locked_fields du brief sont renvoyés avec la sauvegarde ; le backend reste l’autorité qui protège aussi ces champs lors de l’acceptation d’une proposition.

## Frontière legacy

index.html ne charge plus guided-workspace.js. Le fichier est conservé temporairement comme référence de migration, mais il n’est plus exécuté sur le chemin produit. Les vues Produire, Résultats et graphe restent accessibles par le routeur du shell et leurs LegacyWorkspaceSlot jusqu’à leurs migrations respectives.

## Points d’intégration

La prop slots de GuidedJourney permet à une feature de fournir le contenu d’une étape avec une clé JourneyStageSnapshotId. Le shell, les appels API et le stepper restent propriétaires de la progression ; une tranche métier n’a besoin d’aucun sélecteur DOM.

## Vérifications

Les tests RTL couvrent la reprise depuis le snapshot, la conservation des champs verrouillés et l’explication d’un conflit de révision. Le smoke tests/browser/guided_graph_smoke.mjs vérifie les huit étapes React, l’absence du shell guidé legacy et l’accès au graphe avancé.