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

Le preset local renforcé ne génère plus ces images indépendamment. La pose du milieu est
une passe SDXL img2img dérivée de la pose initiale, puis la pose finale dérive de celle du
milieu. Quand le plan précédent existe, sa dernière pose amorce aussi le plan suivant. Le
décor, la palette et l’identité restent donc dans une même chaîne visuelle. LTX reçoit ensuite
les trois poses avec un guidage spatio-temporel actif et une adhérence forte aux images.

Pendant le calcul, l’API publie chaque image dès son téléchargement. Le nœud actif du graphe
affiche ainsi `1/3`, `2/3`, `3/3`, puis remplace le filmstrip par le clip final.

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
`max_time_fit_speed` du plan audio (1,10× par défaut). Au-delà, le build échoue et demande
un retiming au lieu de livrer une voix précipitée.

Deux répliques d’un même plan ne peuvent pas se chevaucher implicitement. Leurs offsets et
silences doivent créer des fenêtres distinctes ; sinon le montage échoue avant FFmpeg.

## Statuts de sortie vérifiables

Le fichier `episode-generation.json` distingue trois résultats :

- `ANIMATIC` lorsqu’au moins un plan utilise une image fixe ;
- `PREVIEW` lorsque les clips existent mais que l’épisode narratif ou leur provenance ne
  permet pas une release ;
- `FINAL` uniquement avec un épisode approuvé, des vidéos importées ou reliées à un
  manifeste `GENERATED`, et un contrôle média satisfaisant.

Seul `FINAL` porte `quality.release_eligible=true`. Un master figé sur au moins 90 % de sa
durée est refusé comme `FINAL`. Les hashes du scénario, de sa source narrative, des médias
et des sorties rendent les corrections manuelles visibles au lieu de les masquer.

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

### Musique d’ambiance choisie

Dans « Assembler l’épisode », l’utilisateur peut conserver la piste actuelle, produire une
piste instrumentale avec ACE-Step 1.5 ou importer un fichier WAV, MP3, FLAC, OGG ou M4A.
L’import est normalisé en WAV stéréo 48 kHz par FFmpeg. Une confirmation explicite des
droits commerciaux et une origine/licence sont obligatoires pour chaque import.

Le Studio conserve `output/<episode>/music.wav` et `music-source.json` (source, licence,
empreinte SHA-256, date, et pour ACE-Step prompt/seed/identifiant de tâche). Une nouvelle
piste invalide le master antérieur ; celui-ci et sa provenance sont archivés avant
remplacement. La piste peut être préécoutée dans la fenêtre de finalisation.

ACE-Step tourne dans un processus local distinct sur `http://127.0.0.1:8001` par défaut
(`ACE_STEP_URL` pour changer l’adresse). Le Studio n’effectue aucun téléchargement caché :
installer ACE-Step séparément selon son [guide officiel](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/INSTALL.md),
lancer son serveur REST avec `uv run acestep-api`, puis vérifier `/health` et `/v1/models`.
Le dossier de modèles ACE-Step peut être défini avec `ACESTEP_CHECKPOINTS_DIR`. Garder
le service lié à `127.0.0.1` ; l’intégration n’accepte pas d’adresse distante.

Les modèles audio ne suffisent pas, à eux seuls, à autoriser la vente d’un épisode : les
voix de référence, musiques importées et autres médias doivent avoir leurs droits propres.
