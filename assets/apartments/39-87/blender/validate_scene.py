"""Check the saved scene and camera route using evaluated mesh geometry."""
import bpy
import json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'apartment-39-87.blend'))
scene = bpy.context.scene
manifest = json.loads((ROOT / 'scene_manifest.json').read_text())
depsgraph = bpy.context.evaluated_depsgraph_get()
vertices, polygons, owners = [], [], []
for obj in scene.objects:
    if obj.type != 'MESH' or obj.hide_render:
        continue
    if any(c.name.startswith(('02 Floors', '03 Ceilings')) for c in obj.users_collection):
        continue
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    offset = len(vertices)
    vertices.extend(evaluated.matrix_world @ v.co for v in mesh.vertices)
    for face in mesh.polygons:
        polygons.append(tuple(offset + i for i in face.vertices))
        owners.append(obj.name)
    evaluated.to_mesh_clear()
bvh = BVHTree.FromPolygons(vertices, polygons)
walk = next(o for o in scene.objects if o.name.startswith('10-walkthrough'))
collisions = []
minimum = [999, None, None]
previous = None
for frame in range(1, scene.frame_end + 1):
    scene.frame_set(frame)
    position = walk.matrix_world.translation.copy()
    nearest = bvh.find_nearest(position)
    if nearest[0] is not None and nearest[3] < minimum[0]:
        minimum = [nearest[3], frame, owners[nearest[2]]]
    if nearest[0] is not None and nearest[3] < .10:
        collisions.append({'frame': frame, 'type': 'camera_clearance_below_10cm', 'object': owners[nearest[2]], 'distance_m': round(nearest[3], 4)})
    if previous is not None and (position-previous).length > .00001:
        delta = position-previous
        hit = bvh.ray_cast(previous, delta.normalized(), delta.length)
        if hit[0] is not None:
            collisions.append({'frame': frame, 'type': 'path_crosses_geometry', 'object': owners[hit[2]]})
    previous = position
shot_checks = []
for shot in manifest['shots']:
    obj = bpy.data.objects[shot['camera']]
    hit = bvh.find_nearest(obj.location)
    shot_checks.append({'camera': obj.name, 'nearest_surface_m': round(hit[3], 4), 'nearest_object': owners[hit[2]], 'clear_of_near_clip': hit[3] > obj.data.clip_start})
# Clear line through each intended doorway, and solid separation of living/kitchen.
connections = []
for name, a, b, expected_open in [
    ('Hall to bathroom',(4.80,3.74,1.62),(5.50,3.74,1.62),True),
    ('Hall to living',(3.17,3.90,1.62),(3.17,3.20,1.62),True),
    ('Hall to kitchen',(4.19,3.40,1.62),(4.19,2.70,1.62),True),
    ('Kitchen to loggia',(5.32,.10,1.62),(5.32,-.70,1.62),True),
    ('Solid kitchen living wall',(3.30,.20,1.62),(4.20,.20,1.62),False),
    ('No living loggia door',(3.10,-1.0,1.62),(4.30,-1.0,1.62),False),
]:
    a, b = Vector(a), Vector(b)
    hit = bvh.ray_cast(a,(b-a).normalized(),(b-a).length)
    is_open = hit[0] is None
    connections.append({'connection':name,'passed':is_open == expected_open,'blocking_object':None if is_open else owners[hit[2]]})
report = {'blender_version':bpy.app.version_string,'objects':len(scene.objects),'ceiling_m':scene['Ceiling_height_m'],'route_frames_checked':scene.frame_end,'camera_radius_checked_m':.10,'minimum_camera_surface_clearance':{'distance_m':round(minimum[0],4),'frame':minimum[1],'object':minimum[2]},'route_issues':collisions,'interior_cameras':shot_checks,'connections':connections,'packed_source_plan':any(i.packed_file for i in bpy.data.images),'external_images':[i.filepath for i in bpy.data.images if i.source == 'FILE' and not i.packed_file]}
report['passed'] = not collisions and all(x['clear_of_near_clip'] for x in shot_checks) and all(x['passed'] for x in connections)
(ROOT / 'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
