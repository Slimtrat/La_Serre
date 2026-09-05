(function coherenceWorkbench() {
  "use strict";

  const api = window.SerreStudio;
  let activeNodeId = null;
  let activeReport = null;

  window.SerreI18n?.register("fr", {
    coherence: {
      running: "Le comité relit le dossier…",
      title: "Contrôle de cohérence",
      approve: "Valider humainement",
      override: "Documenter une dérogation",
      approved: "Validé par un humain",
      rerun: "Relancer le contrôle",
      noFinding: "Aucune incohérence détectée.",
      aiUnavailable: "Avis IA indisponible",
      blocker: "Bloquant",
      warning: "À vérifier",
      suggestion: "Suggestion",
      reviewers: "Comité local",
      deterministic: "Règles strictes",
      reason: "Explique la dérogation (10 caractères minimum). Elle sera historisée :",
      cancelled: "Validation humaine annulée.",
      reportReady: "Rapport de cohérence prêt.",
      humanGate: "Décision humaine",
      gate: "Validation du découpage",
      gateDetail: "Règles strictes + comité IA local + décision humaine",
      run: "Contrôler la cohérence",
      technicalDetail: "DÉTAIL TECHNIQUE DE LA GATE",
      check: "Vérifier la cohérence",
      checkStory: "Contrôler histoire & continuité",
      checkShot: "Contrôler ce plan",
      finalCheck: "Contrôle final de cohérence",
      compareStory: "Comparer à l’histoire",
      launch: "Lancer le contrôle",
      technicalContract: "Voir le contrat technique",
      checkCharacters: "Contrôler les personnages",
      finalNarrativeCheck: "Contrôle narratif final",
      gateSubtitle: "Gate humaine · shot.json",
      gateDescription: "Contrôle histoire, canon, personnages et dialogues avant production.",
      gateProvider: "Règles strictes · comité IA local · décision humaine",
      seriesBible: "BIBLE · SÉRIE",
      seriesCastProvider: "Bible de série",
    },
  });
  window.SerreI18n?.register("en", {
    coherence: {
      running: "The committee is reviewing the file…",
      title: "Consistency review",
      approve: "Human approval",
      override: "Document an override",
      approved: "Human-approved",
      rerun: "Run review again",
      noFinding: "No inconsistency detected.",
      aiUnavailable: "AI review unavailable",
      blocker: "Blocker",
      warning: "Review needed",
      suggestion: "Suggestion",
      reviewers: "Local committee",
      deterministic: "Strict rules",
      reason: "Explain the override (10 characters minimum). It will be recorded:",
      cancelled: "Human approval cancelled.",
      reportReady: "Consistency report ready.",
      humanGate: "Human decision",
      gate: "Shot review",
      gateDetail: "Strict rules + local AI committee + human decision",
      run: "Run consistency review",
      technicalDetail: "TECHNICAL GATE DETAIL",
      check: "Check consistency",
      checkStory: "Review story & continuity",
      checkShot: "Review this shot",
      finalCheck: "Final consistency review",
      compareStory: "Compare with story",
      launch: "Run the review",
      technicalContract: "View technical contract",
      checkCharacters: "Review characters",
      finalNarrativeCheck: "Final narrative review",
      gateSubtitle: "Human gate · shot.json",
      gateDescription: "Checks story, canon, characters and dialogue before production.",
      gateProvider: "Strict rules · local AI committee · human decision",
      seriesBible: "BIBLE · SERIES",
      seriesCastProvider: "Series Bible",
    },
  });

  function t(key) {
    return window.SerreI18n?.t("coherence." + key) || key;
  }

  async function request(path, options = {}) {
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.detail || "Contrôle de cohérence impossible");
      error.status = response.status;
      throw error;
    }
    return body;
  }

  function reportHost() {
    const inspector = document.querySelector("#graph-inspector");
    if (!inspector) return null;
    let host = inspector.querySelector("#graph-coherence-report");
    if (!host) {
      host = document.createElement("section");
      host.id = "graph-coherence-report";
      host.className = "graph-coherence-report hidden";
      host.setAttribute("aria-live", "polite");
      const actions = inspector.querySelector("#graph-inspector-actions");
      inspector.insertBefore(host, actions);
    }
    return host;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function severityLabel(severity) {
    return t(severity === "blocker" ? "blocker" : severity === "warning" ? "warning" : "suggestion");
  }

  function render(report) {
    activeReport = report;
    const host = reportHost();
    if (!host) return;
    host.classList.remove("hidden", "is-loading");
    host.dataset.status = report.status;
    host.replaceChildren();

    const heading = element("header", "coherence-report-heading");
    const titleWrap = element("div");
    titleWrap.append(
      element("span", "coherence-kicker", t("title")),
      element("strong", "", report.summary),
    );
    const status = element("span", "coherence-status", report.status.toUpperCase());
    heading.append(titleWrap, status);
    host.append(heading);

    const sources = element("div", "coherence-sources");
    sources.append(
      element("span", "", "✓ " + t("deterministic")),
      element(
        "span",
        report.ai_status === "complete" ? "" : "is-muted",
        (report.ai_status === "complete" ? "✓ " + t("reviewers") : "○ " + t("aiUnavailable"))
          + (report.model ? " · " + report.model : ""),
      ),
    );
    host.append(sources);

    if (report.reviewers?.length) {
      const reviewers = element("div", "coherence-reviewers");
      for (const review of report.reviewers) {
        const pill = element("span", "coherence-reviewer " + review.verdict);
        pill.append(
          element("strong", "", review.reviewer),
          element("small", "", review.summary),
        );
        reviewers.append(pill);
      }
      host.append(reviewers);
    }

    const findings = element("ol", "coherence-findings");
    if (!report.findings?.length) {
      findings.append(element("li", "coherence-empty", t("noFinding")));
    } else {
      for (const finding of report.findings) {
        const item = element("li", "coherence-finding " + finding.severity);
        const findingHead = element("div", "coherence-finding-head");
        findingHead.append(
          element("span", "coherence-severity", severityLabel(finding.severity)),
          element("strong", "", finding.title),
        );
        item.append(findingHead, element("p", "", finding.message));
        if (finding.evidence) item.append(element("blockquote", "", finding.evidence));
        if (finding.recommendation) {
          item.append(element("small", "coherence-recommendation", "→ " + finding.recommendation));
        }
        const path = [finding.subject_path, finding.character_id].filter(Boolean).join(" · ");
        if (path) item.append(element("code", "", path));
        findings.append(item);
      }
    }
    host.append(findings);

    const footer = element("footer", "coherence-report-actions");
    if (report.approved_at) {
      const approved = element("span", "coherence-approved", "✓ " + t("approved"));
      approved.title = new Date(report.approved_at).toLocaleString(
        window.SerreI18n?.getLocale?.() || "fr-FR",
      );
      footer.append(approved);
    } else {
      const approveButton = element(
        "button",
        "button " + (report.can_approve ? "primary" : "ghost"),
        report.can_approve ? t("approve") : t("override"),
      );
      approveButton.type = "button";
      approveButton.addEventListener("click", () => approve(report, approveButton));
      footer.append(approveButton);
    }
    const rerun = element("button", "button ghost", t("rerun"));
    rerun.type = "button";
    rerun.addEventListener("click", () => runLastContext());
    footer.append(rerun);
    host.append(footer);
  }

  function renderLoading() {
    const host = reportHost();
    if (!host) return;
    host.classList.remove("hidden");
    host.classList.add("is-loading");
    host.removeAttribute("data-status");
    host.replaceChildren(
      element("span", "coherence-spinner", "✦"),
      element("strong", "", t("running")),
    );
  }

  function resolveSubject(context = {}) {
    const graph = context.graph || window.SerreGraph?.current?.();
    const node = context.node || null;
    const shotId = node?.metadata?.shot_id;
    const episodeId = node?.metadata?.episode_id;
    if (shotId) return { scope: "shot", subjectId: shotId, graph, node };
    if (episodeId) return { scope: "episode", subjectId: episodeId, graph, node };
    if (graph?.scope === "shot") return { scope: "shot", subjectId: graph.id, graph, node };
    if (graph?.scope === "episode") return { scope: "episode", subjectId: graph.id, graph, node };
    return { scope: "series", subjectId: "series", graph, node };
  }

  let lastContext = null;

  async function run(focus = "all", context = {}) {
    const subject = resolveSubject(context);
    lastContext = { focus, context };
    activeNodeId = subject.node?.id || context.nodeId || null;
    renderLoading();
    const payload = {
      scope: subject.scope,
      subject_id: subject.subjectId,
      focus,
      use_ai: true,
    };
    if (subject.scope === "shot") {
      try {
        const current = api?.shot?.();
        if (current?.id === subject.subjectId) {
          payload.shot = current;
          payload.source_text = document.querySelector("#story-editor")?.value || "";
        }
      } catch (_error) { /* backend will report the invalid contract */ }
    }
    const model = document.querySelector("#ollama-model")?.value;
    if (model) payload.model = model;
    try {
      const report = await request("/api/coherence/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      render(report);
      window.dispatchEvent(new CustomEvent("studio:coherence", {
        detail: { report, nodeId: activeNodeId },
      }));
      api?.notify?.(t("reportReady"));
      return report;
    } catch (error) {
      const host = reportHost();
      host?.classList.remove("is-loading");
      if (host) host.replaceChildren(element("strong", "coherence-error", error.message));
      throw error;
    }
  }

  function runLastContext() {
    if (!lastContext) return Promise.resolve(null);
    return run(lastContext.focus, lastContext.context).catch((error) => api?.notify?.(error.message, true));
  }

  async function approve(report, button) {
    let overrideReason = null;
    if (!report.can_approve) {
      overrideReason = window.prompt(t("reason"), "");
      if (overrideReason === null) {
        api?.notify?.(t("cancelled"));
        return;
      }
      if (overrideReason.trim().length < 10) {
        api?.notify?.(t("reason"), true);
        return;
      }
    }
    button.disabled = true;
    try {
      const approved = await request(
        "/api/coherence/reports/" + encodeURIComponent(report.id) + "/approve",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ override_reason: overrideReason }),
        },
      );
      render(approved);
      window.dispatchEvent(new CustomEvent("studio:coherence-approved", {
        detail: { report: approved, nodeId: activeNodeId },
      }));
      api?.notify?.(t("approved"));
    } catch (error) {
      button.disabled = false;
      api?.notify?.(error.message, true);
    }
  }

  function reset(nodeId) {
    if (nodeId === activeNodeId) return;
    activeNodeId = nodeId;
    activeReport = null;
    const host = reportHost();
    host?.classList.add("hidden");
    host?.replaceChildren();
  }

  async function loadLatest(context = {}) {
    const subject = resolveSubject(context);
    const nodeId = subject.node?.id || context.nodeId || null;
    activeNodeId = nodeId;
    try {
      const report = await request(
        "/api/coherence/" + subject.scope + "/"
          + encodeURIComponent(subject.subjectId) + "/latest",
      );
      if (report && activeNodeId === nodeId) {
        render(report);
        window.dispatchEvent(new CustomEvent("studio:coherence", {
          detail: { report, nodeId },
        }));
      }
      return report;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async function currentShot(focus = "all") {
    let shotId = null;
    try { shotId = api?.shot?.().id; } catch (_error) { /* handled by API */ }
    if (shotId) {
      await window.SerreGraph?.load?.("shot", shotId);
      window.SerreWorkspace?.show?.("graph");
      window.SerreGraph?.selectNode?.("shot");
    }
    return run(focus, {
      graph: { scope: "shot", id: shotId },
      nodeId: "shot",
    });
  }

  window.SerreCoherence = Object.freeze({
    run, currentShot, reset, loadLatest, report: () => activeReport,
  });
})();
