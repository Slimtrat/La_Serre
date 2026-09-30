# Observabilité du graphe de production

Le graphe visible dans La Serre représente le produit, pas l’implémentation technique de
ComfyUI. ComfyUI reste un moteur headless appelé par API. Le Studio affiche les étapes métier :
casting, image-clé, mouvement, voix, mixage, montage et export.

## Contrat temps réel

Une activité expose :

- un identifiant et un état (`QUEUED`, `GENERATING`, `COMPLETED` ou `FAILED`) ;
- ses étapes, événements, messages et progression ;
- une cible de graphe `{ scope, id, node_id }` qui désigne le nœud métier touché.

Les jobs démarrés dans le Studio publient déjà leurs états en mémoire. Les outils locaux et les
commandes CLI utilisent `StudioActivityStore`, stocké atomiquement sous
`output/.studio/external-activity.json`. L’endpoint `GET /api/activity` fusionne ces deux sources.

Le front interroge cet endpoint, centre le canevas lors d’un changement d’étape, anime le nœud et
les arêtes actives, affiche le journal puis conserve le résultat terminal quelques minutes. Une
activité interrompue n’est plus considérée active après deux heures.

## Invariant d’intégration

Toute nouvelle génération locale qui contourne les gestionnaires de jobs HTTP doit publier son
activité avec `StudioActivityStore`. Elle doit cibler un nœud métier existant ; elle ne doit jamais
exposer le graphe interne de ComfyUI comme interface utilisateur.
