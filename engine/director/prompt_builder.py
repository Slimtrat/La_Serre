from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from engine.director.models import Shot


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

        dialogue = "No spoken dialogue in this shot."
        if shot.dialogue:
            dialogue = f'{shot.dialogue.speaker} says in French: "{shot.dialogue.text}"'
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

        positive = "\n\n".join(
            [
                "CHARACTERS:\n" + "\n\n".join(cast),
                f"LOCATION:\n{shot.location}. {shot.location_description}.",
                f"ACTION:\n{shot.action}.",
                f"SHOT TIMELINE:\n{timeline}",
                f"DIALOGUE:\n{dialogue}",
                (f"CAMERA:\n{shot.camera.shot_type}, {shot.camera.lens}, {shot.camera.movement}."),
                f"LIGHTING:\n{shot.lighting}.",
                f"MOOD:\n{shot.mood}.",
                "STYLE:\n" + ", ".join(shot.style) + ". Cinematic realistic textures.",
                (
                    "CONTINUITY:\nKeep faces, bodies, hair, clothing, colors, accessories "
                    "and plant motifs unchanged throughout the shot. Preserve the exact "
                    "greenhouse architecture, marble table, door placement, weather, light "
                    "direction and background objects between every pose."
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
            "Keep the same character identity, botanical anatomy, set geometry, props, "
            "palette and light direction as the adjacent frame.\n\n"
            f"{prompt.positive}"
        )
