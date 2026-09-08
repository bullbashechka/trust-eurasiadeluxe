# Repository Guidelines

## Project Structure & Module Organization

This repository holds Eurasia De Luxe apartment visualizations and plans for a future website.
- `PLAN.md` records scope, source information, assumptions, and production steps.
- `DESIGN_SYSTEM.md` defines the selected warm modern interior direction.
- `assets/apartments/{36-67,39-87,79-79}/` groups assets by apartment area.
- `assets/apartments/36-67/blender/` contains Python scene scripts, the editable `.blend`, `scene_manifest.json`, rendered images, and supporting documentation.
- `assets/brand/`, `assets/media/`, and `refs/` hold branding, media, and reference material.

There is currently no website source tree, package manifest, or automated test directory.

## Build, Test, and Development Commands

Run from the repository root. The documented macOS Blender executable is:

```sh
BLENDER=/Applications/Blender.app/Contents/MacOS/Blender
SCENE_DIR=assets/apartments/36-67/blender
"$BLENDER" --background --factory-startup --python "$SCENE_DIR/build_apartment.py" -- --no-render
```

This rebuilds the scene without rendering. Replace `--no-render` with `--preview` for quick review images; omit both trailing arguments for full renders. Rebuilding overwrites the generated scene and images: save manual scene edits separately first.

`make_walkthrough.py` prepares animation from the apartment scene; `render_walkthrough.py` renders the prepared tour. Run these through Blender, which provides `bpy`.

## Coding Style & Naming Conventions

Use four-space Python indentation, `snake_case` functions and variables, and uppercase constants. Existing scripts contain compact statements; keep new code readable. Resolve asset paths relative to `__file__` using `pathlib.Path`. No formatter or linter is configured.

Keep apartment directory names consistent, such as `36-67`. Use numbered, descriptive image names such as `03-living-room.png`. Preserve camera and object names referenced by scripts.

## Testing Guidelines

There is no automated framework or coverage threshold. For scene changes, rebuild and inspect preview renders against the source plan. Check openings, room connections, ceiling visibility, camera clipping, and consistent materials. For animation changes, inspect transitions and confirm the camera passes through doorways. Record validation performed in the pull request.

## Commit & Pull Request Guidelines

History mostly uses short, action-oriented subjects, such as `Add Apartment Visualization And Walkthrough Assets`; no strict convention is established. Use descriptive subjects and keep changes focused.

Pull requests should explain the change, affected apartments, validation, and geometry assumptions. Link relevant issues when available and include before/after images for visual changes. Update manifests and documentation when outputs change. Keep approximate dimensions clearly identified as visualization assumptions.
