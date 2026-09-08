# ADR — Shell React et routage du Studio

- Statut : accepté
- Date : 2026-09-08
- Portée : frontend/src/app, shell historique et navigation du Studio

## Contexte

Le Studio possédait plusieurs navigations globales concurrentes : topbar, dock latéral et vues desktop. La migration incrémentale doit conserver les workspaces fonctionnels sans laisser deux propriétaires du contexte, du focus ou des routes.

## Décision

StudioShell est l’unique propriétaire visible de la navigation globale. Il expose trois destinations produit : Créer, Produire et Résultats. La Bible, les Réglages et le graphe restent accessibles depuis Outils, sans redevenir des onglets primaires.

Les URL canoniques sont des hash routes rechargeables :

| Route React | Workspace transitoire |
| --- | --- |
| #/create | guided |
| #/produce | plan |
| #/results | outputs |
| #/bible | bible |
| #/settings | settings |
| #/advanced/graph | graph |

Les paramètres project, series, episode et shot transportent le contexte actif. Le routeur hydrate le kernel au démarrage puis remplace l’URL lorsque le contexte change.

## Frontière legacy

LegacyWorkspaceSlot adopte temporairement le nœud DOM de la vue demandée, demande la navigation via AppKernel, gère focus et attributs d’accessibilité, puis restaure exactement sa position et son état au démontage.

Le shell annonce sa propriété avec data-shell-owner=react. Les scripts historiques rendent alors topbar et dock hidden, inert et aria-hidden. Si React se démonte, ces surfaces sont restaurées pour conserver un repli exploitable.

Les outils historiques passent uniquement par l’événement allowlisté studio:tool-open-request. Une valeur inconnue ne provoque aucune action.

## États et accessibilité

Le shell possède les états projet absent et route introuvable. Les libellés FR/EN restent stricts, toutes les commandes ont un nom accessible, et le contexte Projet → Série → Épisode → Plan reste visible en viewport étroit.

## Vérification

Les tests Vitest couvrent routeur, traductions, navigation primaire, pont d’outils et cycle de vie des slots. Le smoke et tests/browser/studio_ui_requirements_audit.mjs vérifient la propriété unique, les deep-links, le repli legacy, le clavier, l’i18n et le responsive dans un navigateur réel.