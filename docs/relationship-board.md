# Bible relationnelle

La Bible relationnelle est la source canonique des liens directionnels, jalousies et secrets. Elle est disponible dans le Studio par la route `#/bible`; la vue avancée historique reste accessible depuis l’onglet **Bible avancée**.

## Modèle et compatibilité

`RelationshipState` conserve les axes `desire`, `trust`, `anger`, `fear`, `attachment` et `toxicity`, et ajoute `jealousy` (entier de 0 à 100). Une relation A → B est indépendante de B → A. `Secret` sépare explicitement les détenteurs (`owners`), les personnages informés (`known_by`) et ceux qui sont tenus à l’écart (`hidden_from`). Un personnage ne peut pas être simultanément informé et tenu à l’écart.

Les documents au schéma `1` issus de la version 0.2.13 restent lisibles : une jalousie absente vaut `0` et une provenance absente devient `legacy`. Les nouvelles éditions enregistrent une provenance `manual`; les données du catalogue de démarrage portent une provenance `template`. Le numéro de schéma n’est donc pas artificiellement incrémenté pour ces ajouts rétrocompatibles.

## Contrat API

- `GET /api/relationship-board` retourne personnages, relations, secrets, révision, historique canonique et dernier impact aval.
- `PUT /api/relationship-board/relationships/{id}` enregistre une direction complète.
- `PUT /api/relationship-board/secrets/{id}` enregistre un secret complet.
- `DELETE /api/relationship-board/{relationships|secrets}/{id}` supprime explicitement l’élément.
- `POST /api/relationship-board/summary-candidates` fabrique un aperçu narratif non canonique.

Chaque mutation canonique exige `expected_revision` et `confirmed_by_user: true`. La comparaison de révision et l’écriture sont atomiques sous le verrou de la Bible; un client obsolète reçoit `409` et doit recharger avant de réessayer. Une réponse de mutation contient l’impact sur les épisodes, plans et artefacts dérivés. L’historique de révision de la Bible constitue la piste d’audit.

## Validation humaine et génération

Le Studio n’enregistre jamais pendant le déplacement d’un curseur ou lors de la génération d’un résumé. Seul **Enregistrer dans la Bible** franchit le gate humain. Un résumé généré a `status: candidate` et une provenance déclarant `canonical: false`; sa création ne modifie ni la révision ni la Bible. Pour le rendre canonique, l’utilisateur doit le reporter dans un champ canonique puis l’enregistrer explicitement.

Aucune édition ne déclenche silencieusement la régénération des épisodes ou des artefacts. La zone **Impact aval** expose ce qui peut être devenu obsolète afin que l’utilisateur décide de la suite du pipeline.

## Vérification

Les tests Python couvrent migration 0.2.13, bornes, cohérence des connaissances, concurrence optimiste, provenance, historique, impact et caractère non canonique des résumés. Les tests React couvrent les deux directions, les contrôles clavier/numériques, les secrets, le gate de sauvegarde et la vue avancée à la demande. Le smoke Playwright `tests/browser/relationship_board_smoke.mjs` vérifie le parcours intégré, l’absence d’enregistrement implicite et le rendu étroit.
