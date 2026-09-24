# États du parcours Studio

`StudioJourneySnapshot` est un read model conservateur. Il ne remplace ni les registres métier ni les validations humaines : il explique quelle action est possible à partir de leur état persisté.

## Table de décision

| Étape | État annoncé | Preuve requise | Capacité nécessaire |
| --- | --- | --- | --- |
| Casting narratif | `ready` | personnage canonique dans la Bible | aucune |
| Casting visuel | `approved` | un maître visuel approuvé pour chaque personnage canonique | import manuel ou ComfyUI |
| Production partielle | `ready` ou `blocked` | certains médias requis manquent ou attendent une validation | ComfyUI seulement pour générer ; import toujours possible |
| Production assemblable | `completed` | chaque plan possède une vidéo approuvée et une voix si le plan contient un dialogue | aucune si les médias sont déjà présents |
| Release à relire | `ready` | master `FINAL` non vide, à jour et issu de sources assemblables | aucune |
| Release exportée | non anticipée par ce snapshot | futur `ReleaseCandidate` approuvé de TF09 | définie par TF09 |

Un fichier isolé ou un compteur global ne prouve jamais la complétude. Une keyframe, même
approuvée, ne compte pas comme vidéo. Un clip généré doit correspondre au hash d’un manifeste
`GENERATED`, et un `episode.mp4` n’est disponible pour la release que si son manifeste annonce
`FINAL`. Les erreurs, jobs et impacts sont filtrés sur l’épisode actif. Une indisponibilité de
runtime bloque seulement la génération correspondante : elle ne retire pas la validité des
imports persistés.

## Codes de blocage stables

- `VISUAL_MASTER_REQUIRED` : fiche canonique valide, apparence maître encore absente.
- `IMAGE_VIDEO_RUNTIME_UNAVAILABLE` : ComfyUI ou les modèles/workflows requis manquent ;
  l’import manuel reste proposé.
- `EPISODE_APPROVAL_REQUIRED` : le scénario doit être approuvé avant une release.
- `HUMAN_APPROVAL_REQUIRED` : média généré présent mais décision humaine absente ou obsolète.
- `PRODUCTION_INCOMPLETE` : médias requis manquants ou non approuvés.
- `MASTER_REQUIRED` : sources assemblables, master final encore absent.

Les capacités `narrative`, `image`, `video` et `manual_import`, ainsi que la structure `production`, sont calculées côté backend et exposées dans le DTO. React ne recalcule pas ces règles.
