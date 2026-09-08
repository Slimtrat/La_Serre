# Studio Journey Snapshot

GET /api/studio/journey fournit la source de vérité de la progression générale du projet actif. Le frontend n’a pas à recomposer les règles à partir des endpoints Guided, Bible, épisodes, file de production et runtimes.

## Contrat

La réponse contient :

- project_id et active_episode_id ;
- revision, empreinte SHA-256 du contenu métier normalisé ;
- les compteurs d’épisodes, plans, médias, jobs, approbations et artefacts obsolètes ;
- huit stages ordonnés : idea, casting, relationships, season, episode, storyboard, production, release ;
- les artefacts rendus obsolètes par une révision de Bible.

Les statuts possibles sont empty, draft, ready, approved, running, blocked, failed, stale et completed.

Chaque stage fournit une primary_action. Chaque stage blocked fournit au moins un blocker avec un code stable et une action de résolution. Les textes peuvent évoluer ou être traduits ; le frontend doit piloter son comportement avec les codes.

## Garanties produit

- La même vérité persistée produit la même révision : aucun horodatage de lecture n’entre dans l’empreinte.
- HUMAN_APPROVAL_REQUIRED reste distinct d’un job failed.
- RUNTIME_UNAVAILABLE propose les réglages des moteurs, tandis que l’action principale conserve l’import manuel.
- Une modification de Bible postérieure à la révision de génération place les stages concernés en stale.
- La lecture ne déclenche aucune génération et ne modifie aucun fichier.

## Exemple

    {
      "project_id": "tentafruit",
      "active_episode_id": "S01E001",
      "revision": "…",
      "counts": {
        "episodes": 1,
        "shots": 10,
        "generated_media": 0,
        "stale_artifacts": 0,
        "active_jobs": 0,
        "awaiting_approval": 0,
        "failed_jobs": 0
      },
      "stages": [
        {
          "id": "production",
          "status": "blocked",
          "count": 0,
          "blockers": [
            {
              "code": "RUNTIME_UNAVAILABLE",
              "message": "Aucun moteur local n’est disponible. L’import manuel reste possible.",
              "resolution": {
                "code": "CONFIGURE_RUNTIME",
                "label": "Configurer les moteurs",
                "target": "#/settings",
                "mode": "settings"
              }
            }
          ],
          "primary_action": {
            "code": "IMPORT_OR_GENERATE_MEDIA",
            "label": "Produire ou importer",
            "target": "#/produce",
            "mode": "generate"
          }
        }
      ]
    }

## Évolution

Le champ schema_version versionne la forme du read model. Les nouveaux codes peuvent être ajoutés sans changer la sémantique des codes existants. Toute modification du calcul de progression doit ajouter un cas de test et mettre à jour la fixture tests/fixtures/tentafruit-journey-snapshot.json.