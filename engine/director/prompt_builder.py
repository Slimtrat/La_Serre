from __future__ import annotations

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
        "duplicate person, costume change, text, logo, watermark, low detail, oversaturated"
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
        dialogue = "No spoken dialogue in this shot."
        if shot.dialogue:
            delivery = {
                DialogueMode.ON_SCREEN: "speaks on camera",
                DialogueMode.OFF_SCREEN: "speaks from outside the frame",
                DialogueMode.VOICE_OVER: "delivers voice-over narration",
            }[shot.dialogue.mode]
            dialogue = (
                f'{shot.dialogue.speaker} {delivery}. Exact spoken line: '
                f'"{shot.dialogue.text}". Do not make the speaker visible unless the cast '
                "section explicitly places them in frame"
            )
            if shot.dialogue.performance:
                performance = shot.dialogue.performance
                dialogue += (
                    f". Acting intention: {performance.intention}. Emotion: "
                    f"{performance.emotion}, intensity {performance.intensity:.2f}"
                )

        timeline = "No explicit visual timeline supplied."
        if shot.visual_beats:
            timeline = "\n".join(
                f"{round(beat.at * 100)}% — {beat.description}"
                for beat in shot.visual_beats
            )

        editorial = "No additional series-level editorial direction."
        visual_direction = "Use only the shot style and canonical location below."
        if shot.canonical_context:
            context = shot.canonical_context
            editorial = "; ".join(context.tone) or editorial
            visual_direction = "; ".join(
                [*context.art_direction, *context.world_rules, *context.constraints]
            ) or visual_direction

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
    def visual_beat_prompt(prompt: PromptPackage, description: str) -> str:
        return (
            "PRIMARY FRAME INSTRUCTION — render this exact instant before anything else:\n"
            f"{description}.\nDo not include actions that happen earlier or later. "
            "Keep the same declared character identity, anatomy, set geometry, props, "
            "palette and light direction as the adjacent frame.\n\n"
            f"{prompt.positive}"
        )
