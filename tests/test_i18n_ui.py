from pathlib import Path

STATIC = Path("apps/api/static")


def test_i18n_runtime_has_real_locale_contract() -> None:
    source = (STATIC / "i18n.js").read_text(encoding="utf-8")

    assert 'const DEFAULT_LANGUAGE = "fr"' in source
    assert 'Object.freeze(["fr", "en"])' in source
    assert '"serre-studio-language"' in source
    assert "navigator.language" in source
    assert "function t(key, params = {})" in source
    assert "function interpolate(value, params)" in source
    assert "function setLanguage(nextLanguage" in source
    assert "function register(locale, catalog)" in source
    assert 'function localize(value, namespace = "dto")' in source
    assert 'new CustomEvent("serre:language-changed"' in source
    assert 'new CustomEvent("serre:i18n-changed"' in source
    assert 'new CustomEvent("studio:language-changed"' in source
    assert "locale: () => language, setLocale: setLanguage" in source
    assert '"studio:language-change-request"' in source
    assert 'attributeFilter: ["title", "aria-label", "placeholder"]' in source
    assert 'fallbackLanguage: DEFAULT_LANGUAGE' in source
    assert 'items: { one: "{count} élément", other: "{count} éléments" }' in source
    assert 'items: { one: "{count} item", other: "{count} items" }' in source
    assert 'fallbackProof: "Texte de secours"' in source


def test_i18n_catalog_covers_primary_product_surfaces() -> None:
    source = (STATIC / "i18n.js").read_text(encoding="utf-8")

    for namespace in (
        "common",
        "shell",
        "project",
        "graph",
        "episode",
        "settings",
        "bible",
        "queue",
        "outputs",
        "notifications",
        "gettingStarted",
        "dto",
    ):
        assert f"      {namespace}: {{" in source

    assert 'shotReview: "Validation du découpage"' in source
    assert 'shotReview: "Shot review"' in source
    assert 'charactersAria: "Personnages, ressource de série"' in source
    assert 'charactersAria: "Characters, series resource"' in source


def test_object_navigation_replaces_visible_legacy_tabs() -> None:
    html = (STATIC / "index.html").read_text(encoding="utf-8")

    assert 'class="studio-context"' in html
    assert 'class="app-nav legacy-workspace-nav"' in html
    assert 'hidden aria-hidden="true"' in html
    assert 'id="project-select"' in html
    assert 'id="episode-select"' in html
    assert 'id="context-shot-label"' in html
    assert 'id="series-cast-open"' in html
    assert 'data-i18n-aria-label="shell.charactersAria"' in html
    assert 'data-tool-action="assets"' in html
    assert 'id="notification-toggle"' in html
    assert 'id="getting-started-open"' in html
    assert 'id="settings-toggle"' in html
    assert 'id="language-select"' in html
    assert html.index("/static/i18n.js") < html.index("/static/notifications.js")


def test_context_navigation_actions_keep_existing_workspace_contracts() -> None:
    source = (STATIC / "workspace-shell.js").read_text(encoding="utf-8")
    queue = (STATIC / "production-queue.js").read_text(encoding="utf-8")
    projects = (STATIC / "projects.js").read_text(encoding="utf-8")

    assert 'document.querySelector(\'[data-context-action="bible"]\')' in source
    assert 'document.querySelector("#series-cast-open")' in source
    assert 'show("bible")' in source
    assert 'window.SerreBible?.selectCategory?.("characters")' in source
    assert 'document.querySelector(\'[data-tool-action="assets"]\')' in source
    assert "window.SerreAssetDrawer?.open()" in source
    assert 'document.querySelector(".service-status")' in source
    assert 'show("settings")' in source
    assert 'document.querySelector(".studio-tools")' in queue
    assert 'manageButton.textContent = window.SerreI18n?.t("shell.manageProjects")' in projects
    assert 'deleteDiscoveryButton.textContent = "Supprimer"' in projects


def test_header_is_responsive_and_legacy_icons_are_not_the_navigation() -> None:
    css = (STATIC / "i18n.css").read_text(encoding="utf-8")

    assert ".legacy-workspace-nav[hidden]" in css
    assert ".studio-context" in css
    assert ".studio-tools" in css
    assert ".language-switcher" in css
    assert ".series-resource" in css
    assert "@media (max-width: 760px)" in css
    assert "grid-template-rows: 106px minmax(0, 1fr)" in css
