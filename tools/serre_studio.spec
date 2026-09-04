# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_submodules

project_root = Path.cwd()
webview_data, webview_binaries, webview_hidden = collect_all("webview")

data_files = list(webview_data)
for source, destination in (
    (project_root / "apps" / "api" / "static", "apps/api/static"),
    (project_root / "examples", "examples"),
    (project_root / "starter_catalog", "starter_catalog"),
    (project_root / "workflows" / "images", "workflows/images"),
    (project_root / "workflows" / "video", "workflows/video"),
):
    if source.exists():
        data_files.append((str(source), destination))

hidden_imports = sorted(
    set(
        webview_hidden
        + collect_submodules("apps")
        + collect_submodules("engine")
        + ["webview.platforms.edgechromium", "webview.platforms.winforms"]
    )
)

analysis = Analysis(
    [str(project_root / "tools" / "run_desktop.py")],
    pathex=[str(project_root)],
    binaries=webview_binaries,
    datas=data_files,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=1,
)
pyz = PYZ(analysis.pure)

exe = EXE(
    pyz,
    analysis.scripts,
    analysis.binaries,
    analysis.datas,
    [],
    name="SerreStudio",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    version=str(project_root / "tools" / "windows-version-info.txt"),
)
