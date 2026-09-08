# Client API frontend

Le contrat HTTP du frontend est dérivé de l’application FastAPI. La chaîne est reproductible hors serveur :

    python -m tools.export_openapi
    npm --prefix frontend run generate:api

La première commande exporte un document OpenAPI stable dans frontend/openapi.json. Orval transforme ensuite ce contrat en modèles et client TypeScript sous frontend/src/generated/. Ces fichiers sont générés : ils ne doivent jamais être modifiés à la main.

## Utilisation dans une feature

Les features importent le client partagé depuis @shared/api et l’état serveur depuis @shared/query. Elles ne font pas d’appel fetch direct. Le contrôle d’architecture fait échouer npm run check si cette règle est enfreinte.

Une query doit transmettre le signal d’annulation fourni par TanStack Query. La feature api-status constitue l’exemple de référence.

Le client choisit automatiquement JSON, texte ou binaire selon la réponse. Une réponse HTTP en erreur devient une ApiError qui expose status, detail, code, les données brutes et, pour une erreur 422, validation. Une annulation reste une AbortError native afin de ne pas déclencher de notification parasite.

## Modifier le contrat

Après toute modification des routes ou modèles FastAPI :

1. exporter le contrat ;
2. régénérer le frontend ;
3. exécuter npm --prefix frontend run check et python -m pytest tests/test_export_openapi.py.

La CI répète l’export et la génération puis exige un diff vide. Un oubli de régénération est donc détecté avant fusion.