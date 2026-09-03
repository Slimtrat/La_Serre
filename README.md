# La Serre des Venins

Studio local hybride de production narrative assistée par IA. La première
tranche verticale transforme un `Shot` sémantique en keyframe puis en clip LTX
via une instance ComfyUI externe. Chaque étape est conçue pour accepter soit un
modèle local, soit un artefact texte, image, audio ou vidéo préparé ailleurs.

```text
shot.json -> Pydantic -> PromptBuilder -> ComfyUI keyframe
          -> validation possible -> ComfyUI/LTX i2v -> clip.mp4
```

Le moteur narratif, le Director, les workflows de génération et la
post-production restent indépendants. Aucun modèle ni custom node ComfyUI n'est
embarqué dans ce dépôt.

## Installation

Prérequis : Python 3.12+ et ComfyUI accessible localement. Aucun workflow n'est
à construire manuellement : le Studio génère les graphes SDXL et LTX avec les
nœuds natifs de ComfyUI, puis indique les modèles manquants.

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
pytest
```

Lancez l'interface :

```powershell
python -m tools.run_studio
```

Dans **Réglages ComfyUI**, cliquez sur **Créer mes workflows**, téléchargez les
modèles affichés dans les dossiers indiqués, puis choisissez pour chaque étape
entre génération locale et drag-and-drop.

La commande sans interface reste disponible :

```powershell
python -m tools.generate_shot examples/shot.json
```

Sortie attendue :

```text
output/S01E001-S01/
  keyframe.png
  clip.mp4
  generation.json
  prompt.txt
```

Pour placer une validation humaine entre les deux étapes :

```powershell
python -m tools.generate_shot examples/shot.json --keyframe-only
python -m tools.generate_shot examples/shot.json `
  --from-keyframe output/S01E001-S01/keyframe.png
```

Les fichiers existants ne sont jamais écrasés sans `--force`. Le seed, les
paramètres, les prompts, les références, les profils, les identifiants ComfyUI
et les artefacts sont consignés dans `generation.json`.

## Studio hybride

Les slots `story`, `shot`, `keyframe`, `audio` et `video` partagent un contrat
d'artefact traçable. Les keyframes et clips importés peuvent donc remplacer les
générations sans modifier les étapes suivantes. Les imports et workflows locaux
sont stockés sous des chemins ignorés par Git.

Le serveur peut également être lancé sans ouverture automatique du navigateur :

```powershell
python -m tools.run_studio --no-browser
```

- `GET /health` : processus disponible ;
- `GET /ready` : workflows, nœuds et modèles ComfyUI vérifiés ;
- `POST /api/workflows/generate` : création des graphes privés ;
- `PUT /api/assets/{shot}/{slot}` : branchement d'un artefact manuel ;
- `POST /api/jobs` : génération asynchrone suivie étape par étape.

Voir [`docs/architecture.md`](docs/architecture.md) pour les limites volontaires
de cette milestone.
