# Plan de saison

Le `SeasonPlan` est la source de vérité de l'ordre éditorial d'une saison. Il
sépare cet ordre des identifiants techniques déjà utilisés par la production :
réorganiser la saison ne renomme jamais un épisode, un plan ou un dossier.

## Identité et ordre

Chaque `SeasonPlanItem` reçoit un identifiant stable à sa création. Cet
identifiant ne dépend ni de sa position, ni d'un éventuel épisode matérialisé et
ne peut pas être réutilisé après suppression.

La `position` porte l'ordre visible. Les positions des items actifs sont
uniques, contiguës et calculées à l'intérieur de leur saison. Une insertion ou
un déplacement réindexe uniquement ces positions. Le numéro affiché dans le
Studio est donc issu de l'ordre courant ; le code de production, lorsqu'il
existe, reste disponible comme information avancée.

Un projet actif possède un seul document `SeasonPlan` valide. Sa validation
refuse notamment les identifiants d'items dupliqués, les positions ambiguës et
plusieurs items liés au même épisode. Le stockage reste dans le répertoire privé
du projet afin qu'aucun état ne soit partagé entre deux projets.

## Deux axes de statut

Le tableau ne réduit pas l'état d'un item à une seule valeur. Il expose deux
axes complémentaires :

- l'état éditorial persistant : `draft`, `validated` ou `obsolete` ;
- l'état de production dérivé : non matérialisé, matérialisé ou produit.

Un item peut ainsi être à la fois obsolète et déjà produit. L'état de production
est calculé à partir de son lien avec l'`EpisodeCatalog` et de l'état réel de
l'épisode ; il n'est pas recopié dans le plan, ce qui évite deux sources de
vérité divergentes. Passer de brouillon à validé reste une décision humaine
explicite. Une génération ou un import ne valide rien silencieusement.

## Révisions et mutations atomiques

Le plan porte une révision monotone. Toute mutation fournit la révision que le
client a lue. Le registre compare cette valeur sous le même verrou que la
mutation et l'écriture atomique. Si une autre fenêtre a modifié le plan entre
temps, l'opération échoue avec un conflit explicite ; le client recharge avant
de proposer de nouveau l'action à l'utilisateur.

Un réordonnancement transmet l'ordre complet des items actifs concernés. Le
registre refuse une liste contenant un doublon, un item inconnu, supprimé ou
appartenant à une autre saison, ainsi qu'une liste qui omet un item actif. Il
n'existe donc pas d'état intermédiaire avec deux positions identiques.

## Suppression récupérable

Supprimer un item crée une suppression logique : son contenu, son identité, sa
provenance et son éventuel lien d'épisode sont conservés avec la date de
suppression. Une restauration explicite le replace dans la liste active avec
une nouvelle position, sans lui attribuer un nouvel identifiant.

La suppression d'un item lié à un épisode produit est bloquée tant que
l'utilisateur n'a pas choisi explicitement de conserver cet épisode de
production. Cette action ne supprime, ne déplace et ne détache jamais les
fichiers de l'épisode. La corbeille du plan et celle de l'`EpisodeCatalog` sont
deux décisions distinctes.

Dupliquer un item crée au contraire une nouvelle identité éditoriale. La copie
redevient un brouillon, ne reprend aucun `episode_id` et conserve la référence
de provenance vers l'item source.

## Matérialisation

La matérialisation transforme un item validé en épisode de production. Le code
de l'épisode est alloué par l'`EpisodeCatalog` dans le premier emplacement
technique disponible de la saison, jamais à partir de la position visible. Le
lien entre l'item et l'épisode est un singleton : un item ne peut être
matérialisé qu'une fois et un épisode ne peut appartenir qu'à un item.

L'opération est idempotente. Répéter une demande après une réponse perdue
retrouve le même épisode au moyen de l'identifiant stable de l'item, au lieu
d'en créer un second. Ce lien permet également de réconcilier une interruption
survenue entre l'écriture de l'épisode et celle du plan.

Une fois matérialisé, déplacer l'item modifie seulement son numéro visible. Par
exemple, insérer un nouvel item entre deux épisodes existants ne change ni leurs
`episode_id`, ni les chemins `episodes/season-XX/<episode_id>`, ni les
identifiants de leurs plans et artefacts.

## Migration des projets 0.2.13

La migration est additive, paresseuse et idempotente. Au premier chargement
d'un projet sans `SeasonPlan`, le registre importe les propositions présentes
dans `world/narrative-workflow.json`, sous verrou, puis persiste le nouveau
document atomiquement.

L'import :

- conserve l'ordre de la liste, tous les champs narratifs et la provenance ;
- conserve les anciens numéros de saison et d'épisode comme métadonnées
  consultables, sans en faire les nouvelles identités ;
- marque comme validés les items provenant d'une étape scénariste déjà
  approuvée, et laisse les autres en brouillon ;
- ne relie un item à un épisode existant que si le workflow le déclare publié
  et que l'`EpisodeCatalog` confirme réellement cet épisode ;
- regroupe et réindexe les propositions par saison sans perdre un plan
  multi-saison.

Le workflow historique n'est ni réécrit ni supprimé. Un plan déjà présent n'est
jamais complété une seconde fois depuis cette source. La transformation reste
donc réversible, et un document invalide provoque une erreur visible plutôt
qu'un écrasement de données.

## Surface API

L'API expose conceptuellement la lecture du plan et les mutations d'items :
création, édition, validation, duplication, suppression logique, restauration,
réordonnancement et matérialisation. Toutes les mutations utilisent la révision
optimiste et renvoient le nouvel instantané canonique. Les routes et DTO exacts
sont décrits par le contrat OpenAPI généré ; ce document fixe les invariants
métier, pas leur forme de transport.

La compatibilité de l'ancien atelier narratif peut rester disponible pendant la
migration du frontend, mais son action de publication doit passer par le plan de
saison. Elle ne doit plus recréer directement les épisodes à partir des numéros
du scénariste.
