import { useEffect, useState } from "react";

import { normalizeStudioLocale, type StudioLocale } from "../router";

function documentLocale(): StudioLocale {
  return normalizeStudioLocale(
    typeof document === "undefined" ? undefined : document.documentElement.lang,
  );
}

export function useStudioLocale(): readonly [
  StudioLocale,
  (locale: StudioLocale) => void,
] {
  const [locale, setLocale] = useState(documentLocale);

  useEffect(() => {
    const onLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { locale?: string; language?: string }
        | undefined;
      setLocale(
        normalizeStudioLocale(detail?.locale ?? detail?.language ?? documentLocale()),
      );
    };
    window.addEventListener("studio:language-changed", onLanguageChange);
    return () =>
      window.removeEventListener("studio:language-changed", onLanguageChange);
  }, []);

  const requestLocale = (nextLocale: StudioLocale) => {
    window.dispatchEvent(
      new CustomEvent("studio:language-change-request", {
        detail: { locale: nextLocale },
      }),
    );
    setLocale(nextLocale);
  };

  return [locale, requestLocale] as const;
}
