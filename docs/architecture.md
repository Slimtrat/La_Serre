# Architecture — vertical slice « One Complete Shot »

## Frontières

- `engine.director` porte le contrat sémantique `Shot` et construit les prompts.
- `engine.narrative` transforme une source texte en proposition créative via
  Ollama ; le code impose ensuite les identifiants, seeds et paramètres de rendu.
- `engine.world` charge le catalogue `.private/` et refuse les dérives de
  visage, costume, accessoires ou décor entre la bible et les plans.
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

Le montage d'épisodes est désormais une tranche indépendante de ComfyUI. Il
résout pour chaque plan un clip généré ou importé, accepte une keyframe comme
animatique explicite, synthétise localement les dialogues avec les voix SAPI de
Windows ou consomme des voix importées, puis normalise et concatène les plans
avec FFmpeg. Musique et ambiance sont bouclées, la musique est atténuée sous les
dialogues, les sous-titres sont intégrés au MP4 et `ffprobe` vérifie la durée,
le format ainsi que la présence des pistes audio et vidéo.

Le world state avancé et la base de données restent hors de cette tranche. Le
montage consomme les contrats `Episode` et `Shot` existants sans coupler
`ComfyClient`, la synthèse vocale et FFmpeg.
