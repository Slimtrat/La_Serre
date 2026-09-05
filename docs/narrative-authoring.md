# Atelier narratif

Le Studio sépare désormais la **proposition** de la **décision canonique** à chaque niveau.
Une génération Ollama ne modifie jamais directement la série, un épisode ou ses plans.

## Série

Le graphe Série expose trois nœuds métier :

1. **Director** — genre, ton, direction visuelle, durée, thèmes, contraintes et règles ;
2. **Scénariste** — arc global, progressions et propositions d’épisodes ;
3. **Validateur général** — verdict et constats, sans réécriture implicite.

Chaque carte accepte la saisie manuelle, un import et une proposition IA avec modèle et prompt
personnalisables. `Enregistrer` produit un brouillon ; `Approuver` est une gate humaine. Modifier
une étape invalide les étapes aval. Après approbation du rapport général, `Créer les épisodes`
publie seulement les numéros qui n’existent pas encore.

Le workflow et sa provenance sont enregistrés dans
`world/narrative-workflow.json` au sein du dossier de travail du projet actif.

## Épisode

Un épisode peut exister dès l’état `idea`, sans casting, lieu ni plan. Le cycle supporté est :

`idea → writing → review → approved → breakdown → production → final`

L’ancien état `draft` reste accepté pour les projets existants. L’atelier permet de créer,
modifier et mettre un épisode à la corbeille récupérable. Le brouillon IA est prévisualisé dans
les champs d’édition puis doit être appliqué explicitement.

La gate de cohérence vérifie au minimum la présence d’une promesse narrative exploitable et la
résolution des identifiants de casting et de lieux dans la Bible. Son empreinte est conservée :
si le texte change, l’approbation est refusée jusqu’à une nouvelle validation.

## Découpage

Le découpage IA ou importé est rendu sous forme de cartes de plans éditables. `Appliquer le
découpage` vérifie les références canoniques puis crée atomiquement :

- le nouvel ordre des plans et les `shot_sources` dans `episode.json` ;
- un contrat `Shot` par plan ;
- trois `visual_beats` début / milieu / fin pour guider les trois images de continuité ;
- la provenance (manuel, import ou IA, prompt et modèle).

## API principale

- `GET /api/narrative/series`
- `PUT /api/narrative/series/{director|screenwriter|validator}`
- `POST /api/narrative/series/{stage}/approve`
- `POST /api/narrative/series/{stage}/generate`
- `POST /api/narrative/series/publish`
- `POST /api/episodes`, `PUT /api/episodes/{id}`, `DELETE /api/episodes/{id}`
- `POST /api/episodes/{id}/draft/generate` puis `/draft/apply`
- `POST /api/episodes/{id}/review` puis `/approve`
- `POST /api/episodes/{id}/breakdown/generate` puis `/breakdown/apply`
