# Roadmap produit

[README](../README.md) · [Architecture](architecture.md) · [Contribuer](../CONTRIBUTING.md) · [Issues](https://github.com/Slimtrat/La_Serre/issues)

**Référence : version 0.2.13 — septembre 2026**

Cette roadmap décrit des résultats produit, pas une liste de technologies à empiler. Les dates restent indicatives ; les critères d’acceptation décident du passage au jalon suivant.

## L’ambition

La Serre doit devenir le **système d’exploitation d’une production narrative générative** : un endroit où une petite équipe peut passer d’une idée à une série publiée, tout en gardant un canon, des personnages reconnaissables, des décisions éditoriales explicites et des moteurs remplaçables.

Le produit n’a pas vocation à être un bouton « génère-moi une vidéo ». Il organise le travail créatif autour de quatre actifs durables :

1. la **Bible**, source de vérité narrative et visuelle ;
2. le **graphe**, représentation vivante du travail et de ses dépendances ;
3. les **artefacts**, générés ou importés avec leur provenance ;
4. les **décisions humaines**, versionnées et réversibles.

## Légende

- ✅ **Livré** : présent dans le produit et couvert par des tests ;
- 🟡 **Consolidation** : fonctionnel, mais encore à durcir pour un usage quotidien ;
- 🔵 **Prochain jalon** : priorité produit immédiate ;
- ⚪ **Horizon suivant** : prévu après validation du jalon précédent ;
- 🧭 **Exploration** : ambition soumise à une preuve d’usage.

## Maintenant — consolider le Studio `0.2.x`

### ✅ Fondations déjà livrées

- hiérarchie Projet → Série → Épisode → Plan et graphes multi-scope ;
- parcours guidé en six étapes avec propositions IA, caméra et navigation métier ;
- atelier Director → Scénariste → Validateur et écriture détaillée des épisodes ;
- Bible canonique, relations, impacts, révisions et format JSON portable ;
- assets hybrides, historique éditorial, variantes et restauration ;
- templates ComfyUI générés par le code pour FLUX, SDXL et LTX ;
- trois poses orientées par plan, voix à l’image/hors champ/voice-over et montage FFmpeg ;
- projets isolés, stockage configurable, queue de production et application Windows ;
- gestion guidée d’Ollama, ComfyUI et des modèles nécessaires.

### 🟡 Cap court terme — 30 à 90 jours

L’objectif est de rendre les fonctions existantes fiables pour une vraie production courte.

- terminer le parcours sans écran technique obligatoire ni édition manuelle de JSON ;
- fournir un diagnostic clair pour chaque blocage de moteur, modèle ou workflow ;
- stabiliser les migrations de projets et la reprise après interruption ;
- rendre la production d’un épisode relançable plan par plan sans perdre les validations ;
- mesurer durée, VRAM, taille disque et coût de chaque variante ;
- publier un installeur Windows signé, des notes de version et une procédure de mise à jour ;
- compléter l’accessibilité clavier, les états vides et la traduction anglaise ;
- documenter un projet d’exemple librement redistribuable, distinct de `.private/`.

**Critère de sortie :** une nouvelle contributrice peut installer le Studio, lancer la démo, connecter Ollama/ComfyUI et produire un premier épisode à partir du README sans assistance privée.

## Prochain jalon — `0.3`, trois épisodes cohérents

Le test central devient : **produire trois épisodes courts dans lesquels le public reconnaît immédiatement les personnages, les lieux et la progression dramatique.**

### 🔵 Identité et continuité

- références maîtres approuvées par personnage, tenue, accessoire et lieu ;
- templates d’identité par image quand leurs nœuds et modèles sont disponibles ;
- score de dérive visuelle et comparaison côte à côte avant validation ;
- raccords automatiques de palette, lumière, axe caméra et état des accessoires ;
- continuité entre la dernière pose d’un plan et la première du suivant.

### 🔵 État narratif canonique

- timeline de faits, secrets connus, relations et objectifs actifs ;
- état d’entrée et de sortie explicite pour chaque épisode ;
- détection des contradictions avant découpage et avant rendu ;
- simulation d’impact lorsqu’un élément de Bible change ;
- résumés compacts injectables dans différents modèles narratifs.

### 🔵 Production de série

- création et validation par lot sans supprimer le contrôle plan par plan ;
- presets verticaux Instagram/Reels/TikTok et exports horizontaux ;
- budgets de durée, de plans et de variantes au niveau épisode ;
- comparaison de templates et sélection d’une recette canonique par série ;
- tableau de santé des trois épisodes : écrit, validé, rendu, obsolète, publié.

**Critère de sortie :** trois épisodes consécutifs sont produits depuis une même Bible, sans bricolage de workflow, avec historique complet et rapport de continuité acceptable avant chaque publication.

## Horizon suivant — `0.4`, atelier de production extensible

### ⚪ Moteurs interchangeables

- contrats stables pour brancher d’autres LLM, générateurs image/vidéo et moteurs vocaux ;
- SDK de providers et validation automatique de leurs capacités ;
- profils par machine et routage local selon VRAM, latence ou qualité ;
- workers de rendu distants **optionnels**, chiffrés et explicitement autorisés.

### ⚪ Projet portable et résilient

- bundle de projet exportable avec manifeste, schémas et sommes de contrôle ;
- migration versionnée et sauvegarde avant toute transformation destructive ;
- détection des médias manquants ou déplacés ;
- restauration après crash et reprise des jobs idempotents ;
- mode archive pérenne sans dépendre d’un service cloud.

### ⚪ Mise en scène et montage

- timeline visuelle épisode/plan/piste ;
- courbes de rythme, tension, temps de parole et présence personnage ;
- direction de caméra structurée et transitions conscientes des raccords ;
- doublage multilingue, lipsync optionnel et contrôle de prononciation ;
- exports éditoriaux, feuilles de service et paquets de publication.

**Critère de sortie :** un provider tiers et un template tiers peuvent être ajoutés sans modifier le domaine narratif, et un projet peut être déplacé vers une autre machine sans perdre son canon ni sa provenance.

## Vision long terme — `1.0` et au-delà

### ⚪ Un produit fiable

- schémas publics stables et migrations rétrocompatibles ;
- installateurs signés, mises à jour sûres et diagnostics exportables ;
- Windows pleinement supporté, puis macOS/Linux selon la demande réelle ;
- accessibilité, français/anglais complets et documentation versionnée ;
- tests de référence visuelle et narrative reproductibles.

### 🧭 Un écosystème ouvert

- catalogue communautaire de templates, sans redistribuer de poids propriétaires ;
- validation de compatibilité, sécurité et licence des recettes ;
- packs de formats narratifs et de directions artistiques réutilisables ;
- API locale documentée et automatisations externes ;
- gouvernance publique des schémas et contrats fondamentaux.

### 🧭 Une entreprise autour du cœur open source

Le cœur reste local-first et AGPL. Des services commerciaux pourront financer son développement sans capturer les projets des créateurs :

- orchestration de rendu managé ou sur machines d’équipe ;
- collaboration, revue et synchronisation chiffrée optionnelles ;
- support professionnel, intégration de studios et recettes privées ;
- observabilité de production et gestion de parcs de rendu ;
- place de marché respectant les licences des modèles et des artistes.

Ces services devront rester **facultatifs** : un projet local ne doit jamais devenir inutilisable faute d’abonnement ou de connexion.

## Principes qui ne bougent pas

1. aucune génération ou propagation irréversible sans intention humaine ;
2. aucune obligation d’utiliser un modèle ou un fournisseur unique ;
3. les imports manuels restent des citoyens de première classe ;
4. la provenance et le canon sont explicites ;
5. les données privées restent locales par défaut ;
6. les licences des modèles, médias et voix sont visibles et respectées ;
7. une fonctionnalité n’est « livrée » qu’avec tests, erreurs actionnables et documentation.

## Hors périmètre assumé

- entraîner ou redistribuer des modèles lourds dans ce dépôt ;
- contourner les licences, filigranes, consentements ou protections de plateformes ;
- publier automatiquement sur un réseau social sans validation finale ;
- remplacer un logiciel de montage professionnel pour tous les usages ;
- envoyer silencieusement une Bible ou un média vers un service externe.

## Transformer la roadmap en travail

Une proposition importante commence par une [issue](https://github.com/Slimtrat/La_Serre/issues/new) qui décrit : problème utilisateur, résultat observable, données touchées, dépendances, stratégie de test et effet sur le canon. Les changements d’architecture significatifs doivent aussi mettre à jour le document concerné dans `docs/`.

Voir [CONTRIBUTING.md](../CONTRIBUTING.md) pour le processus complet.
