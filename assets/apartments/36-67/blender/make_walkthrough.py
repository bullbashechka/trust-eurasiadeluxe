"""Prepare a continuous apartment tour, bake EEVEE lighting and render review frames.
Run against apartment-36-67.blend. Final animation is rendered from the saved tour blend.
"""
import bpy, math, json, sys, time
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'video';OUT.mkdir(exist_ok=True)
scene=bpy.context.scene
FPS=24
cam=bpy.data.objects['10-walkthrough | Маршрут по квартире']
cam.animation_data_clear();cam.rotation_mode='QUATERNION';cam.data.lens=18
scene.camera=cam
scene.timeline_markers.clear()
for c in bpy.data.collections:
    if 'Ceilings' in c.name:c.hide_render=False;c.hide_viewport=False

# Small neutral entrance landing is only a transition into the supplied plan.
extra=bpy.data.collections.new('09 Video — entrance landing and light probes')
scene.collection.children.link(extra)
def box(name,loc,size,material):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(bpy.data.materials[material])
    for c in list(o.users_collection):c.objects.unlink(o)
    extra.objects.link(o)
    return o
box('Video landing floor',(2.55,6.17,-.08),(5.35,2.05,.16),'Pale limestone')
box('Video landing ceiling',(2.55,6.17,3.07),(5.35,2.05,.14),'Milk painted joinery')
box('Video landing rear wall',(2.55,7.16,1.5),(5.35,.16,3),'Warm ivory plaster')
box('Video landing left wall',(-.13,6.17,1.5),(.16,2.05,3),'Warm ivory plaster')
box('Video landing right wall',(5.23,6.17,1.5),(.16,2.05,3),'Warm ivory plaster')
d=bpy.data.lights.new('Landing soft light','AREA');d.energy=80;d.shape='DISK';d.size=1.5
o=bpy.data.objects.new(d.name,d);extra.objects.link(o);o.location=(2.65,6.0,2.91)

# Door opens outwards, leaving the entry and bathroom circulation clear.
door=bpy.data.objects['Entry door closed'];door.name='Entry door — animated opening'
hinge=bpy.data.objects.new('Entry door hinge',None);extra.objects.link(hinge)
hinge.location=(door.location.x-door.dimensions.x/2,door.location.y,0)
door.parent=hinge;door.location=(door.dimensions.x/2,0,1.15);door.rotation_euler=(0,0,0)
handle=box('Entry bronze handle',(0,0,0),(.032,.07,.30),'Brushed bronze')
handle.parent=hinge;handle.location=(door.dimensions.x-.14,.071,1.04)
for t,angle in [(0,0),(.5,0),(2.2,100),(60,100)]:
    hinge.rotation_euler.z=math.radians(angle);hinge.keyframe_insert(data_path='rotation_euler',frame=round(t*FPS)+1)

# Seconds, eye location, look-at target. Every move follows a real opening.
route=[
 (0,(2.63,6.44,1.62),(2.63,5.15,1.47)),
 (2.3,(2.63,6.44,1.62),(2.63,4.45,1.48)),
 (5.3,(2.63,4.88,1.62),(2.90,3.10,1.35)),
 (6.6,(2.63,4.88,1.62),(2.90,3.10,1.35)),
 (8.6,(2.52,3.73,1.62),(1.20,3.92,1.28)),
 (10.6,(1.48,3.72,1.62),(.60,4.49,1.18)),
 (12.5,(1.48,3.72,1.62),(.60,4.49,1.18)),
 (14.5,(1.48,3.72,1.62),(.74,2.94,1.03)),
 (15.8,(1.48,3.72,1.62),(.74,2.94,1.03)),
 (17.8,(1.48,3.72,1.62),(2.80,3.73,1.47)),
 (19.8,(2.65,3.74,1.62),(4.00,3.85,1.47)),
 (21.8,(4.00,3.85,1.62),(4.05,2.90,1.45)),
 (23.8,(4.05,3.08,1.62),(5.80,1.40,1.28)),
 (26.0,(4.72,2.30,1.62),(6.50,1.10,1.25)),
 (28.0,(4.72,2.30,1.62),(6.50,1.10,1.25)),
 (30.0,(4.72,2.30,1.62),(3.60,1.65,1.37)),
 (31.5,(4.72,2.30,1.62),(3.60,1.65,1.37)),
 (33.3,(4.72,2.30,1.62),(4.00,3.80,1.47)),
 (35.0,(4.05,3.05,1.62),(4.00,3.85,1.47)),
 (36.8,(4.00,3.85,1.62),(2.63,3.75,1.47)),
 (38.8,(2.63,3.72,1.62),(2.55,2.20,1.40)),
 (40.8,(2.70,2.55,1.62),(.90,1.40,1.30)),
 (43.0,(2.82,1.15,1.62),(.40,.90,1.18)),
 (44.5,(2.82,1.15,1.62),(.40,.90,1.18)),
 (46.0,(2.82,1.15,1.62),(1.66,-.80,1.43)),
 (48.0,(2.82,-.055,1.62),(1.66,-.10,1.43)),
 (50.0,(1.66,-.055,1.62),(1.66,-1.10,1.43)),
 (52.0,(1.66,-1.00,1.62),(2.90,-1.13,.95)),
 (54.0,(1.66,-1.00,1.62),(2.90,-1.13,.95)),
 (56.5,(1.66,-1.00,1.62),(.25,-1.12,.88)),
 (57.5,(1.66,-1.00,1.62),(.25,-1.12,.88)),
 (59.0,(1.66,-1.00,1.62),(1.66,1.5,1.25)),
 (60.0,(1.66,-1.00,1.62),(1.66,1.5,1.25)),
]
def orientation(loc,target):
    v=Vector(target)-Vector(loc)
    return math.atan2(v.y,v.x),math.atan2(v.z,math.hypot(v.x,v.y))
scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=1440
segment=0
for frame in range(1,1441):
    t=(frame-1)/FPS
    while segment<len(route)-2 and t>route[segment+1][0]:segment+=1
    ta,pa,la=route[segment];tb,pb,lb=route[segment+1]
    u=max(0,min(1,(t-ta)/(tb-ta)));u=u*u*(3-2*u)
    pos=Vector(pa).lerp(Vector(pb),u)
    ya,pi=orientation(pa,la);yb,pj=orientation(pb,lb)
    yaw=ya+((yb-ya+math.pi)%(2*math.pi)-math.pi)*u;pitch=pi+(pj-pi)*u
    direction=Vector((math.cos(pitch)*math.cos(yaw),math.cos(pitch)*math.sin(yaw),math.sin(pitch)))
    q=direction.to_track_quat('-Z','Y')
    if frame>1 and q.dot(previous)<0:q.negate()
    previous=q.copy()
    cam.location=pos;cam.rotation_quaternion=q
    cam.keyframe_insert(data_path='location',frame=frame)
    cam.keyframe_insert(data_path='rotation_quaternion',frame=frame)
chapters=[(0,'Вход в квартиру'),(7,'Прихожая → санузел'),(11,'Санузел'),(17,'Выход из санузла'),(22,'Вход в гостиную'),(26,'Гостиная'),(33,'Гостиная → прихожая'),(39,'Кухня'),(46,'Кухня → лоджия'),(52,'Лоджия')]
for t,label in chapters:scene.timeline_markers.new(label,frame=round(t*FPS)+1)

# Verify the complete sampled path against the actual wall meshes.
walls=list(bpy.data.collections['01 Architecture — walls and openings'].objects)
bounds=[(o,o.matrix_world.inverted(),[min(v[i] for v in o.bound_box) for i in range(3)],[max(v[i] for v in o.bound_box) for i in range(3)]) for o in walls]
hits=[]
for f in range(1,1441):
    scene.frame_set(f)
    for o,inv,lo,hi in bounds:
        p=inv@cam.matrix_world.translation
        if all(lo[i]<p[i]<hi[i] for i in range(3)):hits.append((f,o.name))
print('PATH_WALL_COLLISIONS',hits[:10],'TOTAL',len(hits),flush=True)
if hits:raise RuntimeError('Camera route intersects walls')

scene.render.engine='BLENDER_EEVEE'
scene.eevee.taa_render_samples=16
scene.eevee.use_raytracing=False
scene.eevee.use_fast_gi=False
scene.eevee.shadow_ray_count=1
scene.eevee.shadow_step_count=8
for light in bpy.data.lights:
    if hasattr(light,'use_shadow_jitter'):light.use_shadow_jitter=False
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.render.film_transparent=False
scene.view_settings.exposure=.0
probes=[
 ('Hall',(3.4,4.18,1.5),(1.43,.85,1.4),(6,4,4)),
 ('Bath',(.87,3.88,1.5),(.78,1.10,1.4),(4,5,4)),
 ('Kitchen',(1.60,1.55,1.5),(1.48,1.50,1.4),(6,6,4)),
 ('Living',(5.36,2.10,1.5),(1.86,2.02,1.4),(7,8,4)),
 ('Loggia',(1.71,-1.15,1.5),(1.60,.47,1.4),(6,3,4)),
 ('Landing',(2.55,6.13,1.5),(2.45,.84,1.4),(6,3,4)),
]
for name,loc,scale,res in probes:
    d=bpy.data.lightprobes.new(name+' baked indirect light','VOLUME')
    d.resolution_x,d.resolution_y,d.resolution_z=res;d.bake_samples=64
    o=bpy.data.objects.new(d.name,d);extra.objects.link(o);o.location=loc;o.scale=scale
scene.frame_set(130)
print('BAKE_START',flush=True)
bpy.ops.object.lightprobe_cache_bake(subset='ALL')
print('BAKE_COMPLETE',flush=True)
scene.frame_set(1)
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
scene['Video route']='Entrance → bathroom → hallway → living room → hallway → kitchen → loggia'
scene['Video duration seconds']=60
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'apartment-walkthrough.blend'),compress=True)
(OUT/'walkthrough-route.json').write_text(json.dumps({'fps':24,'seconds':60,'waypoints':route,'chapters':chapters,'wall_collision_frames':len(hits)},ensure_ascii=False,indent=2))
for t in [0,5.5,11.5,15,26.5,30.5,41,44,52.5,59.5]:
    scene.frame_set(round(t*FPS)+1)
    scene.render.filepath=str(OUT/f'preview-{t:04.1f}.png')
    tick=time.time();bpy.ops.render.render(write_still=True)
    print('PREVIEW',t,'SECONDS',round(time.time()-tick,2),flush=True)
print('VIDEO_SCENE_READY',flush=True)
