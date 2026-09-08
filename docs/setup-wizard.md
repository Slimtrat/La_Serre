# Assistant « Préparer mon studio »

L’assistant est la porte d’entrée de la route stable `#/create`. Il masque la complexité des moteurs et modèles sans retirer les réglages avancés. Une fois le pack local vérifié, l’action **Commencer à créer** déverrouille le parcours de création existant.

## Parcours utilisateur

1. **Diagnostic** — affiche le GPU, la VRAM, l’espace libre, le volume restant et cinq capacités orientées usage : écrire, créer des personnages, animer, créer les voix et monter.
2. **Vérification** — demande explicitement l’emplacement, l’accord sur l’espace disque et chaque licence requise. Aucune mutation ne part avant ces consentements.
3. **Installation** — démarre le job SET02, montre chaque composant et autorise pause, reprise et annulation sûre. Le temps est présenté comme variable, sans promesse artificiellement précise.
4. **Essai** — expose les actions réessayer, réparer et choisir manuellement en cas de blocage. Les journaux techniques, redacted côté serveur, restent dans un disclosure avancé chargé à la demande.
5. **Prêt** — restitue les smoke checks et un aperçu local, puis déverrouille le golden path.

Le dernier job SET02 est demandé au montage. Un rechargement pendant une installation ou après sa réussite restaure donc la vue utile sans relancer une installation.

## Intégration API

`frontend/src/features/setup/api.ts` est l’unique adaptateur entre l’UI et le client OpenAPI généré. Les réponses SET02 étant volontairement ouvertes dans le schéma actuel, `model.ts` les valide et les transforme en types UI fermés. Ne pas contourner cet adaptateur dans un composant.

Routes consommées :

- `GET /api/runtime-packs/current`
- `GET /api/runtime-packs/jobs/latest`
- `POST /api/runtime-packs/{pack_id}/jobs`
- `GET /api/runtime-packs/jobs/{job_id}`
- `POST .../pause`, `.../resume`, `.../repair`, `.../cancel`
- `GET .../logs`

L’API SET02 reste responsable des checksums, de la sécurité des chemins, de l’espace disque, des versions, de la persistance, des licences et de la redaction des secrets. Le wizard ne simule jamais leur réussite.

## Accessibilité et maintenance

Le stepper utilise `aria-current="step"`; les consentements sont regroupés dans des `fieldset`; la progression est un élément `progress`; erreurs et reprise sont annoncées; toutes les actions sont des contrôles natifs utilisables au clavier. La grille passe à deux puis une colonne, et les actions deviennent pleine largeur sur petit écran.

Les libellés FR/EN sont centralisés dans un dictionnaire typé. Le feature n’ajoute aucune dépendance et réutilise le kit UI partagé.

## Vérification

- RTL : diagnostic, consentements, démarrage, reprise, pause, erreurs, réparation, mode manuel, logs et écran final.
- Contrat API : mapping du body SET02 et enveloppe de logs.
- Route : deep-link `create` stable avec contexte projet.
- Playwright fake : `node tests/browser/setup_wizard_smoke.mjs` avec un serveur local déjà démarré. Toutes les routes runtime sont interceptées : aucun modèle, moteur ou réseau externe n’est sollicité.
