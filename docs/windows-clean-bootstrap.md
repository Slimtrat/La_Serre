# Bootstrap sur Windows vierge

Le parcours supporté part de `SerreStudio.exe`. Node.js est requis uniquement pour construire le produit, jamais pour l’exécuter. Le wizard conserve les fonctions manuelles disponibles si la préparation automatique est refusée ou impossible.

## Frontières gérées

| Besoin | Stratégie | Portée |
| --- | --- | --- |
| `comfy-cli` et Python associé | `uv` 0.12.13 téléchargé depuis la release Astral officielle, archive x64 vérifiée par SHA-256, puis `comfy-cli` 1.20.0 épinglé | `.la-serre-runtime/tools`, sans modification du `PATH` |
| ComfyUI | workspace possédé par La Serre et préparé par le CLI isolé | `.la-serre-runtime/comfyui` |
| Modèles ComfyUI | téléchargements atomiques contrôlés par le manifeste du pack | dossier géré, ou dossier personnel uniquement après choix explicite |
| Ollama | détection d’une installation existante ; bootstrap géré encore à fermer dans #62 | aucune modification silencieuse |
| FFmpeg | utilisé par les pipelines média ; bootstrap géré encore à fermer dans #62 | aucune modification silencieuse |

Le wizard expose avant consentement la version, la source, la licence, le checksum et la destination de chaque prérequis géré. Un refus ne crée aucun job et ne déclenche aucun téléchargement.

## Reprise et intégrité

Les archives d’outils sont téléchargées dans un fichier `.part`, validées avant extraction, refusées si elles tentent de sortir du dossier de staging, puis publiées par renommage. Un reçu conserve la source, la version, le checksum d’archive et le checksum de l’exécutable extrait. Une reprise réutilise uniquement un outil dont le reçu et l’exécutable concordent ; sinon Réparer reconstruit sa version isolée.

Les tests CI utilisent des archives et processus factices : aucun outil, modèle ou poids réel n’y est téléchargé.
