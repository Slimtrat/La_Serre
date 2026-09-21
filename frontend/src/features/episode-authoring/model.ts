export interface EpisodeStory {
  readonly hook: string;
  readonly setup: string;
  readonly conflict: string;
  readonly reveal: string;
  readonly cliffhanger: string;
}

export interface EpisodeEntity {
  readonly id: string;
  readonly name: string;
}

export interface EpisodeRecord {
  readonly id: string;
  readonly title: string;
  readonly logline: string;
  readonly narrative_source: string;
  readonly story: EpisodeStory;
  readonly status: string;
  readonly duration_target: number;
  readonly characters: readonly string[];
  readonly locations: readonly string[];
  readonly shot_order: readonly string[];
  readonly shot_sources: Readonly<Record<string, string>>;
}

export interface EpisodeShot {
  readonly id: string;
  readonly duration: number;
  readonly location: string;
  readonly characters: readonly EpisodeEntity[];
  readonly camera: { readonly shot_type: string; readonly movement: string; readonly lens: string };
  readonly action: string;
  readonly dialogue: { readonly speaker: string; readonly text: string; readonly mode: string; readonly performance: { readonly intention: string; readonly emotion: string } | null } | null;
  readonly lighting: string;
  readonly mood: string;
  readonly style: readonly string[];
}

export interface EpisodeFormatOutput {
  readonly shot_count_min: number;
  readonly shot_count_max: number;
  readonly duration_seconds_min: number;
  readonly duration_seconds_max: number;
}

export interface EpisodeSnapshot {
  readonly episode: EpisodeRecord;
  readonly characters: readonly EpisodeEntity[];
  readonly locations: readonly EpisodeEntity[];
  readonly shots: readonly EpisodeShot[];
  readonly breakdown_fingerprint: string | null;
  readonly format_output: EpisodeFormatOutput;
}

export interface EpisodeDraftCandidate {
  readonly title: string;
  readonly logline: string;
  readonly narrative_source: string;
  readonly story: EpisodeStory;
  readonly character_ids: readonly string[];
  readonly location_ids: readonly string[];
}

export interface ShotBlueprint {
  readonly source_text: string;
  readonly duration: number;
  readonly location_id: string;
  readonly character_ids: readonly string[];
  readonly shot_type: string;
  readonly camera_movement: string;
  readonly lens: string;
  readonly action: string;
  readonly dialogue: { readonly speaker_id: string; readonly text: string; readonly mode: string; readonly intention: string; readonly emotion: string } | null;
  readonly lighting: string;
  readonly mood: string;
  readonly style: readonly string[];
}

export interface EpisodeBreakdownCandidate { readonly shots: readonly ShotBlueprint[]; }

export interface CandidateProvenance {
  readonly model: string;
  readonly task_id: string | null;
  readonly task_version: number | null;
  readonly input_fingerprint: string | null;
  readonly prompt: string;
}

export interface GeneratedCandidate<T> {
  readonly candidate: T;
  readonly provenance: CandidateProvenance;
}

export interface ReviewFinding {
  readonly severity: "blocker" | "warning";
  readonly title: string;
  readonly recommendation: string;
}

export interface ReviewReport {
  readonly episode_id: string;
  readonly created_at: string;
  readonly fingerprint: string;
  readonly status: "fail" | "warning" | "pass";
  readonly can_approve: boolean;
  readonly findings: readonly ReviewFinding[];
}

export interface GenerateCandidateRequest { readonly source_text?: string; readonly prompt?: string; readonly model?: string; }

export interface EpisodePatch {
  readonly title?: string;
  readonly logline?: string;
  readonly narrative_source?: string;
  readonly story?: EpisodeStory;
  readonly duration_target?: number;
  readonly characters?: readonly string[];
  readonly locations?: readonly string[];
  readonly status?: "idea" | "writing" | "review" | "draft";
}

export interface EpisodeAuthoringApi {
  get(id: string): Promise<EpisodeSnapshot>;
  update(id: string, patch: EpisodePatch): Promise<EpisodeSnapshot>;
  generateDraft(id: string, request: GenerateCandidateRequest): Promise<GeneratedCandidate<EpisodeDraftCandidate>>;
  applyDraft(id: string, candidate: EpisodeDraftCandidate, provenance?: CandidateProvenance): Promise<EpisodeSnapshot>;
  review(id: string): Promise<ReviewReport>;
  approve(id: string): Promise<EpisodeSnapshot>;
  generateBreakdown(id: string, request: GenerateCandidateRequest): Promise<GeneratedCandidate<EpisodeBreakdownCandidate>>;
  applyBreakdown(id: string, candidate: EpisodeBreakdownCandidate, provenance?: CandidateProvenance, expectedBreakdownFingerprint?: string | null): Promise<EpisodeSnapshot>;
}

/** Recreate editable blueprint cards from a canonical breakdown after reload. */
export function editableBreakdown(snapshot: EpisodeSnapshot): EpisodeBreakdownCandidate {
  const byId = new Map(snapshot.shots.map((shot) => [shot.id, shot]));
  return {
    shots: snapshot.episode.shot_order.flatMap((id) => {
      const shot = byId.get(id);
      if (!shot) return [];
      return [{
        source_text: snapshot.episode.shot_sources[id] ?? shot.action,
        duration: shot.duration,
        location_id: shot.location,
        character_ids: shot.characters.map((character) => character.id),
        shot_type: shot.camera.shot_type,
        camera_movement: shot.camera.movement,
        lens: shot.camera.lens,
        action: shot.action,
        dialogue: shot.dialogue ? {
          speaker_id: shot.dialogue.speaker,
          text: shot.dialogue.text,
          mode: shot.dialogue.mode,
          intention: shot.dialogue.performance?.intention ?? "",
          emotion: shot.dialogue.performance?.emotion ?? "",
        } : null,
        lighting: shot.lighting,
        mood: shot.mood,
        style: shot.style,
      }];
    }),
  };
}
