# Pack de capacités Tentafruit local 12 Go

`tentafruit-local-12gb-v1` est l’unique configuration produit officiellement
supportée pour le jalon local. Son manifeste versionné se trouve dans
`packs/tentafruit-local-12gb-v1.json`. Il décrit les moteurs, modèles, nodes,
workflows, destinations, volumes disque, licences, politiques de checksum et
smoke tests nécessaires au golden path.

Le manifeste décrit une capacité; il n’installe rien. Les téléchargements de
poids restent toujours explicites. La saisie et l’import manuels restent
disponibles lorsque le pack est incomplet.

## Diagnostic read-only

Le Studio expose :

- `GET /api/runtime-packs/current` pour le pack supporté;
- `GET /api/runtime-packs/tentafruit-local-12gb-v1` pour son identifiant stable.

Le diagnostic fonctionne avec Ollama ou ComfyUI arrêtés. Dans ce cas il retourne
`incomplete`, marque le moteur `unavailable`, laisse les nodes `unknown`, inspecte
quand même les fichiers présents dans tous les chemins ComfyUI supportés et donne
des actions concrètes. Il ne démarre, ne déplace et ne télécharge rien.

Les états globaux sont :

- `ready` : matériel compatible et tous les composants requis détectés;
- `incomplete` : matériel compatible, mais moteur, modèle, node ou workflow absent;
- `incompatible` : VRAM sous 12 Go ou disque libre inférieur aux téléchargements
  manquants plus 15 Gio de réserve de travail.

Le preset vise un GPU NVIDIA de 12 Go et 32 Go de RAM système. Une VRAM inconnue
reste `incomplete` et produit une action de vérification; elle n’est jamais
présumée compatible.

## Rôles stables et compatibilité

Les workflows utilisent les rôles `keyframe.sdxl`, `video.ltx-2b` et
`text-encoder.t5-fp8`. `WorkflowFactory.requirements` demeure disponible pour les
projets 0.2.13, mais ses valeurs sont maintenant projetées depuis le manifeste.
Les noms de fichiers et le preset `rtx-5070-12gb` restent inchangés.

Les templates publient `capability_role` au lieu de choisir une URL. Les URLs,
licences et destinations sont la responsabilité du pack. Les rôles FLUX et LoRA
sont optionnels : l’import manuel reste possible, et FLUX.1 dev exige notamment
l’acceptation de sa licence non commerciale.

## Licences et checksums

Chaque composant expose sa licence et son statut d’usage commercial. Qwen3 4B
est associé au digest du manifeste Ollama. Lorsqu’une source ne fournit pas de
SHA-256 stable dans ce jalon, la valeur reste explicitement `null` avec
`source-declared`; le Studio ne prétend donc pas avoir vérifié un hash absent.
Un SHA-256 renseigné est contrôlé pendant l’inspection du fichier installé.

Avant tout usage ou redistribution, ouvre le lien de licence affiché par l’API.
En particulier, les poids LTX, FLUX et les LoRA choisis par l’utilisateur peuvent
avoir des conditions distinctes du code des moteurs.

## Vérifications sans téléchargement

```powershell
pytest tests/test_capability_packs.py tests/test_workflow_factory.py
python -m tools.evaluate_narrative_tasks --provider fake
```

Les smoke checks du manifeste sont déclaratifs et ne sont jamais lancés par la
route de diagnostic. Leur exécution reste une action explicite de développement
ou de validation.
