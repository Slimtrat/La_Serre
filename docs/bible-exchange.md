# Échanger une Bible avec une IA

La Bible canonique utilise un contrat portable et versionné. Il sert au Studio,
à ChatGPT ou à tout autre outil capable de lire et produire du JSON.

```json
{
  "format": "serre.project-bible",
  "format_version": 1,
  "bible": {
    "schema_version": 1,
    "title": "Titre du projet",
    "characters": [],
    "locations": [],
    "relationships": [],
    "art_direction": {
      "summary": "",
      "visual_style": [],
      "palette": [],
      "rendering_rules": [],
      "banned_elements": []
    },
    "tone": {
      "summary": "",
      "keywords": [],
      "dialogue_rules": [],
      "content_boundaries": []
    },
    "world_rules": [],
    "narrative_arcs": [],
    "secrets": [],
    "references": [],
    "prompts": []
  }
}
```

Le document portable ne contient ni révision locale, ni date de modification,
ni journal de changements. Lors d'un import, le Studio valide tout le graphe
canonique, crée une nouvelle révision et recalcule l'impact sur les épisodes,
les plans et les rendus existants.

## Depuis le Studio

Dans l'écran **Bible** :

- **Exporter JSON** télécharge la Bible portable du projet actif ;
- **Kit ChatGPT** télécharge la consigne, le JSON Schema complet et un gabarit
  vide ;
- **Importer JSON** valide un document `serre.project-bible`, affiche le nombre
  d'entrées et demande confirmation avant de remplacer le canon.

Le numéro de révision courant est envoyé avec l'import. Si la Bible a été
modifiée dans un autre onglet entre-temps, l'import est refusé au lieu d'écraser
silencieusement le travail récent.

## Transformer une conversation avec ChatGPT

1. téléchargez le **Kit ChatGPT** ;
2. joignez le kit et la conversation à transformer ;
3. demandez à ChatGPT d'exécuter la tâche inscrite dans le kit ;
4. enregistrez sa réponse comme fichier `.json` ;
5. utilisez **Importer JSON** dans le Studio.

Le kit demande à l'IA de ne renvoyer que le document final, de ne pas inventer
pour remplir les collections, de créer des identifiants stables et de respecter
les références croisées entre personnages, relations, arcs, secrets et prompts.

## API

| Route | Usage |
|---|---|
| `GET /api/bible/exchange` | Bible portable courante |
| `GET /api/bible/exchange/template` | Gabarit vide |
| `GET /api/bible/exchange/schema` | JSON Schema du contrat |
| `GET /api/bible/exchange/ai-kit` | Kit prêt à donner à une IA |
| `POST /api/bible/exchange/import?expected_revision=N` | Import contrôlé |

Le format est strict : les champs inconnus, les identifiants invalides, les
relations vers des personnages absents et les valeurs hors limites sont
refusés avant toute écriture.
