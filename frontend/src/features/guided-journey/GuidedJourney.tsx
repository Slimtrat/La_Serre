import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
  acceptProposalApiGuidedProposalsProposalIdAcceptPost,
  createCharacterApiGuidedCharactersPost,
  createEpisodeApiEpisodesPost,
  generateProposalApiGuidedProposalsPost,
  getGuidedApiGuidedGet,
  journeyApiStudioJourneyGet,
  putBriefApiGuidedBriefPut,
  putEpisodeLinkApiGuidedEpisodeLinkPut,
  rejectProposalApiGuidedProposalsProposalIdRejectPost,
  type GuidedProjectBrief,
  type JourneyStageSnapshotId,
} from "@/generated/openapi";
import { ErrorState, Progress, Skeleton } from "@shared";

import { JourneyContext } from "./JourneyContext";
import { JourneyStepper } from "./JourneyStepper";
import { decodeGuidedPayload, type GuidedProposal, nextJourneyStage } from "./model";
import { ProposalReviewDrawer } from "./ProposalReviewDrawer";
import { StageHost } from "./StageHost";
import styles from "./guidedJourney.module.css";

const LABELS = {
  fr: { idea: "Idée", casting: "Casting", relationships: "Relations", season: "Saison", episode: "Épisode", storyboard: "Storyboard", production: "Production", release: "Résultat" },
  en: { idea: "Idea", casting: "Cast", relationships: "Relationships", season: "Season", episode: "Episode", storyboard: "Storyboard", production: "Production", release: "Release" },
} as const;

export interface GuidedJourneyProps {
  readonly locale: "fr" | "en";
  readonly onNavigate: (target: "produce" | "results" | "bible" | "settings" | "graph") => void;
  readonly slots?: Partial<Record<JourneyStageSnapshotId, ReactNode>>;
}

export function GuidedJourney({ locale, onNavigate, slots }: GuidedJourneyProps) {
  const queryClient = useQueryClient();
  const journey = useQuery({ queryKey: ["studio-journey"], queryFn: journeyApiStudioJourneyGet });
  const guidedQuery = useQuery({ queryKey: ["guided-authoring"], queryFn: getGuidedApiGuidedGet, select: decodeGuidedPayload });
  const [activeStage, setActiveStage] = useState<JourneyStageSnapshotId>("idea");
  const [selected, setSelected] = useState(false);
  const [proposal, setProposal] = useState<GuidedProposal | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selected && journey.data) setActiveStage(nextJourneyStage(journey.data).id);
  }, [journey.data, selected]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["guided-authoring"] }),
      queryClient.invalidateQueries({ queryKey: ["studio-journey"] }),
    ]);
  };
  const mutation = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    onSuccess: refresh,
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Le brouillon a changé. Recharge la vue."),
  });
  const guided = guidedQuery.data;
  const context = useMemo(() => ({ activeStage, selectStage: (stage: JourneyStageSnapshotId) => { setSelected(true); setActiveStage(stage); }, navigate: onNavigate }), [activeStage, onNavigate]);

  if (journey.isPending || guidedQuery.isPending) return <Skeleton aria-label="Chargement du parcours" height="24rem" width="100%" />;
  if (journey.error || guidedQuery.error || !journey.data || !guided) return <ErrorState title="Parcours indisponible" description="Recharge le Studio pour retrouver ton brouillon." />;
  const current = journey.data.stages.find((stage) => stage.id === activeStage) ?? journey.data.stages[0];
  const completed = journey.data.stages.filter((stage) => ["approved", "completed"].includes(stage.status)).length;

  const propose = async (target: string) => {
    setError("");
    try {
      const response = await generateProposalApiGuidedProposalsPost({ expected_revision: guided.revision, target, mode: "improve", locale });
      const decoded = decodeGuidedPayload(response);
      setProposal(decoded.proposals.find((item) => item.status === "candidate") ?? null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Proposition impossible");
    }
  };

  return (
    <JourneyContext value={context}>
      <main className={styles.root} data-guided-journey>
        <header className={styles.hero}><div><small>CRÉATION GUIDÉE</small><h1>Ton épisode, de l’idée au rendu</h1><p>Tu gardes la décision. L’IA propose, le Studio montre les conséquences.</p></div><Progress label={`${completed} / ${journey.data.stages.length}`} value={completed} max={journey.data.stages.length} /></header>
        <JourneyStepper labels={LABELS[locale]} navigationLabel={locale === "fr" ? "Parcours de création" : "Creation journey"} stages={journey.data.stages} />
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <StageHost
          busy={mutation.isPending}
          guided={guided}
          locale={locale}
          onAddCharacter={() => mutation.mutate(() => createCharacterApiGuidedCharactersPost({ expected_revision: guided.revision }))}
          onCreateEpisode={() =>
            mutation.mutate(async () => {
              const created = await createEpisodeApiEpisodesPost({
                title: guided.brief.episode_title || "Épisode sans titre",
                concept: guided.brief.episode_concept || guided.brief.idea,
              });
              const episodeId = (created as { id?: unknown }).id;
              if (typeof episodeId !== "string") throw new Error("Épisode créé sans identifiant");
              return putEpisodeLinkApiGuidedEpisodeLinkPut({
                expected_revision: guided.revision,
                episode_id: episodeId,
              });
            })
          }
          onPropose={propose}
          onSaveBrief={(brief: GuidedProjectBrief) => mutation.mutate(() => putBriefApiGuidedBriefPut({ expected_revision: guided.revision, brief }))}
          slots={slots}
          stage={current}
        />
        <ProposalReviewDrawer
          busy={mutation.isPending}
          onAccept={(edited) => proposal && mutation.mutate(() => acceptProposalApiGuidedProposalsProposalIdAcceptPost(proposal.id, { expected_revision: guided.revision, edited_after: { ...edited } }), { onSuccess: () => setProposal(null) })}
          onClose={() => setProposal(null)}
          onReject={() => proposal && mutation.mutate(() => rejectProposalApiGuidedProposalsProposalIdRejectPost(proposal.id), { onSuccess: () => setProposal(null) })}
          proposal={proposal}
        />
      </main>
    </JourneyContext>
  );
}
