# Stratégie de tests frontend

Le frontend suit une pyramide volontairement courte :

1. Vitest vérifie les unités techniques et les contrats d'API sans DOM ;
2. React Testing Library vérifie les composants et leur accessibilité observable sous jsdom ;
3. les tests d'intégration assemblent AppKernel, TanStack Query, locale et API simulée ;
4. Playwright conserve les parcours critiques dans le Studio réellement servi par FastAPI.

Les tests ne contactent jamais un service externe. `renderWithStudio`, exporté depuis
`frontend/src/test/`, crée un QueryClient isolé sans retry, un AppKernel pilotable et un adaptateur
API dont toutes les routes doivent être déclarées. Une route absente échoue immédiatement avec une
ApiError 501 et les appels sont journalisés pour permettre des assertions précises.

```tsx
const api = createMockApi({
  "episode.read": { id: "episode-1", title: "Opening" },
});

const result = renderWithStudio(<EpisodeEditor />, {
  api,
  context: { projectId: "project-1", episodeId: "episode-1" },
  locale: "fr-FR",
});
```

## Boucles locales

```powershell
npm --prefix frontend run lint
npm --prefix frontend run test:unit
npm --prefix frontend run check
```

Biome assure le lint TypeScript/React sans remplacer ni réduire TypeScript 7. Le gate `check`
enchaîne lint, typecheck, contrats d'architecture, tests et build Vite.

## CI et rapports

Le workflow Windows possède un job frontend autonome avec cache npm et installation par lockfile.
Il exécute `check`, reconstruit le bundle et publie un rapport JUnit Vitest même après un échec.
Le rapport JUnit et la couverture Python sont également publiés avec `if: always()`. Le packaging
desktop ne démarre qu'après succès des deux jobs de qualité.

Un contrat HTML/JavaScript historique ne doit être retiré que lorsque le même comportement est
couvert par un test de composant, d'intégration ou un parcours Playwright réel.
