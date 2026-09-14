# Propositions de saison Tentafruit

TF05 ajoute une étape de travail non canonique entre la Bible et le
`SeasonPlan`. L'IA propose une saison complète, l'auteur la compare et l'édite,
puis une acceptation humaine explicite remplace le contenu éditorial actif. La
génération ne crée aucun épisode de production et ne matérialise aucun item.

## Frontières et sources de vérité

La Bible reste l'autorité pour le casting, les lieux, les relations et les
secrets. Le document de proposition conserve un instantané de contexte compilé
et son empreinte ; le `SeasonPlan` reste la seule source de vérité après
acceptation. Une proposition est donc jetable et ne devient jamais canonique par
sa seule génération.

Le flux est le suivant :

1. l'API charge la Bible et le `SeasonPlan` courants ;
2. la `TaskSpec` Tentafruit compile casting, relations, secrets, format et budget
   de 6 à 20 épisodes ;
3. le provider local renvoie un contrat strict, puis la validation déterministe
   contrôle les identifiants, les budgets et la diversité relationnelle ;
4. le document candidat conserve tâche, version, modèle, prompt compilé et
   empreintes d'entrée ;
5. l'auteur modifie, retire, ajoute ou réordonne les items dans le comparateur ;
6. l'acceptation, protégée par les révisions du candidat et du plan, applique
   exactement la dernière version relue.

La validation déterministe précède tout audit IA. Elle refuse notamment un cast
ou un lieu absent de la Bible, moins de 6 ou plus de 20 items, un cliffhanger
vide, un enjeu relationnel répété et un secret révélé hors de son budget. Les
erreurs sont structurées par item afin d'être affichables sans interpréter un
texte de modèle.

## Péremption et concurrence

L'empreinte canonique couvre les entrées qui changent le sens d'une saison :
casting, relations, secrets et template de format. Une modification de ces
entrées rend le candidat périmé. La lecture reste possible pour comparer ou
copier son contenu, mais l'acceptation échoue avec `season_proposal_stale` ; il
n'existe aucune régénération silencieuse.

Le candidat porte sa propre révision optimiste, indépendante de celle du
`SeasonPlan`. Une édition avec une ancienne révision échoue avec
`proposal_revision_conflict`. L'acceptation exige à la fois la révision relue du
candidat et celle du plan : un plan modifié dans une autre fenêtre provoque
`season_plan_revision_conflict`. Les champs édités manuellement sont ceux du
document candidat persisté et sont recopiés tels quels lors de l'acceptation.

## Surface API

Les routes sont regroupées sous `/api/season-plan` :

- `GET /proposal` lit le candidat courant ;
- `POST /proposal/generate` crée un candidat avec `episode_count`, `model` et un
  éventuel `custom_prompt` ;
- `PUT /proposal` remplace atomiquement ses items avec `expected_revision` ;
- `POST /proposal/accept` exige `expected_revision` et
  `expected_plan_revision`, puis renvoie le `SeasonPlan` canonique.

Les réponses de proposition exposent son identité, sa révision, la révision de
plan de départ, `stale`, la provenance, les items et le rapport de validation.
Une proposition invalide ou contenant des IDs inconnus reste consultable pour
être corrigée, mais son acceptation est rejetée en `422`; les conflits de
révision et la péremption sont des `409` avec les codes stables décrits
ci-dessus.

## Fake CI et fixture golden

`tests/fixtures/tentafruit-season-six-episodes.json` décrit une Bible autonome et
une sortie de six épisodes aux enjeux relationnels distincts. Le fake produit
toujours cette sortie à contexte identique : aucun modèle n'est téléchargé et
aucun service Ollama n'est requis. La fixture couvre plusieurs personnages,
relations, lieux et secrets avec une révélation progressive ; elle sert à la
fois de test de contrat, de diversité des beats et de base reproductible pour
les contrats API.
