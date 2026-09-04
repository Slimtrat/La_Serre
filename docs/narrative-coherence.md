# Comité de cohérence narrative

La cohérence n’est pas une étape de génération supplémentaire. C’est une capacité
transverse appelée depuis les nœuds métier du graphe : `Personnages`, `Histoire`,
`Épisode`, `Validation du découpage` et `Épisode final`.

## Deux niveaux de contrôle

La gate exécute toujours les règles déterministes avant tout appel à Ollama. Elles
vérifient notamment :

- les identifiants de personnage et de lieu contre la Bible de série ;
- l’absence de dérive dans l’apparence, la tenue et les détails signatures ;
- l’attribution du dialogue à un personnage visible ;
- la fidélité des mots prononcés aux répliques du texte source ;
- la présence d’une intention de jeu et la densité de parole dans la durée du plan ;
- l’utilisation du casting annoncé et les répliques dupliquées dans un épisode.

Ollama ajoute ensuite un comité local structuré :

- `characters` relit la voix, les désirs, les peurs, les relations et le comportement ;
- `continuity` relit la causalité, la chronologie, l’histoire et l’enchaînement des plans ;
- `lore` relit les règles du monde, les secrets, les arcs et le canon.

Un verdict `fail` doit contenir une preuve bloquante. Un avis ambigu devient un
avertissement, pas un faux fait. Le contenu narratif est transmis au modèle comme un
dossier non fiable à auditer et ne peut pas remplacer les instructions du validateur.
Tout reste local ; aucun service IA distant n’est sélectionné automatiquement.

## Décision humaine et traçabilité

Le rapport classe chaque constat en `blocker`, `warning` ou `suggestion`. L’utilisateur
valide explicitement le rapport. Une incohérence bloquante exige une dérogation écrite,
qui est conservée avec la décision.

Les rapports vivent dans :

```text
<output>/.studio/coherence/
├── reports/<report-id>.json
└── latest/<scope>-<subject-id>.json
```

L’empreinte couvre le texte source, la révision de Bible, le contrat d’épisode et la
liste ordonnée de ses plans. Un rapport est automatiquement refusé à l’approbation si
un contrôle plus récent existe ou si le canon a changé. Une ancienne analyse ne peut
donc pas redevenir la gate active par erreur.

## API

Lancer un contrôle sur le plan édité :

```http
POST /api/coherence/review
Content-Type: application/json

{
  "scope": "shot",
  "subject_id": "S01E001-S01",
  "focus": "story",
  "source_text": "Iris murmure : « La pièce connaît mon nom. »",
  "shot": { "...": "contrat shot.json courant" },
  "use_ai": true
}
```

Valider le rapport :

```http
POST /api/coherence/reports/<report-id>/approve
Content-Type: application/json

{}
```

En présence d’un blocage, le corps doit fournir une justification utile d’au moins dix
caractères : `{"override_reason":"Choix créatif assumé et documenté"}`.

Le dernier rapport se recharge avec
`GET /api/coherence/{series|episode|shot}/<subject-id>/latest`. L’absence de rapport
renvoie `null`, ce qui permet à l’interface de démarrer sans erreur parasite.
