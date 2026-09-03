# Contrat de production d’un épisode

Le scénario fournit des intentions structurées. Le pipeline reste responsable des poses,
de l’animation, de la voix, de la musique, des cadres, des sous-titres et du master final.

## Trois poses par plan

Un plan actif peut décrire exactement trois poses. Elles sont générées séparément puis
injectées dans LTX aux frames correspondantes grâce à `LTXVAddGuide` :

```json
{
  "visual_beats": [
    {"id": "start", "at": 0, "description": "pose et décor au début du plan"},
    {"id": "middle", "at": 0.45, "description": "impact ou changement principal"},
    {"id": "end", "at": 1, "description": "pose de sortie et réaction du décor"}
  ]
}
```

Le Studio affiche les trois images dans un filmstrip. Sans `visual_beats`, l’ancien mode
à une image reste compatible. Deux poses validées manuellement peuvent aussi être ajoutées :

```powershell
python -m tools.generate_shot plan.json `
  --from-keyframe debut.png `
  --guide-keyframe milieu.png `
  --guide-keyframe fin.png
```

## Direction d’acteur par réplique

Le champ `performance` conserve l’intention littéraire et expose des paramètres mesurables
au moteur de voix :

```json
{
  "dialogue": {
    "speaker": "character-id",
    "text": "Réplique finale.",
    "performance": {
      "intention": "ce que le personnage cherche à obtenir",
      "emotion": "émotion jouée et sous-texte",
      "intensity": 0.7,
      "pace": 0.2,
      "pitch": -0.1,
      "volume": 0.05,
      "pause_before_seconds": 0.15,
      "pause_after_seconds": 0.25
    }
  }
}
```

`pace`, `pitch` et `volume` vont de `-1` à `1`. Le mode `auto` reste local et utilise
SAPI sous Windows. Le backend neural est volontaire (`--tts edge`) car il transmet le
texte au service de synthèse correspondant ; il n’est jamais sélectionné automatiquement.
Les voix trop longues sont accélérées sans modifier leur hauteur, jusqu’à la limite qualité
`max_time_fit_speed` du plan audio (1,65× par défaut). Au-delà, le build échoue et demande
un retiming au lieu de livrer une voix précipitée.

## Cadre fantasy et cartons

`presentation-plan.json` applique un asset transparent identique à certains plans et peut
graver un carton narratif sans le demander au modèle d’image :

```json
{
  "schema_version": 1,
  "frame_asset": "../../../assets/frames/cadre-des-venins.png",
  "framed_shots": ["S01E001-S01", "S01E001-S08"],
  "captions": {
    "S01E001-S01": "Texte du carton d’ouverture"
  },
  "caption_positions": {
    "S01E001-S01": "center"
  }
}
```

Les positions admises sont `top`, `center` et `bottom`.

## Audio et sous-titres

Si `music.wav` manque, le pipeline compose localement une valse botanique sombre,
déterministe et calée à la durée de l’épisode. La musique est duckée sous les dialogues.
Les sous-titres SRT sont à la fois gravés dans l’image, donc visibles par défaut, et conservés
comme piste `mov_text` désactivable.
