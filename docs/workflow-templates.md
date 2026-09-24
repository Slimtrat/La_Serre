# Templates ComfyUI et continuité visuelle

Le Studio possède un catalogue de workflows généré par le code. Il ne dépend
pas de graphes dessinés à la main et difficiles à reproduire. Chaque template
contient :

- un graphe ComfyUI au format API ;
- un profil qui relie les champs du Studio aux entrées du graphe ;
- un manifeste avec les modèles, les nœuds, les réglages et les limites ;
- sa position dans la chaîne de continuité.

Pour régénérer le catalogue :

```powershell
python -m tools.generate_workflow_templates
```

Les artefacts sont écrits dans `workflows/templates/`. Ils sont versionnés afin
que le Studio, les tests et ComfyUI utilisent exactement la même recette.

## Chaîne recommandée

```text
Bible personnage + plante réelle
        │
        ▼
flux-schnell-character-master-v1
Référence maître approuvée
        │
        ▼
sdxl-scene-anchor-v1
Image de début du plan
        │
        ├──► sdxl-adjacent-pose-v1 ──► image du milieu
        │               │
        │               └────────────► image de fin
        ▼
ltx-triptych-animation-v1
Plan animé guidé au début, au milieu et à la fin
```

La référence maître fixe la géométrie botanique, le visage humanisé, les
proportions adultes, la matière végétale, la tenue et les détails signatures.
La première image d'une scène reprend ces invariants. Les deux poses suivantes
réinjectent l'image précédente avec un débruitage modéré. LTX reçoit enfin les
trois poses aux images 0, 48 et 96.

## Référence FLUX Schnell (parcours recommandé)

Le parcours utilise désormais le checkpoint unique
[FLUX.1-schnell FP8 de Comfy-Org](https://huggingface.co/Comfy-Org/flux1-schnell/blob/main/flux1-schnell-fp8.safetensors)
dans `models/checkpoints/`. Le fichier fait 17,2 Go et son empreinte SHA-256
est exposée dans le catalogue. Les poids sont sous licence Apache 2.0. La
recette suit le workflow officiel ComfyUI : 4 étapes, Euler/simple et CFG 1.
Elle produit une référence à approuver, pas un verrouillage automatique
d'identité sur tout un épisode.

Le Studio affiche la taille, la licence et le lien de téléchargement dans
**Réglages → Recettes visuelles**. Les poids ne sont jamais téléchargés
silencieusement.

Une fois le checkpoint installé et visible dans ComfyUI, une référence à
relire peut aussi être produite en CLI :

```powershell
python -m tools.generate_character_master --prompt "Description visuelle du personnage" --output artifacts/character-master.png --seed 42
```

La commande refuse d'écraser un fichier existant sans `--force`. L'image
obtenue reste un candidat : elle doit être contrôlée avant d'être ajoutée à la
Bible visuelle du projet.

## Ancienne recette FLUX dev

Le template `flux-character-master-v1` reste disponible pour les projets existants,
mais il n'est plus le premier nœud du parcours recommandé. Il reprend les idées utiles du workflow
fourni dans `COMFYUI.rar`, sans reprendre son personnage ni son prompt privé :

- `flux1-dev-fp8.safetensors` avec `CheckpointLoaderSimple` ;
- `FLUX_3Dcartoon.safetensors` à 0,20 sur le modèle et le CLIP ;
- 720×1280, 24 étapes, Euler/simple ;
- CFG 1 et `FluxGuidance` à 3,5 ;
- condition négative neutralisée avec `ConditioningZeroOut`.

Le poids faible de la LoRA conserve l'ambiance 3D cartoonesque tout en évitant
un visage de mascotte trop enfantin. Les valeurs LoRA, guidance, étapes,
résolution et seed peuvent être remplacées par le profil sans modifier le
graphe.

Les poids FLUX.1-dev sont soumis à une licence non commerciale : cette recette
ne convient pas au chemin produit commercial par défaut.

Ce template produit une référence, mais il ne constitue pas à lui seul un
verrouillage d'identité : il ne contient ni IP-Adapter, ni PuLID, ni FLUX Redux.
La continuité actuelle repose donc sur une référence maître approuvée, une
description d'identité stable et l'enchaînement img2img des poses. Un futur
template d'identité par image pourra s'ajouter au catalogue quand ses nœuds et
ses modèles seront effectivement installés.

## Modèles optionnels

Les modèles FLUX ne sont pas ajoutés aux prérequis globaux de l'application.
Le Studio reste donc opérationnel avec SDXL et LTX pendant leur téléchargement.
Le manifeste du template déclare séparément :

| Rôle | Fichier | Dossier ComfyUI |
|---|---|---|
| Référence personnage | `flux1-dev-fp8.safetensors` | `models/checkpoints/` |
| Style 3D cartoon | `FLUX_3Dcartoon.safetensors` | `models/loras/` |

ComfyUI doit être redémarré ou rafraîchi après l'ajout des fichiers.
