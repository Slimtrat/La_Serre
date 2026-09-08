# Kit d'interface Tentafruit

Le kit partagé vit dans `frontend/src/shared/ui/`. Il fournit des primitives visuelles sans
connaissance métier. Les features composent ces primitives et restent propriétaires de leurs
libellés, de la validation métier et des appels API.

## Tokens et styles

Les tokens sémantiques sont définis dans `frontend/src/shared/styles/tokens.css` et chargés une
seule fois par le point d'entrée React. Ils couvrent couleurs, espacements, typographie, rayons,
élévations, mouvements et couches z-index. Les composants utilisent les variables `--ui-*` pour
les décisions de thème ; leurs règles restent colocalisées dans des modules CSS.

Cette approche est le socle CSS retenu pour F05. Elle ne nécessite aucun runtime ni générateur de
classes, s'intègre nativement à Vite et permet de supprimer progressivement le CSS historique à
mesure que chaque parcours migre. Un framework utilitaire ou une bibliothèque de composants ne
réduirait pas encore le CSS legacy, tout en ajoutant une seconde convention et une dépendance.

## Composition

- `Button` et `IconButton` déclenchent une action. Un bouton icône reçoit toujours un nom
  accessible explicite.
- `Card`, `Badge`, `MediaFrame`, `Progress` et `Skeleton` structurent ou rendent un état. Un
  squelette ne remplace jamais un libellé d'état de chargement accessible.
- `Field`, `Textarea` et `Select` relient libellé, aide et erreur au contrôle. La feature fournit
  le texte et décide quand afficher la validation.
- `Tabs` représente un seul ensemble d'onglets ; les flèches déplacent le focus.
- `Dialog`, `Drawer` et `ConfirmAction` sont contrôlés par leur parent. Ils ferment sur Échap,
  gardent le focus dans la surface et le restituent au déclencheur.
- `EmptyState` et `ErrorState` acceptent une action React facultative afin que les erreurs restent
  actionnables et que les libellés ne soient jamais codés en dur dans le kit.

Les variantes décrivent une intention (`primary`, `secondary`, `danger`, `stale`) plutôt qu'une
couleur concrète. Un état obsolète utilise le token `--ui-color-stale`, un message explicite et,
si possible, une action de rafraîchissement. Les erreurs combinent un texte compréhensible avec
une action de reprise ; elles ne reposent jamais sur la couleur seule.

## Galerie locale

En développement, démarrez le watcher puis ouvrez le Studio avec `?gallery=components` :

```powershell
npm --prefix frontend run dev
```

La galerie montre les composants et les états normal, chargement, désactivé, erreur, obsolète et
vide. Elle est exclue du comportement de production par le mode de compilation Vite. Le smoke de
galerie produit des captures desktop et étroite dans `artifacts/`.

## Vérifications

```powershell
npm --prefix frontend run test:ui
npm --prefix frontend run check
```

Les tests d'interaction vérifient rôles, noms accessibles, navigation clavier, liens de
description/erreur et gestion du focus sur les surfaces modales. Les assertions s'appuient sur le
DOM accessible, sans ajouter une dépendance d'audit redondante.
