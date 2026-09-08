import type {
  StudioMessages,
  StudioRoute,
  StudioRouteName,
} from "../router";
import styles from "./StudioShell.module.css";

const PRIMARY_ROUTES = ["create", "produce", "results"] as const;

export interface PrimaryNavigationProps {
  readonly messages: StudioMessages;
  readonly route: StudioRoute;
  readonly onNavigate: (route: StudioRouteName) => void;
}

export function PrimaryNavigation({
  messages,
  route,
  onNavigate,
}: PrimaryNavigationProps) {
  return (
    <nav
      aria-label={messages.navigation.primaryName}
      className={styles.primaryNavigation}
      data-primary-navigation
    >
      {PRIMARY_ROUTES.map((name) => (
        <button
          aria-current={route.kind !== "not-found" && route.name === name ? "page" : undefined}
          key={name}
          onClick={() => onNavigate(name)}
          type="button"
        >
          {messages.routes[name]}
        </button>
      ))}
    </nav>
  );
}

