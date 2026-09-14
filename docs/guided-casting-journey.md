# Parcours guidé : fiche personnage et identité visuelle

Le casting distingue trois états persistants :

1. **Brouillon guidé** : éditable, révision optimiste, jamais envoyé aux routes de génération.
2. **Personnage de la Bible** : créé uniquement par l’action explicite « Valider dans la Bible » ; son identifiant reste celui du brouillon.
3. **Identité visuelle maître** : importée ou générée comme candidate, puis approuvée explicitement.

`GET /api/guided` renvoie les brouillons et `canonical_characters`. Le `CastingBoard` ne reçoit que les personnages canoniques, y compris ceux provenant d’un starter ou d’une Bible importée. Ses caches sont isolés par identifiant de projet.

## Génération standard

La fiche canonique préremplit l’identité permanente, la tenue et le prompt. Le profil keyframe actif détermine le modèle et le workflow ; ces valeurs restent optionnelles et consultables dans les réglages avancés. La seed par défaut est `42` pour rendre un premier essai reproductible.

Les licences SDXL et workflow du pack actif sont affichées avant génération. L’utilisateur confirme les avoir consultées et déclare séparément les droits correspondant à la licence de sortie qu’il saisit. Un import exige toujours sa propre licence et sa provenance réelle.

Sans moteur image, l’édition, la promotion dans la Bible et l’import restent disponibles.

## Régressions

- `tests/test_guided_authoring.py` : création, édition, promotion, identité conservée et rechargement.
- `tests/test_visual_identity.py` : import, génération standard sans réglages techniques, approbation et persistance.
- Tests RTL : projet vide, promotion explicite, Bible préexistante et resélection après rechargement.

Le lancement Playwright contre un FastAPI temporaire et une vraie persistance appartient au harnais d’intégration de l’issue #61 ; les moteurs externes seront les seules frontières simulées.
