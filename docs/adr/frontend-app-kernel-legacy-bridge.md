# ADR — AppKernel et pont legacy typé

- Statut : accepté
- Date : 2026-09-08
- Portée : frontend/src/app/kernel et frontend/src/shared/legacy

## Contexte

React et les scripts historiques cohabitent pendant la migration du Studio. Les globals window.Serre et les événements studio:* restent nécessaires aux surfaces non migrées, mais ils ne doivent pas devenir une API implicite pour les nouvelles fonctionnalités.

## Décision

AppKernel est la frontière injectée dans React par AppKernelProvider. Il expose cinq ports explicites : contexte actif, navigation, notifications, runtime et activité. Une feature consomme uniquement les hooks publics du kernel et ne connaît ni window, ni le DOM historique, ni l’ordre de chargement des scripts.

LegacyBridge est l’unique adaptateur autorisé à connaître window.Serre* et les événements studio:*. La composition entre les deux vit dans app/kernel/LegacyAppKernel.ts. Le bridge est temporaire : l’état durable reste lu et écrit via les API FastAPI.

## Contrat de transition

| Besoin | Commande legacy | Événement reçu |
| --- | --- | --- |
| Projet actif | SerreProjects.activate | studio:project-changed |
| Épisode actif | SerreEpisode.refresh | studio:episode-loaded, studio:episode-cleared |
| Plan actif | contexte React temporaire | studio:shot-selected |
| Vue du Studio | SerreWorkspace.show | studio:workspace-changed |
| Notification | SerreStudio.notify | aucun état durable |
| Runtime | SerreRuntimeManager | studio:runtime, studio:runtime-preparation |
| Activité | SerreActivity et studio:stage-job | événements job, épisode, narration et démo |

L’initialisation est particulière : SerreProjects.ready ne publie pas d’événement. LegacyBridge attend donc cette promesse puis lit les snapshots projet, épisode, runtime et activité. Les changements suivants passent par les événements typés.

## Cycle de vie

Le provider crée une instance de kernel par racine React. Le démarrage est idempotent. Au démontage, tous les abonnements DOM et React sont retirés. Une nouvelle instance remplace l’ancienne sur le même host pendant le hot reload. En développement, les commandes inconnues, doubles abonnements et abonnements oubliés sont signalés.

Le shell historique émet studio:workspace-changed seulement lorsque la vue change réellement. Le store du contexte compare les quatre identifiants avant de notifier React, afin qu’un événement historique répété ne provoque pas plusieurs mises à jour.

## Garde-fous

Le contrôle d’architecture interdit window.Serre* partout dans frontend/src sauf sous shared/legacy. Il continue aussi d’interdire les fetch directs dans les features. Les tests couvrent les mappings, l’hydratation initiale, les deux sens React/legacy, le hot reload et le nettoyage au démontage.

## Sortie du bridge

Un mapping peut être supprimé dès que sa surface historique a été remplacée, que son état durable vient du client API généré et que le parcours équivalent est couvert par le smoke navigateur. F10 supprimera les globals restants ; aucun nouveau mapping ne doit être ajouté sans une issue de migration associée.