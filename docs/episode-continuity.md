# Continuité canonique par épisode

TF06 introduit une couche de continuité explicite entre la Bible, le
SeasonPlan et les épisodes. Elle décrit ce qui est vrai **à l'entrée** de
chaque épisode sans réécrire les scripts ni programmer une régénération.

## Frontière produit

L'approbation d'un script et l'approbation de ses conséquences sont deux gates
humains distincts :

1. un épisode approuvé fournit la source d'une proposition de delta ;
2. la proposition reste non canonique tant qu'elle est proposed ;
3. un refus ne modifie aucun état ;
4. une approbation applique le delta à la composition des épisodes suivants ;
5. une seconde approbation du même delta est idempotente.

Une empreinte couvre l'épisode source et son état d'entrée. Une édition de
l'épisode ou une modification d'un delta antérieur rend donc la proposition
périmée et bloque son approbation.

## Données persistées

Le fichier privé world/series-state.json contient une révision optimiste, un
état de base et l'historique des propositions. Un EpisodeStateDelta peut
décrire :

- faits et connaissances ;
- secrets révélés et relations ;
- objectifs ;
- objets et états visuels ;
- fils narratifs ouverts ou résolus ;
- preuves reliant chaque mutation à l'épisode, la Bible ou une saisie manuelle.

Les propositions peuvent venir d'une TaskSpec locale ou d'une saisie manuelle.
Le moteur factice des tests ne contacte aucun modèle.

## Composition et impact

SeriesStateRegistry.compose() parcourt les items actifs dans l'ordre stable du
SeasonPlan. Seuls les deltas approved sont appliqués. L'état obtenu avant un
item devient son état d'entrée ; chaque valeur transporte les identifiants des
deltas et preuves qui l'ont produite.

Le rapport d'impact compare deux compositions. Il cite les items affectés, les
champs modifiés et leurs causes après approbation d'un delta ou simulation d'un
réordonnancement. Il ne modifie pas le plan et ne déclenche aucune génération.

## API

Les routes sous /api/continuity exposent :

- le snapshot de continuité d'un épisode ;
- une proposition manuelle ou locale ;
- l'approbation et le refus explicites ;
- le rapport des conséquences d'un delta ;
- la prévisualisation d'impact d'un nouvel ordre de saison.

Les conflits de révision et les propositions périmées répondent en 409 avec
un code structuré. Les épisodes non liés au SeasonPlan ne peuvent pas produire
de continuité canonique.
