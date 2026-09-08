# TaskSpecs narratifs versionnés

Les opérations d’écriture locale de La Serre sont définies dans
`engine/narrative/tasks/`, indépendamment d’Ollama et des routes FastAPI. Une
`TaskSpec` fixe l’objectif éditorial, le contrat de sortie, le contexte requis,
les règles, la classe de tâche et ses options d’inférence. Le provider ne choisit
jamais ces règles : il reçoit une `CompiledTask` prête à exécuter.

## Tâches Tentafruit v1

| Identifiant | Nature | Contrat | Mutation |
| --- | --- | --- | --- |
| `narrative.director` | créative | `DirectorBrief` | candidate seulement |
| `tentafruit.season-plan` | créative | `ScreenwriterPlan` | candidate seulement |
| `tentafruit.short-episode` | créative | `EpisodeDraftCandidate` | candidate seulement |
| `tentafruit.breakdown` | factuelle | `EpisodeBreakdownCandidate` | candidate seulement |
| `tentafruit.continuity-delta` | factuelle | `ContinuityDelta` | candidate seulement |
| `tentafruit.audit` | validation | `GeneralValidation` | interdite |

Une génération renvoie `execution` avec `task_id`, `task_version`, `model`,
`input_fingerprint` et `allows_mutation`. L’atelier retransmet cette identité lors
de l’application humaine. Elle est alors conservée dans `NarrativeProvenance`.
Les champs sont optionnels afin de charger sans migration destructive les projets
`0.2.13` et leurs anciennes provenances.

## Faire évoluer un prompt

Ne modifiez pas une version déjà publiée. Ajoutez une nouvelle `TaskSpec` avec le
même `task_id` et un numéro supérieur, conservez l’ancienne dans le registre,
puis ajoutez sa fixture d’évaluation. `TaskRegistry.get(id)` sélectionne la
version la plus récente, tandis que `get(id, version)` permet de relire et comparer
une exécution historique. Le registre refuse d’écraser une paire identifiant/version.

Un changement de contrat doit rester compatible ou être porté par une nouvelle
version. Les routes ne construisent aucun prompt métier. Les tâches de validation
ont obligatoirement `allows_mutation=False`; `TaskExecution.require_mutation_permission()`
les empêche d’emprunter un chemin de mutation.

## Boucle d’évaluation locale

La fixture golden `tests/fixtures/narrative_tasks/belladone_aconit_v1.json` couvre
Belladone, Aconit et les six contrats. Elle s’exécute sans Ollama, réseau ni modèle :

```powershell
python -m tools.evaluate_narrative_tasks --provider fake
pytest tests/test_narrative_tasks.py
```

Le fake provider valide chaque objet avec le contrat Pydantic réel et produit la
même enveloppe de provenance qu’un provider local. Pour comparer une v2, ajoutez
un cas `task_version: 2` et sa sortie attendue; ne remplacez pas le cas v1.

## Invariants d’application

Une sortie IA demeure non canonique (`canonical: false`) jusqu’à l’action humaine
explicite. Les imports et la saisie manuelle restent possibles. Une nouvelle
génération ne remplace jamais silencieusement un artefact approuvé, et l’identité
de la tâche ayant produit un ancien artefact n’est jamais recalculée.
