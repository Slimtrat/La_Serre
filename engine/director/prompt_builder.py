from __future__ import annotations

import re

from pydantic import BaseModel, ConfigDict

from engine.director.models import DialogueMode, Shot


class PromptPackage(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    positive: str
    negative: str
    semantic: dict[str, object]


class PromptBuilder:
    """Builds model-facing text while preserving the semantic ingredients."""

    default_negative = (
        "identity drift, face change, inconsistent anatomy, extra fingers, extra limbs, "
        "duplicate person, costume change, text, logo, watermark, low detail, oversaturated, "
        "triptych, comic panels, split screen, collage, multiple frames"
    )

    def build(self, shot: Shot) -> PromptPackage:
        cast = []
        for character in shot.characters:
            details = ", ".join(character.signature_details) or "no additional motif"
            cast.append(
                "\n".join(
                    [
                        f"{character.name} ({character.id}).",
                        "Maintain exact identity and proportions from every supplied reference.",
                        f"Appearance: {character.visual_description}.",
                        f"Wardrobe: {character.wardrobe}.",
                        f"Signature details: {details}.",
                        f"Position: {character.position}.",
                        f"Expression: {character.emotion}.",
                    ]
                )
            )

        characters = "\n\n".join(cast) if cast else "No character is visible in frame."
        dialogue_lines: list[str] = []
        for cue in shot.dialogues:
            delivery = {
                DialogueMode.ON_SCREEN: "speaks on camera",
                DialogueMode.OFF_SCREEN: "speaks from outside the frame",
                DialogueMode.VOICE_OVER: "delivers voice-over narration",
            }[cue.mode]
            line = (
                f"At {cue.offset_seconds:.2f}s, {cue.speaker} {delivery}. Exact spoken line: "
                f'"{cue.text}". Do not make the speaker visible unless the cast '
                "section explicitly places them in frame"
            )
            if cue.performance:
                performance = cue.performance
                line += (
                    f". Acting intention: {performance.intention}. Emotion: "
                    f"{performance.emotion}, intensity {performance.intensity:.2f}"
                )
            dialogue_lines.append(line)
        dialogue = "\n".join(dialogue_lines) or "No spoken dialogue in this shot."

        timeline = "No explicit visual timeline supplied."
        if shot.visual_beats:
            timeline = "\n".join(
                f"{round(beat.at * 100)}% — {beat.description}" for beat in shot.visual_beats
            )

        editorial = "No additional series-level editorial direction."
        visual_direction = "Use only the shot style and canonical location below."
        if shot.canonical_context:
            context = shot.canonical_context
            editorial = "; ".join(context.tone) or editorial
            visual_direction = (
                "; ".join([*context.art_direction, *context.world_rules, *context.constraints])
                or visual_direction
            )

        positive = "\n\n".join(
            [
                "EDITORIAL REFERENCE: preserve tone, pacing, silences and contradictions:\n"
                + editorial,
                "SERIES VISUAL DIRECTION: never add an element not declared here or below:\n"
                + visual_direction,
                "CHARACTERS VISIBLE IN FRAME:\n" + characters,
                f"LOCATION:\n{shot.location}. {shot.location_description}.",
                f"ACTION:\n{shot.action}.",
                f"SHOT TIMELINE:\n{timeline}",
                f"DIALOGUE:\n{dialogue}",
                (f"CAMERA:\n{shot.camera.shot_type}, {shot.camera.lens}, {shot.camera.movement}."),
                f"LIGHTING:\n{shot.lighting}.",
                f"MOOD:\n{shot.mood}.",
                "STYLE:\n" + ", ".join(shot.style) + ".",
                (
                    "CONTINUITY:\nPreserve every declared identity trait, body proportion, "
                    "wardrobe detail, color, accessory, set geometry, prop, weather condition, "
                    "light direction and background object between every pose. Do not import "
                    "motifs, furniture or locations from another series."
                ),
            ]
        )
        negatives = [self.default_negative]
        if len(shot.characters) > 1:
            negatives.append(
                "single character, merged characters, fused anatomy, hybrid character, "
                "shared body, conjoined bodies, missing cast member, extra character, "
                "third character, floating head, disembodied face"
            )
        if shot.render.negative_prompt.strip():
            negatives.append(shot.render.negative_prompt.strip())

        semantic: dict[str, object] = {
            "characters": [character.model_dump(mode="json") for character in shot.characters],
            "location": {
                "id": shot.location,
                "description": shot.location_description,
            },
            "action": shot.action,
            "visual_beats": [beat.model_dump(mode="json") for beat in shot.visual_beats],
            "dialogue": shot.dialogue.model_dump() if shot.dialogue else None,
            "dialogue_cues": [
                dialogue.model_dump() for dialogue in shot.dialogue_cues
            ],
            "camera": shot.camera.model_dump(),
            "lighting": shot.lighting,
            "mood": shot.mood,
            "style": shot.style,
        }
        return PromptPackage(
            positive=positive,
            negative=", ".join(negatives),
            semantic=semantic,
        )

    @staticmethod
    def regional_scene_prompt(shot: Shot, description: str | None = None) -> str:
        choreography = description or shot.action
        for character in shot.characters:
            for label in (character.name, character.id):
                choreography = re.sub(
                    rf"\b{re.escape(label)}\b",
                    "the assigned regional character",
                    choreography,
                    flags=re.IGNORECASE,
                )
        count = len(shot.characters)
        return "\n\n".join(
            [
                (
                    "SCENE AND CHOREOGRAPHY ONLY. Character appearances are supplied "
                    "exclusively by the masked regional prompts. Do not invent a face or body "
                    "outside those regions."
                ),
                (
                    f"CAST COUNT: exactly {count} separate full botanical character bodies, "
                    f"no more and no fewer. Each body remains inside its assigned region."
                ),
                f"LOCATION: {shot.location}. {shot.location_description}.",
                f"CURRENT INSTANT: {choreography}.",
                (
                    "COMPOSITION PRIORITY: the declared prop, event and environment remain "
                    "clearly readable. Characters do not fill the frame unless the camera "
                    "instruction explicitly requests a close-up."
                ),
                (
                    f"CAMERA: {shot.camera.shot_type}, {shot.camera.lens}, "
                    f"{shot.camera.movement}."
                ),
                f"LIGHTING: {shot.lighting}.",
                f"MOOD: {shot.mood}.",
                "STYLE: " + ", ".join(shot.style) + ".",
                "One single full-frame image, no panels, no collage, no text.",
            ]
        )

    @staticmethod
    def visual_beat_prompt(prompt: PromptPackage, description: str) -> str:
        positive = prompt.positive
        if "\n\nSHOT TIMELINE:\n" in positive:
            before, remaining = positive.split("\n\nSHOT TIMELINE:\n", 1)
            _, after = remaining.split("\n\nDIALOGUE:\n", 1)
            positive = before + "\n\nDIALOGUE:\n" + after
        return (
            "PRIMARY FRAME INSTRUCTION — render one single full-frame image of this "
            "exact instant, never a storyboard or multiple panels:\n"
            f"{description}.\nDo not include actions that happen earlier or later. "
            "Keep the same declared character identity, anatomy, set geometry, props, "
            "palette and light direction as the adjacent frame.\n\n"
            f"{positive}"
        )
