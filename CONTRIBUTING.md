# Contribuer à La Serre

[README](README.md) · [Roadmap](docs/roadmap.md) · [Architecture](docs/architecture.md) · [Sécurité](SECURITY.md) · [Licence](LICENSE)

Merci de contribuer à La Serre. Le projet accueille les corrections, tests, documentations, recettes de workflows libres et évolutions produit qui renforcent une production narrative locale, hybride et contrôlable.

## Avant de commencer

- consultez les [issues ouvertes](https://github.com/Slimtrat/La_Serre/issues) ;
- ouvrez une issue avant un changement important d’architecture, de schéma ou de parcours ;
- n’ajoutez aucun poids de modèle, média sous droits, secret, token ou contenu provenant de `.private/` ;
- vérifiez que la licence de chaque dépendance et asset ajouté est compatible avec l’AGPL.

Pour une vulnérabilité, ne créez pas d’issue publique : suivez [SECURITY.md](SECURITY.md).

## Installation développeur

```powershell
git clone https://github.com/Slimtrat/La_Serre.git
cd La_Serre
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev,desktop,build]"
Copy-Item .env.example .env
```

Lancer le Studio :

```powershell
python -m tools.run_studio
```

La démo express ne demande pas de GPU. Les tests unitaires utilisent des moteurs factices et ne doivent pas télécharger de modèle.

## Choisir une contribution

| Type | Bon point d’entrée |
|---|---|
| UX / graphe | navigation, clavier, états vides, inspection et impact visuel |
| Narration | prompts structurés, dialogues, continuité, résumés canoniques |
| Média | adaptateurs, validation de capacités, templates reproductibles |
| Production | queue, reprise, artefacts, montage et diagnostics |
| Qualité | tests de contrat, smoke tests navigateur, documentation et traduction |

La [roadmap](docs/roadmap.md) distingue les fonctions livrées, le prochain jalon et les explorations. Une contribution n’a pas besoin d’être grande ; elle doit être finie et vérifiable.

## Règles d’architecture

1. `engine/` porte les contrats métier et ne dépend pas de l’interface ;
2. `apps/` et `tools/` adaptent le domaine aux entrées API, desktop et CLI ;
3. les numéros de nœuds ComfyUI restent dans les profils de workflow ;
4. un moteur IA propose un candidat, il ne valide jamais à la place de l’utilisateur ;
5. un fichier importé et une génération produisent le même type d’artefact ;
6. toute mutation importante conserve provenance, révision et possibilité de reprise ;
7. les erreurs doivent indiquer une action possible, pas seulement un état technique.

Préférez un module ciblé à l’agrandissement d’un fichier monolithique. Évitez les refactors sans rapport dans une pull request fonctionnelle.

## Branches et commits

Créez une branche descriptive depuis `develop` :

```bash
git switch develop
git pull --ff-only
git switch -c feat/nom-court
```

Les préfixes usuels sont `feat/`, `fix/`, `docs/`, `test/` et `refactor/`. Les commits doivent expliquer une intention cohérente et laisser le dépôt testable.

## Vérifications obligatoires

```powershell
ruff check apps engine tools tests
mypy apps engine tools
pytest
```

Pour une modification d’interface, exécutez également le smoke test concerné dans `tests/browser/` sur une instance fraîche. Une nouvelle route doit avoir au minimum un test nominal et un test d’erreur pertinent.

## Pull request

Une pull request doit contenir :

- le problème utilisateur résolu ;
- le résultat visible et les limites restantes ;
- les décisions d’architecture non évidentes ;
- la liste des tests exécutés ;
- des captures pour les changements visuels significatifs ;
- les effets sur la Bible, les projets existants, les modèles ou les workflows.

Checklist avant envoi :

- [ ] aucun contenu privé ou fichier de modèle n’est présent ;
- [ ] les chemins locaux et secrets sont absents du diff ;
- [ ] les tests, Ruff et mypy passent ;
- [ ] la documentation et la roadmap sont cohérentes avec le comportement ;
- [ ] le chemin manuel/import reste disponible lorsqu’une IA est utilisée ;
- [ ] aucune régénération silencieuse n’a été introduite.

## Licence des contributions

Le projet utilise `AGPL-3.0-or-later`. En soumettant une contribution, vous acceptez qu’elle soit distribuée sous cette même licence et vous confirmez disposer des droits nécessaires sur le code et les assets envoyés.

Les modèles, polices, images, voix, musiques et jeux de données tiers ne deviennent pas AGPL par leur simple utilisation avec le Studio. Ne les ajoutez au dépôt que si leur redistribution est explicitement autorisée et documentée.
