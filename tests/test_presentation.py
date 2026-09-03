from pathlib import Path

from engine.production.presentation import EpisodePresentationPlan


def test_presentation_plan_resolves_reusable_frame(tmp_path: Path) -> None:
    frame = tmp_path / "assets" / "frame.png"
    frame.parent.mkdir()
    frame.write_bytes(b"png")
    path = tmp_path / "presentation-plan.json"
    path.write_text(
        (
            '{"frame_asset":"assets/frame.png","framed_shots":["S01E001-S01"],'
            '"captions":{"S01E001-S01":"MINUIT"},'
            '"caption_positions":{"S01E001-S01":"top"}}'
        ),
        encoding="utf-8",
    )

    plan = EpisodePresentationPlan.load(path)

    assert plan.frame_for("S01E001-S01") == frame.resolve()
    assert plan.frame_for("S01E001-S02") is None
    assert plan.caption_for("S01E001-S01") == ("MINUIT", "top")
