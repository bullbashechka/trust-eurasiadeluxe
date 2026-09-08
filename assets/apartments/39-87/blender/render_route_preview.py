"""Render a contact-sheet sequence from the editable walking camera."""
import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'apartment-39-87.blend'))
scene = bpy.context.scene
scene.camera = next(o for o in scene.objects if o.name.startswith('10-walkthrough'))
scene.render.resolution_x = 640
scene.render.resolution_y = 440
scene.render.resolution_percentage = 100
scene.cycles.samples = 16
# GPU availability is configured at application level, not only in the .blend.
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for device in prefs.devices:
        device.use = device.type == 'METAL'
    scene.cycles.device = 'GPU'
except Exception:
    scene.cycles.device = 'CPU'
folder = ROOT / 'route-preview'
folder.mkdir(exist_ok=True)
manifest = json.loads((ROOT / 'scene_manifest.json').read_text())
for i, waypoint in enumerate(manifest['route']):
    scene.frame_set(waypoint['frame'])
    scene.render.filepath = str(folder / f'{i+1:02d}-frame-{waypoint["frame"]:04d}.png')
    bpy.ops.render.render(write_still=True)
print('ROUTE_PREVIEW_COMPLETE',flush=True)
