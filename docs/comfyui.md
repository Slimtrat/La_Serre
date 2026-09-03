# ComfyUI sans maintenance manuelle

ComfyUI reste un moteur externe, par défaut sur `http://127.0.0.1:8188`. Le
Studio utilise uniquement ses routes natives et ses nœuds core.

## Installation guidée

1. démarrez ComfyUI ;
2. lancez `python -m tools.run_studio` ;
3. ouvrez **Réglages ComfyUI** ;
4. cliquez sur **Créer mes workflows** ;
5. téléchargez les modèles listés et placez-les dans les dossiers affichés ;
6. rafraîchissez ComfyUI, puis le Studio.

Sur Windows avec ComfyUI Desktop, le Studio surveille aussi le dossier
**Downloads**. Quand un fichier final est disponible, le bouton **Installer les
téléchargements terminés** le déplace vers le bon sous-dossier. Les fichiers
partiels et les placeholders vides sont ignorés.

Le preset `rtx-5070-12gb` crée deux graphes API-format :

- keyframe SDXL, 576×1024, KSampler DPM++ 2M SDE/Karras ;
- LTX-Video 2B image-to-video, rendu court plan par plan avec T5 FP8.

Les graphes, profils et manifestes de modèles sont écrits sous
`workflows/local/`, dossier ignoré par Git. Le code vérifie automatiquement les
nœuds via `/object_info` et les modèles via `/models/{folder}`.

## Modèles proposés

| Rôle | Fichier | Dossier ComfyUI |
|---|---|---|
| Keyframes | `sd_xl_base_1.0.safetensors` | `models/checkpoints/` |
| Vidéo | `ltx-video-2b-v0.9.5.safetensors` | `models/checkpoints/` |
| Texte LTX | `t5xxl_fp8_e4m3fn_scaled.safetensors` | `models/text_encoders/` |

Les liens directs des dépôts de référence sont affichés dans l'interface. Aucun
téléchargement lourd n'est déclenché silencieusement.

## Contrat hybride

Le modèle et l'import manuel produisent le même type d'artefact :

```text
Shot JSON
   ├─ SDXL ───────────┐
   └─ image importée ─┴─> keyframe ─┬─ LTX ───────────┐
                                    └─ vidéo importée ┴─> clip
```

Les slots supplémentaires `story` et `audio` acceptent déjà des fichiers et
sont consignés avec leur taille, type MIME, date et SHA-256. Les futurs moteurs
narratif et TTS se brancheront sur ces contrats, sans changer l'interface.

## Mode avancé

Un workflow personnel exporté en API-format peut toujours être importé. Le
Studio inspecte ses entrées primitives et permet de construire un profil de
mapping, mais cette voie n'est pas nécessaire avec le preset fourni.

Les routes utilisées sont `/system_stats`, `/object_info`, `/models`, `/prompt`,
`/history`, `/queue`, `/upload/image`, `/view` et `/interrupt`.
