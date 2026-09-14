# Bootstrap sur Windows vierge

Le parcours supporté part de `SerreStudio.exe`. Node.js est requis uniquement pour construire le produit, jamais pour l’exécuter. Le wizard conserve les fonctions manuelles disponibles si la préparation automatique est refusée ou impossible.

## Frontières gérées

| Besoin | Stratégie | Portée |
| --- | --- | --- |
| `comfy-cli` et Python associé | `uv` 0.12.13 téléchargé depuis la release Astral officielle, archive x64 vérifiée par SHA-256, puis `comfy-cli` 1.20.0 épinglé | `.la-serre-runtime/tools`, sans modification du `PATH` |
| ComfyUI | workspace possédé par La Serre et préparé par le CLI isolé | `.la-serre-runtime/comfyui` |
| Modèles ComfyUI | téléchargements atomiques contrôlés par le manifeste du pack | dossier géré, ou dossier personnel uniquement après choix explicite |
| Ollama | archive Windows x64 officielle 0.34.0 vérifiée par SHA-256, exécutable et modèles isolés | `.la-serre-runtime/tools/ollama`, sans installateur système |
| FFmpeg + FFprobe | build Windows essentials 9.0.1 recommandé depuis ffmpeg.org, archive Gyan vérifiée par SHA-256 | `.la-serre-runtime/tools/ffmpeg`, sans modification du `PATH` |

Le wizard expose avant consentement la version, la source, la licence, le checksum et la destination de chaque prérequis géré. Un refus ne crée aucun job et ne déclenche aucun téléchargement.

## Reprise et intégrité

Les archives d’outils sont téléchargées dans un fichier `.part`, validées avant extraction, refusées si elles tentent de sortir du dossier de staging, puis publiées par renommage. Un reçu conserve la source, la version, le checksum d’archive et le checksum de l’exécutable extrait. Une reprise réutilise uniquement un outil dont le reçu et l’exécutable concordent ; sinon Réparer reconstruit sa version isolée.

Après la première installation d’Ollama, le wizard demande de fermer puis rouvrir La Serre. Au redémarrage, le superviseur vérifie le reçu et le hash avant de lancer `ollama serve`, puis le job persistant reprend l’installation du modèle sans retélécharger l’archive. Aucun service ni `PATH` global n’est modifié.

Les tests CI utilisent des archives et processus factices : aucun outil, modèle ou poids réel n’y est téléchargé.

Dans le binaire, l’essai final réinspecte les composants requis avec les adaptateurs embarqués. Il n’appelle jamais les commandes de développement `python`, `pytest` ou `node`. Hors binaire, ces contrôles de développement restent exécutés en complément.
