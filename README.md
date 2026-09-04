# La Serre des Venins

Studio local hybride de production narrative assistée par IA. Une source texte
devient un `Shot` modifiable grâce à un modèle Ollama local, puis une keyframe et
un clip LTX via une instance ComfyUI externe. Chaque étape accepte soit un modèle
local, soit un artefact texte, image, audio ou vidéo préparé ailleurs.

```text
source texte -> Ollama Director -> Shot JSON validé -> 3 poses ComfyUI
              -> validation humaine -> LTX multi-guides -> clip.mp4
              -> voix + musique + cadres + sous-titres -> episode.mp4
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

### Application Windows native

Le shell desktop ouvre le Studio dans une fenêtre native WebView2, sans onglet de
navigateur. Il réserve automatiquement un port local libre, démarre FastAPI en
arrière-plan puis arrête proprement le serveur lorsque la dernière fenêtre est
fermée. Les panneaux peuvent ensuite être détachés dans de vraies fenêtres via
l'API locale `pywebview.api.open_panel(...)` exposée au front.

```powershell
python -m pip install -e ".[desktop]"
python -m apps.desktop
# ou, après installation : serre-desktop
```

En développement, les projets restent dans le dossier courant. L'EXE utilise
`%LOCALAPPDATA%\SerreStudio` pour les projets, sorties, workflows, préférences
WebView2 et journaux (`logs\desktop.log`). Un emplacement isolé peut être choisi
avec `--data-dir C:\chemin\studio`. `--port 0` est la valeur par défaut et évite
les collisions avec un ancien serveur sur le port 8000.

La construction locale de l'EXE nécessite l'extra `build`; l'installateur exige
également Inno Setup 6 :

```powershell
python -m pip install -e ".[desktop,build]"
python -m tools.build_desktop
python -m tools.build_desktop --installer
```

Le workflow **Windows desktop** vérifie le projet, produit
`SerreStudio.exe`, une archive portable, un installateur utilisateur et leurs
sommes SHA-256. Chaque exécution publie un artefact téléchargeable; un tag `v*`
publie aussi ces fichiers dans une GitHub Release.

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
  keyframe-guide-1.png
  keyframe-guide-2.png
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

Voir [`docs/episode-production-contract.md`](docs/episode-production-contract.md) pour le
contrat entre scénario, intentions de jeu, poses multiples, cadre fantasy, musique et
sous-titres visibles.

## Studio hybride

Les slots `story`, `shot`, `keyframe`, `audio` et `video` partagent un contrat
d'artefact traçable. Les keyframes et clips importés peuvent donc remplacer les
générations sans modifier les étapes suivantes. Les imports et workflows locaux
sont stockés sous des chemins ignorés par Git.

Le contenu créatif (personnages, relations, secrets et épisodes) vit dans
`.private/`, ignoré par le dépôt public. Le Studio charge automatiquement ce
catalogue local. Ce dossier peut être son propre dépôt Git privé ou local.

Le serveur peut également être lancé sans ouverture automatique du navigateur :

```powershell
python -m tools.run_studio --no-browser
```

Une release locale versionnée peut être construite et publiée sur le Bureau avec :

```powershell
python -m tools.build_desktop --publish-desktop
```

La copie courante est `La Serre des Venins/SerreStudio.exe`; les releases immuables
sont rangées dans `versions/<version>` et l’ancien patch courant dans `versions-old`.

- `GET /health` : processus disponible ;
- `GET /ready` : workflows, nœuds et modèles ComfyUI vérifiés ;
- `POST /api/workflows/generate` : création des graphes privés ;
- `GET /api/narrative/status` : modèles Ollama disponibles ;
- `POST /api/narrative/shot` : proposition et stockage d'un Shot validé ;
- `GET /api/episodes` : catalogue local lu depuis `.private/` ;
- `GET /api/episodes/{id}` : épisode, casting canonique et plans validés ;
- `POST /api/models/install` : déplacement contrôlé des modèles téléchargés ;
- `PUT /api/assets/{shot}/{slot}` : branchement d'un artefact manuel ;
- `POST /api/jobs` : génération asynchrone suivie étape par étape.

Voir [`docs/architecture.md`](docs/architecture.md) pour les limites volontaires
de cette milestone.
