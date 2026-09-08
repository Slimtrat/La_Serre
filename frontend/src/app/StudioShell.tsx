import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { GuidedJourney } from "@features/guided-journey";
import { SetupWizard } from "@features/setup";

import {
  Button,
  EmptyState,
  ErrorState,
  LegacyWorkspaceSlot,
} from "@shared";
import {
  requestLegacyTool,
  type LegacyTool,
} from "@shared/legacy/LegacyToolRequest";

import { useActiveContext, useAppKernel } from "./kernel";
import {
  createStudioRouter,
  getStudioMessages,
  studioRoute,
  type StudioRouteName,
  type StudioRouter,
} from "./router";
import { ContextBar } from "./shell/ContextBar";
import { getStudioShellMessages } from "./shell/messages";
import { PrimaryNavigation } from "./shell/PrimaryNavigation";
import { RuntimeStatus } from "./shell/RuntimeStatus";
import styles from "./shell/StudioShell.module.css";
import { useStudioCatalog } from "./shell/studioCatalog";
import { ToolsMenu } from "./shell/ToolsMenu";
import { useStudioLocale } from "./shell/useStudioLocale";

const WORKSPACE_BY_ROUTE = {
  create: "guided",
  produce: "plan",
  results: "outputs",
  bible: "bible",
  settings: "settings",
  graph: "graph",
} as const;

const LEGACY_ROOT_BY_WORKSPACE = {
  guided: "#guided-workspace",
  graph: '[data-desktop-panel="graph"]',
  plan: '[data-desktop-panel="plan"]',
  outputs: '[data-desktop-panel="outputs"]',
  bible: "#bible-workspace",
  settings: '[data-desktop-panel="settings"]',
} as const;

export interface StudioShellProps {
  readonly router?: StudioRouter;
  readonly resolveLegacyRoot?: (selector: string) => HTMLElement | null;
}

function browserRouter(): StudioRouter {
  return createStudioRouter(window);
}

function routeContext(context: ReturnType<typeof useActiveContext>) {
  return {
    projectId: context.projectId ?? undefined,
    seriesId: context.seriesId ?? undefined,
    episodeId: context.episodeId ?? undefined,
    shotId: context.shotId ?? undefined,
  };
}

export function StudioShell({
  router: injectedRouter,
  resolveLegacyRoot = (selector) => document.querySelector(selector),
}: StudioShellProps) {
  const [defaultRouter] = useState(browserRouter);
  const router = injectedRouter ?? defaultRouter;
  const route = useSyncExternalStore(
    router.subscribe,
    router.getSnapshot,
    router.getSnapshot,
  );
  const kernel = useAppKernel();
  const context = useActiveContext();
  const initialRoute = useRef(route);
  const [contextHydrated, setContextHydrated] = useState(false);
  const [locale, setLocale] = useStudioLocale();
  const messages = getStudioMessages(locale);
  const shellMessages = getStudioShellMessages(locale);
  const catalog = useStudioCatalog(context.projectId);

  useEffect(() => {
    const root = document.getElementById("studio-react-root");
    if (!root) return;
    root.dataset.shellOwner = "react";
    window.dispatchEvent(new Event("studio:shell-owner-changed"));
    return () => {
      delete root.dataset.shellOwner;
      window.dispatchEvent(new Event("studio:shell-owner-changed"));
    };
  }, []);

  useEffect(() => {
    if (contextHydrated || initialRoute.current.kind === "not-found") {
      if (!contextHydrated) setContextHydrated(true);
      return;
    }
    const desired = initialRoute.current.context;
    if (desired.projectId && desired.projectId !== context.projectId) {
      kernel.activeContext.selectProject(desired.projectId);
      return;
    }
    if (desired.seriesId && desired.seriesId !== context.seriesId) {
      kernel.activeContext.selectSeries(desired.seriesId);
      return;
    }
    if (desired.episodeId && desired.episodeId !== context.episodeId) {
      kernel.activeContext.selectEpisode(desired.episodeId);
      return;
    }
    if (desired.shotId && desired.shotId !== context.shotId) {
      kernel.activeContext.selectShot(desired.shotId);
      return;
    }
    setContextHydrated(true);
  }, [context, contextHydrated, kernel]);

  useEffect(() => {
    if (!contextHydrated || route.kind === "not-found") return;
    router.navigate(studioRoute(route.name, routeContext(context)), {
      replace: true,
    });
  }, [context, contextHydrated, route, router]);

  const navigate = (name: StudioRouteName) => {
    router.navigate(studioRoute(name, routeContext(context)));
  };
  const openTool = (tool: LegacyTool) => requestLegacyTool(tool);

  const routeContent = (() => {
    if (route.kind === "not-found") {
      return (
        <ErrorState
          action={
            <Button onClick={() => navigate("create")}>
              {messages.notFound.backToCreate}
            </Button>
          }
          className={styles.routeState}
          description={messages.notFound.description}
          title={messages.notFound.title}
        />
      );
    }

    if (catalog.projects.isSuccess && catalog.projects.data.length === 0) {
      return (
        <EmptyState
          action={
            <Button onClick={() => openTool("project-new")}>
              {shellMessages.createProject}
            </Button>
          }
          className={styles.routeState}
          description={shellMessages.noProjectDescription}
          title={shellMessages.noProjectTitle}
        />
      );
    }

    if (route.name === "create") {
      return (
        <SetupWizard
          locale={locale}
          readyContent={<GuidedJourney locale={locale} onNavigate={navigate} />}
        />
      );
    }

    const workspace = WORKSPACE_BY_ROUTE[route.name];
    const selector = LEGACY_ROOT_BY_WORKSPACE[workspace];
    return (
      <LegacyWorkspaceSlot
        aria-label={messages.routes[route.name]}
        className={styles.workspaceSlot}
        kernel={kernel}
        key={workspace}
        resolveLegacyRoot={() => resolveLegacyRoot(selector)}
        unavailable={
          <ErrorState
            description={messages.notFound.description}
            title={messages.routes[route.name]}
          />
        }
        view={workspace}
      />
    );
  })();

  return (
    <div className={styles.shell} data-studio-shell>
      <header className={styles.header}>
        <a className={styles.brand} href="#/create">
          <span aria-hidden="true" className={styles.brandMark}>SV</span>
          <span className={styles.brandText}>
            <strong>{shellMessages.brand}</strong>
            <small>{shellMessages.studio}</small>
          </span>
        </a>
        <PrimaryNavigation
          messages={messages}
          onNavigate={navigate}
          route={route}
        />
        <div className={styles.actions}>
          <RuntimeStatus labels={shellMessages.runtime} />
          <ToolsMenu
            labels={shellMessages.tools}
            onNavigate={navigate}
          />
          <label>
            <span className="sr-only">{shellMessages.language}</span>
            <select
              aria-label={shellMessages.language}
              className={styles.languageSelect}
              onChange={(event) =>
                setLocale(event.currentTarget.value === "en" ? "en" : "fr")
              }
              value={locale}
            >
              <option value="fr">FR</option>
              <option value="en">EN</option>
            </select>
          </label>
        </div>
        <ContextBar
          labels={shellMessages.context}
          onOpenShot={() => navigate("produce")}
        />
      </header>
      {routeContent}
    </div>
  );
}

