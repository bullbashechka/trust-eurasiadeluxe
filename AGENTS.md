# Repository Guidelines

## Project Structure & Module Organization

This repository holds the Eurasia De Luxe website and apartment visualizations.
- `DESIGN_SYSTEM.md` defines the selected warm modern interior direction.
- `assets/apartments/{36-67,39-87,79-79}/` groups assets by apartment area.
- `assets/apartments/{36-67,39-87}/` separates source plans, photos, renders, Blender scenes, and scene documentation.
- `blender/` contains Python scene scripts, the editable `.blend`, and `scene_manifest.json`. The 39-87 apartment also has `gallery/` and `walkthrough/`.
- `assets/brand/` holds branding and project imagery; `vids/` holds source apartment videos.

The website lives in `website/` (Astro, TypeScript, React and GSAP). Use root `bun run dev`, `bun run check`, `bun run test`, and `bun run build`. See `website/README.md` for reproducible media preparation and environment variables. Website source data lives in `website/src/data/`, including `shots.json` for media preparation; generated `website/public/media/` and `website/dist/` are not tracked.

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

Website tests run with `bun run test`; build contracts run with `bun run --cwd website test:build` after building. There is no automated framework or coverage threshold for Blender scenes. For scene changes, rebuild and inspect preview renders against the source plan. Check openings, room connections, ceiling visibility, camera clipping, and consistent materials. For animation changes, inspect transitions and confirm the camera passes through doorways. Record validation performed in the pull request.

## Commit & Pull Request Guidelines

History mostly uses short, action-oriented subjects, such as `Add Apartment Visualization And Walkthrough Assets`; no strict convention is established. Use descriptive subjects and keep changes focused.

Pull requests should explain the change, affected apartments, validation, and geometry assumptions. Link relevant issues when available and include before/after images for visual changes. Update manifests and documentation when outputs change. Keep approximate dimensions clearly identified as visualization assumptions.
