# La Serre des Venins / The Venom Greenhouse

> **Studio local et hybride de production narrative générative.**  
> **Local-first hybrid studio for generative narrative production.**

[Français](#français) · [English](#english)

---

# Français

## Vision

**La Serre des Venins** est un studio local de production narrative assistée par IA.

L'objectif n'est pas de construire un simple générateur vidéo, mais un **IDE de production narrative générative** où une série peut être conçue, découpée, produite et validée de manière organique.

La structure cible est hiérarchique :

```text
Projet
└── Série
    ├── Episode
    │   ├── Plan
    │   ├── Plan
    │   └── Plan
    └── Episode
```

Chaque niveau possède son propre graphe :

```text
Série
Prompt / Texte
      ↓
Director / Showrunner
      ↓
Scénariste
      ↓
Validateur général
      ↓
Episodes
```

```text
Episode
Source
  ↓
Scénariste épisode
  ↓
Validation
  ↓
Découpage
  ↓
Plans
```

```text
Plan
Histoire / Prompt
      ↓
Director Shot
      ↓
Shot JSON
      ↓
Keyframes
      ↓
Validation humaine
      ↓
Mouvement
      ↓
Voix / Musique / SFX
      ↓
Montage / Export
```

Le principe fondamental est simple :

> **L'IA propose. L'utilisateur reste propriétaire du contenu et de la décision.**

À chaque étape, il doit toujours être possible de :

- générer localement ;
- écrire ou modifier manuellement ;
- utiliser son propre prompt ;
- importer un texte, une image, un son ou une vidéo ;
- changer de modèle ;
- restaurer une version précédente ;
- valider explicitement avant propagation.

---

## Pourquoi ce projet ?

Les outils génératifs actuels excellent souvent sur une étape isolée :

- génération de texte ;
- image ;
- vidéo ;
- voix ;
- montage.

Le problème apparaît lorsqu'il faut conserver :

- la cohérence narrative ;
- les identités visuelles ;
- les relations entre personnages ;
- la continuité entre épisodes ;
- la traçabilité des prompts et modèles ;
- les variantes ;
- les validations humaines ;
- les dépendances entre artefacts.

La Serre des Venins cherche à fournir cette **couche d'orchestration créative locale**.

---

## Philosophie du Studio

### Local-first

Le Studio s'appuie principalement sur :

- **Ollama** pour les modèles narratifs locaux ;
- **ComfyUI** pour les workflows image / vidéo ;
- **LTX Video** pour l'animation ;
- **FFmpeg** pour la post-production ;
- **FastAPI** pour l'API locale ;
- **WebView2 / pywebview** pour l'application desktop Windows.

Aucun modèle lourd n'est embarqué directement dans le dépôt.

### Hybride

Aucune étape ne doit dépendre exclusivement d'un moteur IA.

```text
IA locale
   OU
Import externe
   OU
Edition manuelle
   OU
Asset déjà existant
```

### Human-in-the-loop

Les validations humaines sont des éléments structurants du pipeline, pas des exceptions.

---

## Navigation cible

Le Studio évolue vers une navigation par **objets narratifs** plutôt que par écrans techniques.

```text
Projet principal
/
Série
/
Saison 1
/
E01
/
S03
```

La barre principale doit progressivement devenir :

```text
[Projet ▾]   Série / Saison 1 / E01 / S03      Assets  Journal  ?  ⚙
```

Les anciens menus globaux du type :

```text
Production | Plan | Sorties | Réglages
```

sont amenés à disparaître au profit d'une navigation contextuelle.

---

## Graphe organique

Le graphe est destiné à devenir le langage principal du Studio.

### Flux principal

Les dépendances obligatoires utilisent une sémantique **bleue** :

```text
Node actif
   ↓
Propagation bleue
   ↓
Prochaine étape requise
```

### Flux optionnel

Les branches non bloquantes utilisent une sémantique **orange** :

```text
Voix
Musique
Variantes
QA secondaire
Références supplémentaires
```

### États

Les nodes pourront exprimer notamment :

```text
idle
ready
active
done
blocked
stale
error
```

Le but est de comprendre en quelques secondes :

- où se trouve le travail actif ;
- ce qui est obligatoire ;
- ce qui est optionnel ;
- le sens de propagation ;
- les objets essentiels du projet.

---

## Bible narrative

Une Bible canonique doit devenir la source de vérité du projet :

```text
Bible
├── Personnages
├── Relations
├── Lieux
├── Direction artistique
├── Ton
├── Règles du monde
├── Secrets
└── Arcs narratifs
```

Les Episodes et les Plans référencent ces objets au lieu de recréer leur propre version.

Exemple :

```text
Belladone
   ↓
Episode E01
   ↓
Plan S03
```

Une modification de Belladone peut alors être propagée comme un **impact potentiel** sur les artefacts dépendants.

---

## Dépendances et artefacts obsolètes

Le projet est pensé comme une chaîne de dépendances :

```text
Character
   ↓
Episode
   ↓
Shot
   ↓
Keyframe
   ↓
Video
```

Si un objet amont change, le Studio doit pouvoir signaler :

```text
7 artefacts potentiellement obsolètes.
```

Sans régénération automatique.

L'utilisateur choisit ensuite quoi mettre à jour.

---

## Etat actuel

Le Studio possède déjà :

- un pipeline texte → Shot JSON ;
- un Director basé sur Ollama ;
- un pipeline ComfyUI pour les images ;
- un pipeline vidéo LTX ;
- des artefacts traçables ;
- un catalogue local d'épisodes ;
- une application desktop Windows ;
- une API FastAPI ;
- une logique de génération asynchrone ;
- une base de graphe de production.

Le chantier actuel consiste à faire évoluer cette base vers une architecture :

```text
Série → Episode → Plan
```

avec graphes imbriqués, Bible canonique, versioning, dépendances et production multi-plans.

---

## Installation développeur

### Prérequis

- Python 3.12+
- Git
- ComfyUI
- Ollama
- un modèle Ollama installé

### Installation

```powershell
git clone https://github.com/Slimtrat/skibidy-plant.git
cd skibidy-plant

python -m venv .venv
.venv\Scripts\Activate.ps1

python -m pip install -e ".[dev]"
Copy-Item .env.example .env

pytest
```

### Lancer le Studio

```powershell
python -m tools.run_studio
```

### Application desktop

```powershell
python -m pip install -e ".[desktop]"
python -m apps.desktop
```

---

## Pipeline actuel

```text
source texte
    ↓
Ollama Director
    ↓
Shot JSON validé
    ↓
3 poses ComfyUI
    ↓
validation humaine
    ↓
LTX multi-guides
    ↓
clip.mp4
    ↓
voix + musique + cadres + sous-titres
    ↓
episode.mp4
```

Chaque étape reste remplaçable par un artefact externe.

### Documentation de production

- [`docs/episode-production-contract.md`](docs/episode-production-contract.md) : contrat entre scénario, jeu, poses, cadre fantasy, son et sous-titres.
- [`docs/narrative-coherence.md`](docs/narrative-coherence.md) : règles de cohérence, comité IA local depuis les nœuds métier et gate humaine.

---

## Structure locale

Le contenu créatif privé est séparé du code :

```text
.private/
├── world/
│   ├── characters/
│   └── locations/
└── episodes/
```

`.private/` est ignoré par Git.

L'objectif à terme est de faire évoluer cette organisation vers une structure plus complète :

```text
project/
├── series/
├── bible/
├── seasons/
│   └── S01/
│       ├── E001/
│       └── E002/
└── output/
```

---

## Collaboration

Le projet est jeune et l'architecture évolue rapidement.

Les contributions sont particulièrement utiles sur les sujets suivants :

### Front / UX

- graphe interactif ;
- nodes et edges animés ;
- navigation hiérarchique ;
- breadcrumb ;
- Project Explorer ;
- Asset Drawer ;
- inspector contextuel ;
- visualisation de dépendances.

### Backend

- modèles Series / Episode / Shot ;
- API narrative ;
- dependency graph ;
- versioning ;
- queue de production ;
- gestion des artefacts ;
- validation de continuité.

### IA narrative

- prompts Director / Showrunner ;
- scénariste de série ;
- scénariste d'épisode ;
- validateur de cohérence ;
- résumé d'état narratif ;
- gestion des relations et arcs.

### Génération média

- ComfyUI ;
- workflows SDXL ;
- LTX Video ;
- continuité visuelle ;
- références personnages ;
- TTS ;
- musique ;
- sound design ;
- FFmpeg.

### Tests / architecture

- contrats de graphe ;
- tests API ;
- validation Pydantic ;
- migration des modèles ;
- tests d'intégration ;
- documentation.

---

## Comment contribuer

### 1. Regarder les issues

Les grands chantiers sont déjà découpés dans les issues GitHub.

Quelques points d'entrée :

- **#1** Navigation Série → Episode → Plan
- **#2** Bible canonique
- **#3** Director → Scénariste → Validateur
- **#4** Création complète d'épisodes
- **#5** Graphe dynamique multi-scope
- **#6** Nouvelle navigation UX
- **#7** Onboarding interactif
- **#8** Versioning et variantes
- **#9** Dépendances / stale
- **#10** Asset Drawer
- **#11** Queue de production
- **#12** Project Explorer
- **#13** Flux organiques bleu / orange

Issues :
https://github.com/Slimtrat/skibidy-plant/issues

### 2. Créer une branche

```bash
git checkout -b feature/nom-de-la-feature
```

### 3. Garder les PR ciblées

Une PR devrait idéalement :

- traiter une seule responsabilité ;
- éviter les refactors non liés ;
- inclure des tests lorsque pertinent ;
- expliquer les décisions d'architecture ;
- préserver les workflows existants.

### 4. Vérifier avant PR

```bash
pytest
```

---

## Principes de contribution

Lorsqu'une fonctionnalité est ajoutée :

1. **préserver la possibilité d'édition manuelle** ;
2. **ne jamais forcer un moteur IA particulier** ;
3. **ne jamais régénérer automatiquement un artefact sans décision utilisateur** ;
4. **conserver la provenance des artefacts** ;
5. **éviter les dépendances implicites** ;
6. **préférer les petits modules aux fichiers monolithiques** ;
7. **maintenir la compatibilité du pipeline existant lorsque possible**.

---

## Roadmap

### Phase 1 — Navigation narrative

```text
Série
  ↓
Episode
  ↓
Plan
```

### Phase 2 — Bible et continuité

```text
Characters
Relations
Locations
Story state
```

### Phase 3 — Graphe dynamique

```text
Graph DTO
Scopes
Containers
Focus paths
```

### Phase 4 — Production robuste

```text
Versioning
Stale dependencies
Asset Drawer
Production queue
```

### Phase 5 — Studio complet

```text
Narration
Image
Video
Voice
Music
Montage
Export
```

---

## Licence

Le dépôt ne définit pas encore de licence logicielle explicite.

Avant une ouverture large aux contributions externes et à la réutilisation du code, une licence devra être choisie et ajoutée au dépôt.

---

# English

## Vision

**The Venom Greenhouse** is a local-first AI-assisted narrative production studio.

The goal is not to build another video generator. The long-term objective is a **generative narrative production IDE** where a series can be designed, structured, produced and reviewed through an organic workflow.

The target hierarchy is:

```text
Project
└── Series
    ├── Episode
    │   ├── Shot
    │   ├── Shot
    │   └── Shot
    └── Episode
```

Each level has its own graph.

### Series graph

```text
Prompt / Text
      ↓
Director / Showrunner
      ↓
Writer
      ↓
General Reviewer
      ↓
Episodes
```

### Episode graph

```text
Episode source
      ↓
Episode Writer
      ↓
Review
      ↓
Breakdown
      ↓
Shots
```

### Shot graph

```text
Story / Prompt
      ↓
Shot Director
      ↓
Shot JSON
      ↓
Keyframes
      ↓
Human Review
      ↓
Motion
      ↓
Voice / Music / SFX
      ↓
Edit / Export
```

The core rule is:

> **AI proposes. The user owns the content and the decision.**

Every stage should support:

- local generation;
- manual editing;
- custom prompts;
- imported text, images, audio or video;
- model overrides;
- previous-version restoration;
- explicit human validation.

---

## Why this project?

Most generative tools are strong at one isolated step:

- text;
- image;
- video;
- voice;
- editing.

The difficult part is maintaining:

- narrative continuity;
- visual identity;
- character relationships;
- cross-episode consistency;
- prompt and model provenance;
- variants;
- human approval;
- dependencies between generated artifacts.

The Venom Greenhouse aims to provide that **local creative orchestration layer**.

---

## Studio philosophy

### Local-first

The Studio currently relies mainly on:

- **Ollama** for local narrative models;
- **ComfyUI** for image/video workflows;
- **LTX Video** for animation;
- **FFmpeg** for post-production;
- **FastAPI** for the local API;
- **WebView2 / pywebview** for the Windows desktop shell.

Large AI models are not bundled in this repository.

### Hybrid by design

No production stage should depend exclusively on one AI engine.

```text
Local AI
   OR
External import
   OR
Manual editing
   OR
Existing project asset
```

### Human-in-the-loop

Human reviews are part of the architecture, not an edge case.

---

## Target navigation

The Studio is moving from technical screens toward **narrative object navigation**.

```text
Main Project
/
Series
/
Season 1
/
E01
/
S03
```

The top bar should progressively move toward:

```text
[Project ▾]   Series / Season 1 / E01 / S03      Assets  Journal  ?  ⚙
```

Global tabs such as:

```text
Production | Shot | Outputs | Settings
```

should eventually be replaced by contextual navigation.

---

## Organic graph language

The graph is intended to become the main language of the Studio.

### Core flow

Required dependencies use a **blue visual language**.

```text
Active node
    ↓
Blue propagation
    ↓
Next required node
```

### Optional flow

Non-blocking branches use an **orange visual language**:

```text
Voice
Music
Variants
Secondary QA
Additional references
```

### Runtime states

Nodes may expose states such as:

```text
idle
ready
active
done
blocked
stale
error
```

The graph should make it possible to understand in a few seconds:

- what is currently active;
- what is required;
- what is optional;
- propagation direction;
- the essential objects of the current scope.

---

## Narrative Bible

A canonical Bible will become the project's source of truth:

```text
Bible
├── Characters
├── Relationships
├── Locations
├── Art direction
├── Tone
├── World rules
├── Secrets
└── Narrative arcs
```

Episodes and Shots should reference these objects instead of recreating their own inconsistent copies.

---

## Dependencies and stale artifacts

The project is treated as a dependency chain:

```text
Character
   ↓
Episode
   ↓
Shot
   ↓
Keyframe
   ↓
Video
```

When an upstream object changes, downstream artifacts may become stale.

The Studio should report the impact without automatically regenerating anything.

---

## Current state

The Studio already contains:

- a text → Shot JSON pipeline;
- an Ollama-based Director;
- ComfyUI image workflows;
- LTX video generation;
- traceable artifacts;
- a local episode catalog;
- a Windows desktop application;
- a FastAPI backend;
- asynchronous generation jobs;
- an interactive production graph foundation.

The current architecture work is focused on evolving this base toward:

```text
Series → Episode → Shot
```

with nested graphs, a canonical Bible, versioning, dependency tracking and multi-shot production.

---

## Developer setup

### Requirements

- Python 3.12+
- Git
- ComfyUI
- Ollama
- at least one installed Ollama model

### Setup

```powershell
git clone https://github.com/Slimtrat/skibidy-plant.git
cd skibidy-plant

python -m venv .venv
.venv\Scripts\Activate.ps1

python -m pip install -e ".[dev]"
Copy-Item .env.example .env

pytest
```

### Run the Studio

```powershell
python -m tools.run_studio
```

### Desktop application

```powershell
python -m pip install -e ".[desktop]"
python -m apps.desktop
```

---

## Current production pipeline

```text
source text
    ↓
Ollama Director
    ↓
validated Shot JSON
    ↓
3 ComfyUI poses
    ↓
human review
    ↓
LTX multi-guide animation
    ↓
clip.mp4
    ↓
voice + music + frames + subtitles
    ↓
episode.mp4
```

Every stage can be replaced with an external artifact.

### Production documentation

- [`docs/episode-production-contract.md`](docs/episode-production-contract.md): contract between story, performance, poses, fantasy frame, sound and subtitles.
- [`docs/narrative-coherence.md`](docs/narrative-coherence.md): consistency rules, local AI committee from business nodes and human gate.

---

## Collaboration

The project is still young and its architecture is evolving quickly.

Contributions are particularly welcome in the following areas.

### Frontend / UX

- interactive graph;
- animated nodes and edges;
- hierarchical navigation;
- breadcrumb navigation;
- Project Explorer;
- Asset Drawer;
- contextual inspector;
- dependency visualization.

### Backend

- Series / Episode / Shot models;
- narrative APIs;
- dependency graph;
- versioning;
- production queue;
- artifact management;
- continuity validation.

### Narrative AI

- Director / Showrunner prompts;
- series writer;
- episode writer;
- consistency reviewer;
- narrative-state summaries;
- character relationships and arcs.

### Media generation

- ComfyUI;
- SDXL workflows;
- LTX Video;
- visual continuity;
- character references;
- TTS;
- music;
- sound design;
- FFmpeg.

### Tests / architecture

- graph contracts;
- API tests;
- Pydantic validation;
- model migrations;
- integration tests;
- documentation.

---

## How to contribute

### 1. Start with the issues

The main architectural work is already split into GitHub issues.

Good entry points include:

- **#1** Series → Episode → Shot navigation
- **#2** Canonical Bible
- **#3** Director → Writer → General Reviewer
- **#4** Complete Episode creation workflow
- **#5** Dynamic multi-scope graph
- **#6** Object-oriented navigation UX
- **#7** Interactive onboarding
- **#8** Versioning and variants
- **#9** Dependency / stale tracking
- **#10** Asset Drawer
- **#11** Production queue
- **#12** Project Explorer
- **#13** Organic blue/orange graph propagation

Issues:
https://github.com/Slimtrat/skibidy-plant/issues

### 2. Create a branch

```bash
git checkout -b feature/feature-name
```

### 3. Keep pull requests focused

A pull request should ideally:

- solve one responsibility;
- avoid unrelated refactors;
- include tests when relevant;
- explain architectural decisions;
- preserve existing workflows.

### 4. Run tests

```bash
pytest
```

---

## Contribution principles

When adding a feature:

1. **preserve manual editing paths**;
2. **never force a specific AI engine**;
3. **never automatically regenerate artifacts without user intent**;
4. **keep artifact provenance**;
5. **avoid implicit dependencies**;
6. **prefer small modules over monolithic files**;
7. **preserve existing pipeline compatibility whenever possible**.

---

## Roadmap

### Phase 1 — Narrative navigation

```text
Series
  ↓
Episode
  ↓
Shot
```

### Phase 2 — Bible and continuity

```text
Characters
Relationships
Locations
Story state
```

### Phase 3 — Dynamic graph engine

```text
Graph DTO
Scopes
Containers
Focus paths
```

### Phase 4 — Reliable production

```text
Versioning
Stale dependencies
Asset Drawer
Production queue
```

### Phase 5 — Full studio

```text
Narrative
Image
Video
Voice
Music
Editing
Export
```

---

## License

This repository does not currently define an explicit software license.

Before broad external contribution and code reuse, a license should be selected and added to the repository.
