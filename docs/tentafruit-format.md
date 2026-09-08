# Template Tentafruit — romance sombre verticale

Le template versionné `tentafruit-dark-romance-v1` formalise un format de série
botanique original destiné à des épisodes verticaux de 30 à 60 secondes. Il
n’est pas un prompt caché : son contrat JSON est distribué dans
`starter_catalog/project-templates/` et validé par `ProjectTemplate` et
`SeriesFormatProfile`.

## Contrat éditorial et de sortie

- image verticale 9:16, cible 1080 × 1920 ;
- 6 à 10 plans pour 30 à 60 secondes ;
- hook lisible dans les trois premières secondes ;
- conflit relationnel, bascule dramatique ou comique, puis cliffhanger ;
- évolution observable sur au moins un axe : désir, confiance, colère, peur,
  attachement ou toxicité ;
- validation humaine explicite avant toute modification du canon.

Chaque projet reçoit une copie immuable à l’instanciation dans
`series-format.json`. Les tâches narratives peuvent injecter
`SeriesFormatProfile.task_context()` dans leur `TaskContext`; elles n’ont donc
pas besoin d’un branchement `if tentafruit` ni de règles dupliquées dans un
provider.

## Création par API

`GET /api/project-templates` liste les contrats disponibles. Pour créer une
série vide :

```json
{
  "name": "Ma série",
  "template_id": "tentafruit-dark-romance-v1"
}
```

`"include_example_content": true` ajoute la Bible et l’épisode Découverte.
Sans cette option, seuls les dossiers techniques et le profil de format sont
créés. Aucun média privé, poids de modèle ou référence personnelle n’est copié.
Le champ historique `clone_content` reste accepté pour les clients 0.2.13 et
ne peut pas être combiné à un template nommé.

## Migration et non-écrasement

À la lecture d’un registre antérieur, le projet `default` de Découverte reçoit
l’identité Tentafruit. Tous les projets utilisateur sans métadonnée reçoivent
le profil compatible `custom`. Un fichier `series-format.json` existant reste
prioritaire et n’est jamais remplacé. La migration ne déplace ni ne réécrit les
épisodes, Bibles ou sorties existants.

## Originalité et distance avec les propriétés tierces

Le format, Belladone, Aconit, la Graine Noire, la serre, les textes et les
relations fournis ici sont des créations originales du projet La Serre. Le
template ne contient, n’importe et ne demande aucun asset, voix, dialogue,
personnage, nom, épisode ou continuité provenant d’un compte ou d’une propriété
tierce. Une référence utilisateur éventuelle demeure externe au template, doit
être licite et ne devient jamais implicitement canonique.
