# Politique de sécurité

[README](README.md) · [Contribuer](CONTRIBUTING.md) · [Licence](LICENSE)

La Serre est une alpha locale. Elle manipule des contenus créatifs privés, lance des moteurs locaux et lit des fichiers importés ; ces frontières méritent la même attention que le code applicatif.

## Versions suivies

Les correctifs visent la dernière version publiée et la branche `develop`. Aucune branche LTS n’est maintenue pour le moment.

## Signaler une vulnérabilité

N’ouvrez pas d’issue publique contenant une vulnérabilité exploitable, un secret, un chemin personnel ou un fichier de projet.

1. utilisez **Security → Report a vulnerability** dans le dépôt GitHub ;
2. décrivez la version, l’impact, les prérequis et une reproduction minimale ;
3. retirez les Bibles, prompts, médias, tokens et chemins locaux des captures ou journaux ;
4. laissez le temps de confirmer et corriger le problème avant publication.

Si le signalement privé GitHub n’est pas disponible, ouvrez une issue sans détail sensible pour demander un canal privé. Ne joignez jamais l’exploit ou les données concernées à cette issue.

## Modèle de menace local

- l’API écoute sur `127.0.0.1` par défaut ; ne l’exposez pas directement à Internet ;
- ComfyUI et Ollama sont des services séparés : maintenez-les à jour et limitez leur accès au réseau local nécessaire ;
- un workflow ComfyUI, un modèle, un plugin ou un fichier importé est une entrée non fiable ;
- les prompts et documents peuvent contenir des instructions malveillantes : ils restent des données, jamais des commandes système ;
- `.private/`, `projects/`, `output/` et `logs/` peuvent contenir des informations sensibles ;
- l’installation d’un modèle tiers n’accorde aucun droit sur ses données, sa sortie ou son usage commercial.

## Ce que le projet garantit actuellement

- validation stricte des principaux contrats JSON avec Pydantic ;
- stockage privé séparé du code et ignoré par Git ;
- écoute locale par défaut ;
- absence de téléchargement silencieux de poids lourds ;
- validation humaine avant propagation des principaux artefacts ;
- tests automatisés des API, contrats, chemins de fichiers et parcours critiques.

Ces garanties ne remplacent pas un audit de sécurité. N’utilisez pas l’alpha actuelle pour exposer directement des projets confidentiels à des utilisateurs non fiables ou à Internet.
