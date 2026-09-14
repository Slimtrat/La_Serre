# Contrôles d’intégration et preuves CI

Le workflow `Windows desktop CI` s’exécute sur toutes les pull requests vers `develop` et `main`. Il n’utilise pas de filtre de chemins, afin qu’un check configuré comme obligatoire ne reste jamais indéfiniment en attente.

## Checks stables

| Nom du check | Preuve | Exécution |
| --- | --- | --- |
| `Frontend quality and build` | lint, typecheck, tests composants, frontières et bundle | toute PR |
| `Python quality and tests` | Ruff, mypy, OpenAPI, pytest et génération mockée | toute PR |
| `Browser integration (FastAPI + persistence)` | Edge réel, FastAPI isolé, stockage temporaire, trace et logs | toute PR |
| `Build release candidates` | PyInstaller, version, lancement du binaire, santé API et assets React | dispatch, tag ou push sur `main` |

Le benchmark GPU réel n’est pas exécuté dans GitHub Actions. Il doit rester signalé comme absent, jamais assimilé aux doubles de ComfyUI/TTS/FFmpeg.

Le commentaire persistant de PR interroge les check-runs du SHA courant. Il affiche `queued`, `in_progress`, la conclusion réelle, ou `en attente` si aucun check n’existe encore. Le packaging apparaît donc explicitement `skipped` sur une PR ordinaire.

## Harnais navigateur

`python -m tools.run_browser_integration` choisit un port loopback libre, démarre le vrai FastAPI avec des répertoires privés/output/downloads temporaires, attend `/health`, lance chaque scénario Node avec un délai maximal et arrête toujours le serveur. Il publie :

- `fastapi.log` ;
- `playwright.log` ;
- une trace Playwright ;
- une capture plein écran en cas d’échec.

Le scénario `guided_casting_integration.mjs` ne route ni ne remplace aucune API métier. Il part d’une Bible vide, édite et promeut une fiche, importe une vraie image, approuve le maître et vérifie la persistance après rechargement. Les moteurs externes ne sont pas appelés.

## État administratif observé le 14 septembre 2026

- `develop` : aucune protection classique et aucun ruleset applicable ; aucun check n’est donc effectivement obligatoire.
- `main` : ruleset actif imposant une pull request et interdisant suppression/force-push, mais aucun status check requis.

Le YAML rend les checks disponibles et stables, mais ne remplace pas cette configuration administrative. Un mainteneur doit ajouter au ruleset de `develop` et de `main` les trois checks exécutés sur toute PR. `Build release candidates` ne doit pas être obligatoire sur une PR ordinaire puisqu’il est volontairement sauté hors release.
