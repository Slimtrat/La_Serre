# Développement du frontend React

Le Studio adopte React, TypeScript et Vite progressivement, sous forme d’îlots. FastAPI
reste le serveur de l’application et continue de charger l’interface historique. Le build
Vite dépose des fichiers statiques à noms stables dans `apps/api/static/ui/` ; aucun runtime
Node.js n’est nécessaire pour lancer l’application livrée.

Les nouvelles capacités suivent l’architecture décrite dans
[`docs/adr/frontend-feature-first.md`](adr/frontend-feature-first.md) : `features/` contient les
capacités métier, `app/` les compose et `shared/` fournit uniquement des briques agnostiques.

## Prérequis

- Python 3.12 ou supérieur avec les dépendances de développement du projet ;
- Node.js 22 et npm.

Installez les dépendances une première fois depuis la racine du dépôt :

```powershell
python -m pip install -e ".[dev,desktop,build]"
npm --prefix frontend ci
```

## Boucle de développement

Lancez FastAPI dans un premier terminal :

```powershell
python -m tools.run_studio
```

Lancez Vite dans un second terminal :

```powershell
npm --prefix frontend run dev
```

Vite surveille les sources de `frontend/src/` et reconstruit automatiquement les assets dans
`apps/api/static/ui/`. FastAPI les sert depuis `http://127.0.0.1:8000` ; attendez la fin du
premier build, puis rechargez manuellement le Studio après chaque modification.

Cette séparation est volontaire : FastAPI reste la source de vérité pour les routes API et
le shell historique, tandis que Vite fournit la compilation et le diagnostic TypeScript.

## Vérifications

Avant une pull request qui touche au frontend :

```powershell
npm --prefix frontend run check
pytest tests/test_frontend_assets.py
```

Le smoke navigateur suppose le Studio déjà lancé ; Playwright est installé par le lockfile frontend :

```powershell
npm --prefix frontend run smoke
```

Vous pouvez cibler une autre instance avec `SERRE_STUDIO_URL`.

## Build de production et application desktop

Le build de production génère `apps/api/static/ui/studio-react.js` et `studio-react.css`.
`index.html` les charge comme des assets statiques ordinaires. Le packaging PyInstaller
embarque tout `apps/api/static/`, y compris ce sous-répertoire : `frontend/`, npm et
`node_modules/` ne sont donc pas distribués avec l’exécutable.

Avant de construire l’application desktop, régénérez toujours les assets :

```powershell
npm --prefix frontend ci
npm --prefix frontend run build
python -m tools.build_desktop
```

Les fichiers de `apps/api/static/ui/` sont des artefacts versionnés nécessaires au lancement
depuis une installation Python ou depuis le binaire, pas un serveur Node embarqué.
