# Versions éditoriales

Le Studio distingue les **versions** successives du canon et les **variantes**
créatives qui restent parallèles tant qu'elles ne sont pas promues.

Depuis **Sorties → Versions du texte**, l'utilisateur peut :

- modifier les champs lisibles du scénario ou du plan courant sans toucher au JSON ;
- nommer et enregistrer une nouvelle version canonique ;
- dupliquer le travail comme variante non destructive ;
- comparer deux états dans un diff avant/après par champ ;
- demander à Ollama une explication éditoriale, avec résumé déterministe si le
  moteur local est indisponible ;
- choisir une version comme canon.

Avant toute mutation canonique, le Studio crée un snapshot immuable sous
`output/.history/editorial/<episode>/snapshots`. Le snapshot conserve la date,
le fournisseur, le modèle, le prompt, la seed et les identifiants des rendus
compatibles. Une promotion archive d'abord le canon courant, restaure les rendus
liés lorsqu'ils existent et invalide explicitement les dépendances incompatibles.

## API

- `GET /api/editorial-history/{episode_id}`
- `POST /api/editorial-history/{episode_id}`
- `GET /api/editorial-history/{episode_id}/compare`
- `POST /api/editorial-history/{episode_id}/compare/explain`
- `POST /api/editorial-history/{episode_id}/{version_id}/promote`

Les portées acceptées sont `episode` et `shot`. Pour un plan, `shot_id` est
obligatoire. Les snapshots contiennent les contrats complets pour garantir une
restauration valide, mais l'interface présente uniquement des champs métier et
des différences lisibles.
