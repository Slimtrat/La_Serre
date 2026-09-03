# La Serre des Venins

Studio local de production narrative assistée par IA. La première tranche
verticale transforme un `Shot` sémantique en keyframe puis en clip LTX via une
instance ComfyUI externe.

```text
shot.json -> Pydantic -> PromptBuilder -> ComfyUI keyframe
          -> validation possible -> ComfyUI/LTX i2v -> clip.mp4
```

Le moteur narratif, le Director, les workflows de génération et la
post-production restent indépendants. Aucun modèle ni custom node ComfyUI n'est
embarqué dans ce dépôt.

## Installation

Prérequis : Python 3.12+, ComfyUI accessible localement, et deux workflows
fonctionnels exportés en **API format** (keyframe et LTX image-to-video).

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
pytest
```

Configurez les deux profils de workflow en suivant
[`docs/comfyui.md`](docs/comfyui.md), puis lancez :

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

## API locale

Le bootstrap FastAPI expose uniquement les sondes nécessaires à ce stade :

```powershell
uvicorn apps.api.main:app --reload
```

- `GET /health` : processus disponible ;
- `GET /ready` : configuration présente et ComfyUI joignable.

Voir [`docs/architecture.md`](docs/architecture.md) pour les limites volontaires
de cette milestone.
