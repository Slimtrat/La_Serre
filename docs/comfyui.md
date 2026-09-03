# Brancher les workflows ComfyUI

ComfyUI reste un service externe, par défaut sur `http://127.0.0.1:8188`.
Le dépôt ne distribue ni modèles, ni checkpoints, ni graphes dépendant d'une
installation particulière.

## 1. Exporter deux graphes exécutables

Dans ComfyUI :

1. validez manuellement un workflow de keyframe et un workflow LTX
   image-to-video sur la machine cible ;
2. activez `Settings > Comfy > Dev Mode > Enable dev mode options` ;
3. exportez chaque workflow avec `Save (API Format)` ;
4. placez les fichiers sous `workflows/local/` (ce dossier est ignoré par Git).

Un fichier API-format est un objet dont les clés sont les identifiants de nœuds
et dont chaque valeur contient au minimum `class_type` et `inputs`. Un workflow
de l'éditeur (`nodes`, `links`, etc.) est rejeté tôt avec un message explicite.

Pour une RTX 5070 12 Go, commencez par le workflow LTX qui fonctionne déjà dans
votre ComfyUI avec offload/quantification, puis mappez-le. Le studio ne force
aucun checkpoint et ne suppose jamais 24 Go de VRAM.

## 2. Déclarer les mappings

Copiez les exemples :

```powershell
New-Item -ItemType Directory -Force workflows/local
Copy-Item workflows/images/keyframe.profile.json.example `
  workflows/local/keyframe.profile.json
Copy-Item workflows/video/ltx-i2v.profile.json.example `
  workflows/local/ltx-i2v.profile.json
```

Dans chaque profil, ajustez `workflow`, puis les `node_id` et `input` d'après le
JSON API exporté. Une liaison facultative (`required: false`) est ignorée si la
valeur source n'existe pas. Les sources disponibles comprennent :

- `prompt`, `negative_prompt`, `seed`, `width`, `height`, `frames`, `fps` ;
- `reference_image` pour la keyframe envoyée au workflow vidéo ;
- `reference_images.<character_id>.<index>` pour les références du `Shot` ;
- `output_prefix`.

Les dimensions de génération restent volontairement inférieures au master
1080x1920. Le rendu final et l'upscale appartiendront à la post-production.

## 3. Vérifier avant une génération coûteuse

```powershell
python -m tools.generate_shot examples/shot.json --dry-run
```

Le dry-run valide le `Shot`, construit les prompts, charge les profils, vérifie
tous les nœuds et écrit les graphes mappés sous `output/<shot>/dry-run/`, sans
contacter ComfyUI.

Le client utilise les routes natives `/prompt`, `/history/{id}`, `/queue`,
`/upload/image`, `/view` et `/interrupt`. Les erreurs de validation de graphe et
d'exécution sont remontées avec le détail fourni par ComfyUI.
