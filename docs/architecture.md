# Architecture — vertical slice « One Complete Shot »

## Frontières

- `engine.director` porte le contrat sémantique `Shot` et construit les prompts.
- `engine.generation.comfy` connaît l'API ComfyUI et les graphes API-format, mais
  ne connaît pas Belladone ni l'histoire.
- `engine.generation.video` expose `VideoGenerator`; LTX n'est qu'un adaptateur.
- `engine.production` orchestre les étapes et écrit les artefacts traçables.
- `tools` et `apps.api` sont des adaptateurs d'entrée, pas des domaines métier.
- `apps.api.assets` normalise les artefacts manuels et générés afin de permettre
  un pipeline hybride sans branchement spécial dans les étapes aval.

Le `Shot` ne contient aucun numéro de nœud ComfyUI. Ceux-ci vivent dans des
profils de workflow remplaçables, créés automatiquement par `WorkflowFactory`.
Le mapping reçoit un contexte de valeurs
sémantiques (`prompt`, `seed`, `reference_image`, etc.) et travaille sur une
copie du graphe, ce qui évite de contaminer les générations suivantes.

## Pipeline

1. validation stricte du JSON par Pydantic ;
2. construction déterministe des prompts positif et négatif ;
3. upload éventuel des références de personnages ;
4. mapping, soumission, attente et téléchargement de la keyframe ;
5. upload de la keyframe approuvée ;
6. mapping et exécution du workflow LTX image-to-video ;
7. écriture atomique du manifeste de génération.

La commande complète enchaîne 4 à 6 pour atteindre la milestone. Les options
`--keyframe-only` et `--from-keyframe` matérialisent la frontière de validation
humaine sans ajouter prématurément une base ou une interface.

## Décisions différées

Le world state, le moteur narratif, le montage d'épisodes, la base de données et
le studio React sont hors de cette tranche. Leur ajout ne demandera pas de
modifier `ComfyClient` ni le contrat `VideoGenerator`.
