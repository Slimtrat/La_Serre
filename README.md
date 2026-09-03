# La Serre des Venins

Studio local hybride de production narrative assistée par IA. Une source texte
devient un `Shot` modifiable grâce à un modèle Ollama local, puis une keyframe et
un clip LTX via une instance ComfyUI externe. Chaque étape accepte soit un modèle
local, soit un artefact texte, image, audio ou vidéo préparé ailleurs.

```text
source texte -> Ollama Director -> Shot JSON validé -> ComfyUI keyframe
              -> validation humaine -> ComfyUI/LTX i2v -> clip.mp4
```

Le moteur narratif, le Director, les workflows de génération et la
post-production restent indépendants. Aucun modèle ni custom node ComfyUI n'est
embarqué dans ce dépôt.

## Installation

Prérequis : Python 3.12+, ComfyUI accessible localement et, pour le Director,
Ollama avec au moins un modèle installé. Aucun workflow n'est à construire
manuellement : le Studio génère les graphes SDXL et LTX avec les nœuds natifs de
ComfyUI, puis indique et installe les téléchargements de modèles terminés.

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
modèles affichés puis utilisez **Installer les téléchargements terminés**. Dans
l'étape Histoire, choisissez un modèle Ollama et cliquez sur **Proposer le
Shot**. Le JSON reste éditable avant toute génération. Chaque étape peut aussi
basculer vers le drag-and-drop.

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
- `GET /api/narrative/status` : modèles Ollama disponibles ;
- `POST /api/narrative/shot` : proposition et stockage d'un Shot validé ;
- `POST /api/models/install` : déplacement contrôlé des modèles téléchargés ;
- `PUT /api/assets/{shot}/{slot}` : branchement d'un artefact manuel ;
- `POST /api/jobs` : génération asynchrone suivie étape par étape.

Voir [`docs/architecture.md`](docs/architecture.md) pour les limites volontaires
de cette milestone.
