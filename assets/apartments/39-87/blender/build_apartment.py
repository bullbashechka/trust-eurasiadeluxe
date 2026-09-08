"""Reproducible apartment study. Run with Blender --background --python this_file.
Source plan geometry is traced in pixels and uniformly scaled using the bathroom area.
All dimensions are approximate: the source has no dimension chains.
"""
import bpy, math, os, json, sys, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
ROOT.mkdir(exist_ok=True)
(ROOT.parent / 'renders').mkdir(exist_ok=True)
random.seed(39)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection': bpy.data.collections.remove(c)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.length_unit = 'METERS'
S = math.sqrt(3.90 / (98 * 122))
H = 3.0
def xy(p): return ((p[0]-220)*S, (956-p[1])*S)
def collection(name):
    c = bpy.data.collections.new(name); scene.collection.children.link(c); return c
ARCH=collection('01 Architecture — walls and openings')
FLOORS=collection('02 Floors')
CEIL=collection('03 Ceilings — hide for overview')
FURN=collection('04 Furniture and sanitary fixtures')
LIGHT=collection('05 Lighting')
CAMS=collection('06 Cameras — route through apartment')
DETAIL=collection('07 Doors, glazing and trim')
REF=collection('08 Source plan — hidden from render')
def move(o,c):
    for cc in list(o.users_collection): cc.objects.unlink(o)
    c.objects.link(o); return o
def mat(name,color,rough=.55,metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    return m
wall=mat('Warm ivory plaster',(.72,.70,.65))
white=mat('Milk painted joinery',(.8,.79,.74),.35)
stone=mat('Pale limestone',(.64,.61,.54),.68)
oak=mat('Natural pale oak',(.52,.35,.20),.5)
fabric=mat('Cream woven upholstery',(.68,.64,.54),.86)
rug=mat('Warm wool rug',(.57,.53,.45),.95)
bronze=mat('Brushed bronze',(.30,.19,.09),.3,.72)
black=mat('Graphite appliances',(.023,.026,.028),.29,.18)
ceramic=mat('Porcelain',(.86,.87,.83),.18)
leaf=mat('Muted olive foliage',(.14,.22,.10),.78)
glass=mat('Clear glazing',(.93,.97,1),.07)
glass.node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value=1
glass.node_tree.nodes.get('Principled BSDF').inputs['IOR'].default_value=1.45
mirror=mat('Mirror',(.82,.85,.86),.055,1)
for m,scale,strength in [(wall,90,.07),(stone,8,.11),(fabric,170,.18),(rug,140,.24)]:
    n=m.node_tree.nodes; l=m.node_tree.links; noise=n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=scale
    bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=strength; bump.inputs['Distance'].default_value=.018
    l.new(noise.outputs['Fac'],bump.inputs['Height']); l.new(bump.outputs['Normal'],n.get('Principled BSDF').inputs['Normal'])
# Procedural wood: packed scene has no external texture dependencies.
n=oak.node_tree.nodes; l=oak.node_tree.links
tex=n.new('ShaderNodeTexCoord'); mapping=n.new('ShaderNodeVectorMath'); mapping.operation='MULTIPLY'; mapping.inputs[1].default_value=(45,2,3)
noise=n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=3
ramp=n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position=.15; ramp.color_ramp.elements[0].color=(.32,.19,.085,1)
ramp.color_ramp.elements[1].position=.85; ramp.color_ramp.elements[1].color=(.69,.52,.32,1)
l.new(tex.outputs['Generated'],mapping.inputs[0]); l.new(mapping.outputs[0],noise.inputs['Vector']); l.new(noise.outputs['Fac'],ramp.inputs[0]); l.new(ramp.outputs[0],n.get('Principled BSDF').inputs['Base Color'])
def box(name,loc,size,m=wall,c=FURN,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name
    o.dimensions=size; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if m: o.data.materials.append(m)
    if bevel:
        mod=o.modifiers.new('Soft manufactured edges','BEVEL'); mod.width=bevel; mod.segments=3
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return move(o,c)
def cylinder(name,loc,r,depth,m=bronze,rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=r,depth=depth,location=loc)
    o=bpy.context.object; o.name=name; o.data.materials.append(m)
    if rotation: o.rotation_euler=rotation
    for p in o.data.polygons:p.use_smooth=True
    return move(o,FURN)
def sphere(name,loc,size,m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc)
    o=bpy.context.object; o.name=name; o.scale=size; o.data.materials.append(m)
    for p in o.data.polygons:p.use_smooth=True
    return move(o,FURN)
def bar(name,a,b,r=.014,m=bronze):
    a,b=Vector(a),Vector(b); o=cylinder(name,(a+b)/2,r,(b-a).length,m)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o
def slab(name,pts,z,depth,m,c):
    v=[(*xy(p),z) for p in pts]+[(*xy(p),z+depth) for p in pts]; count=len(pts)
    faces=[tuple(reversed(range(count))),tuple(range(count,2*count))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);c.objects.link(o);o.data.materials.append(m);return o
rooms={
    'Hallway': ([(361,684),(501,684),(501,780),(429,780),(429,756),(361,756)],stone,4.04),
    'Bathroom': ([(508,684),(606,684),(606,806),(508,806)],stone,3.90),
    'Kitchen': ([(429,790),(501,790),(501,814),(606,814),(606,956),(429,956)],oak,9.09),
    'Living room': ([(220,684),(355,684),(355,762),(418,762),(418,956),(394,956),(394,1034),(220,1034)],oak,21.13),
    'Loggia': ([(429,984),(606,984),(606,1048),(429,1048)],stone,3.42),
}
areas={}
for name,(pts,m,target) in rooms.items():
    slab(name+' floor',pts,-.14,.14,m,FLOORS)
    area_m2=abs(sum(pts[i][0]*pts[(i+1)%len(pts)][1]-pts[(i+1)%len(pts)][0]*pts[i][1] for i in range(len(pts))))/2*S*S
    areas[name]={'source_area_m2':target,'traced_clear_floor_m2':round(area_m2,2)}
shell=[(208,672),(616,672),(616,1060),(403,1060),(403,1047),(208,1047)]
slab('Continuous structural floor',shell,-.22,.075,stone,FLOORS)
slab('Continuous ceiling',shell,H,.14,white,CEIL)
for name,pts in [
    ('Entry threshold',[(422,672),(475,672),(475,684),(422,684)]),
    ('Bath threshold',[(501,728),(508,728),(508,777),(501,777)]),
    ('Living threshold',[(369,756),(413,756),(413,762),(369,762)]),
    ('Kitchen threshold',[(440,780),(491,780),(491,790),(440,790)]),
    ('Loggia threshold',[(495,956),(535,956),(535,984),(495,984)])]:
    slab(name,pts,-.14,.14,stone,FLOORS)
def wallseg(name,a,b,thick=.14,bottom=0,top=H):
    a,b=Vector(xy(a)),Vector(xy(b)); d=b-a
    o=box(name,(*( (a+b)/2), (top+bottom)/2),(d.length,thick,top-bottom),wall,ARCH,.006)
    o.rotation_euler.z=math.atan2(d.y,d.x);return o
def segmented(name,a,b,openings,thick=.14):
    # openings are fractions along the wall, with sill and lintel heights.
    a,b=Vector(a),Vector(b); prev=0
    for lo,hi,sill,lintel in openings:
        if lo>prev:wallseg(name,a+(b-a)*prev,a+(b-a)*lo,thick)
        if sill>0:wallseg(name+' sill',a+(b-a)*lo,a+(b-a)*hi,thick,0,sill)
        if lintel<H:wallseg(name+' lintel',a+(b-a)*lo,a+(b-a)*hi,thick,lintel,H)
        prev=hi
    if prev<1:wallseg(name,a+(b-a)*prev,b,thick)
# Contours traced directly from the 39.87 plan: entry above, living left.
wallseg('West exterior',(209,674),(209,1046),.36)
segmented('North exterior',(209,674),(616,674),[(213/407,266/407,0,2.35)],.32)
wallseg('East exterior',(616,674),(616,1057),.32)
segmented('Living window wall',(209,1046),(403,1046),[(11/194,185/194,.42,2.68)],.32)
wallseg('Living lower east pier',(403,956),(403,1046),.50)
wallseg('Living kitchen solid partition',(423.5,762),(423.5,956),11*S)
wallseg('Living wardrobe return',(358,679),(358,759),.11)
segmented('Living entrance',(358,759),(423.5,759),[(11/65.5,55/65.5,0,2.30)],.108)
wallseg('Hall lower return',(423.5,759),(423.5,785),.198)
segmented('Kitchen entrance',(423.5,785),(504.5,785),[(16.5/81,67.5/81,0,2.3)],.18)
segmented('Bathroom west',(504.5,679),(504.5,810),[(49/131,98/131,0,2.3)],.126)
wallseg('Bathroom south',(504.5,810),(611,810),.144)
segmented('Kitchen loggia wall',(403,970),(616,970),[(32/213,92/213,.75,2.55),(92/213,132/213,0,2.55)],.50)
wallseg('Loggia west',(420,984),(420,1057),.25)
segmented('Loggia facade',(420,1057),(616,1057),[(9/196,186/196,.32,2.75)],.22)
def doorframe(name,center,width,axis='X',height=2.3):
    x,y=center; sx,sy=(1,0) if axis=='X' else (0,1)
    for sign in [-1,1]:box(name+' jamb',(x+sign*sx*(width/2+.032),y+sign*sy*(width/2+.032),height/2),(.065,.20,height) if axis=='X' else (.20,.065,height),white,DETAIL,.006)
    box(name+' head',(x,y,height+.033),(width+.13,.20,.065) if axis=='X' else (.20,width+.13,.065),white,DETAIL,.006)
def openleaf(name,hinge,width,angle,m=white):
    # Open leaves make room connections visible in both directions.
    dx,dy=math.cos(angle),math.sin(angle)
    o=box(name,(hinge[0]+width/2*dx,hinge[1]+width/2*dy,1.13),(width,.042,2.26),m,DETAIL,.014);o.rotation_euler.z=angle
    px,py=hinge[0]+(width-.13)*dx,hinge[1]+(width-.13)*dy
    bar(name+' handle',(px-dy*.05,py+dx*.05,1.05),(px-dy*.05-dx*.12,py+dx*.05-dy*.12,1.05),.012)
def glazing(name,a,b,sill,top,panels=3):
    a,b=Vector(xy(a)),Vector(xy(b)); mid=(a+b)/2; length=(b-a).length
    for z in [sill,top]:box(name+' horizontal frame',(*mid,z),(length,.08,.06),white,DETAIL,.008)
    for i in range(panels+1):
        p=a+(b-a)*i/panels; box(name+' mullion',(*p,(sill+top)/2),(.055,.08,top-sill),white,DETAIL,.006)
    box(name+' glass',(*mid,(sill+top)/2),(length-.06,.015,top-sill-.06),glass,DETAIL,.002)
doorframe('Entry',xy((448.5,674)),53*S,height=2.35)
box('Entry door closed',(*xy((448.5,674)),1.16),(53*S,.065,2.32),oak,DETAIL)
bar('Entry bronze handle',(*xy((468,680)),.98),(*xy((461,680)),.98),.014)
doorframe('Bathroom',xy((504.5,752.5)),49*S,'Y')
openleaf('Bathroom open door',xy((501,728)),49*S,2*math.pi/3)
doorframe('Living',xy((391,759)),44*S)
openleaf('Living open door',xy((369,753)),44*S,math.pi/2)
doorframe('Kitchen',xy((465.5,785)),51*S)
openleaf('Kitchen open door',xy((440,790)),51*S,-math.pi/2)
glazing('Living window',(220,1046),(394,1046),.42,2.68,4)
glazing('Kitchen loggia window',(435,970),(495,970),.75,2.55,2)
glazing('Loggia facade',(429,1057),(606,1057),.32,2.75,4)
doorframe('Loggia',xy((515,970)),40*S,height=2.55)
# Right-hinged glazed door fully opened against the kitchen-side facade.
previous=set(bpy.data.objects)
glazing('Loggia open door leaf',(495,956),(535,956),.08,2.48,1)
pivot=Vector((*xy((535,956)),0))
for o in set(bpy.data.objects)-previous:
    v=o.location-pivot
    o.location=pivot+Vector((-v.x,-v.y+.05,v.z))
    o.rotation_euler.z=math.pi
def inside(x,y,poly):
    yes=False;j=len(poly)-1
    for i in range(len(poly)):
        xi,yi=poly[i];xj,yj=poly[j]
        if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi)+xi:yes=not yes
        j=i
    return yes
seam=mat('Fine floor joints',(.31,.27,.21),.9)
for room in ['Kitchen','Living room']:
    pts=[xy(p) for p in rooms[room][0]]
    for x in [i*.20 for i in range(40)]:
        ranges=[];start=None
        for j in range(700):
            y=-1.8+j*.01;hit=inside(x,y,pts)
            if hit and start is None:start=y
            if not hit and start is not None:ranges.append((start,y));start=None
        for a,b in ranges:box('Oak board joint',(x,(a+b)/2,.001),(.0025,b-a,.001),seam,FLOORS,0)
        for y in [i*1.15+((int(x/.2)%3)*.37) for i in range(6)]:
            if inside(x+.1,y,pts) and inside(x+.195,y,pts):box('Staggered board end',(x+.1,y,.001),(.2,.0025,.001),seam,FLOORS,0)

def transform_group(before, sx=1, tx=0, sy=1, ty=0):
    from mathutils import Matrix
    transform=Matrix(((sx,0,0,tx),(0,sy,0,ty),(0,0,1,0),(0,0,0,1)))
    bpy.context.view_layer.update()
    for obj in set(bpy.data.objects)-before:
        obj.matrix_world=transform @ obj.matrix_world

# Small hall cabinet matches the upper-left shallow storage on the plan.
box('Hall oak cabinet',(*xy((379,699)),1.38),(.63,.48,2.76),oak)
box('Hall mirror',(3.38,4.89,1.60),(.44,.024,1.25),mirror)
box('Hall floating shelf',(3.38,4.78,.90),(.44,.20,.09),oak)
bar('Hall cabinet pull',(*xy((391,713)),1.05),(*xy((391,713)),1.55),.009)
before=set(bpy.data.objects)
# Kitchen: one wall of cabinets, a compact dining table and a clear balcony route.
for y in [.52,1.12,1.72]:
    box('Kitchen base cabinet',(.32,y,.44),(.60,.59,.86),white)
    box('Kitchen drawer front',(.633,y,.63),(.022,.565,.23),white)
    box('Kitchen lower front',(.633,y,.27),(.022,.565,.45),white)
    box('Kitchen upper cabinet',(.20,y,2.17),(.36,.59,.82),white)
box('Continuous limestone worktop',(.33,1.12,.9),(.65,1.82,.055),stone)
box('Stone backsplash',(.018,1.12,1.30),(.025,1.83,.74),stone)
box('Integrated fridge tower',(.32,2.29,1.34),(.61,.53,2.68),white)
box('Oven glass front',(.638,2.29,1.12),(.025,.44,.51),black)
bar('Oven pull',(.67,2.10,1.28),(.67,2.48,1.28),.012)
box('Induction hob',(.33,.60,.934),(.46,.50,.015),black)
for y in [.46,.73]:
    for x in [.20,.44]:cylinder('Hob cooking ring',(x,y,.944),.083,.004,black)
box('Sink outer lip',(.34,1.52,.937),(.43,.45,.016),bronze)
box('Sink basin',(.34,1.52,.944),(.36,.37,.019),black,bevel=.06)
bar('Sink tap riser',(.12,1.52,.95),(.12,1.52,1.25),.016)
bar('Sink tap spout',(.12,1.52,1.25),(.34,1.52,1.25),.016)
transform_group(before,sx=-1,tx=6.975)
def chair(name,x,y,angle=0):
    parts=[]
    parts.append(box(name+' seat',(x,y,.46),(.45,.45,.075),oak,bevel=.065))
    parts.append(box(name+' curved back',(x,y+.20,.73),(.46,.065,.28),oak,bevel=.055))
    for dx in [-.16,.16]:
        for dy in [-.16,.16]:parts.append(bar(name+' leg',(x+dx*1.2,y+dy*1.2,.03),(x+dx,y+dy,.44),.022,oak))
    for o in parts:
        v=o.location-Vector((x,y,0));o.location=(x+v.x*math.cos(angle)-v.y*math.sin(angle),y+v.x*math.sin(angle)+v.y*math.cos(angle),v.z);o.rotation_euler.z+=angle
# Round table and six chairs, as shown on the source plan.
cylinder('Round oak dining table',(4.72,1.08,.77),.50,.065,oak)
cylinder('Dining pedestal',(4.72,1.08,.38),.14,.72,oak)
for i in range(6):
    angle=2*math.pi*i/6
    chair('Dining chair %d'%i,4.72+.78*math.cos(angle),1.08+.78*math.sin(angle),angle-math.pi/2)
cylinder('Dining ceramic bowl',(4.72,1.08,.835),.12,.06,ceramic)
before=set(bpy.data.objects)
# Living room follows the furniture wall in the source plan.
box('Living woven rug',(5.35,1.66,.012),(2.52,2.65,.025),rug,bevel=.10)
box('Sofa plinth',(6.58,1.63,.18),(.89,2.48,.22),oak,bevel=.05)
box('Sofa upholstered base',(6.58,1.63,.39),(.97,2.56,.31),fabric,bevel=.12)
box('Sofa back',(6.96,1.63,.75),(.22,2.55,.67),fabric,bevel=.10)
for y in [.85,1.60,2.35]:
    box('Sofa seat cushion',(6.48,y,.59),(.75,.72,.19),fabric,bevel=.085)
    p=box('Sofa back cushion',(6.79,y,.87),(.20,.68,.46),fabric,bevel=.085);p.rotation_euler.y=-.12
for y in [.37,2.89]:box('Sofa arm',(6.59,y,.66),(.98,.18,.49),fabric,bevel=.07)
box('Sofa chaise',(6.21,.69,.41),(1.65,.80,.39),fabric,bevel=.13)
box('Chaise cushion',(6.18,.69,.63),(1.54,.76,.14),fabric,bevel=.09)
box('Low stone coffee table',(5.30,1.69,.36),(.69,1.15,.11),stone,bevel=.15)
box('Coffee table pedestal',(5.30,1.69,.17),(.40,.75,.32),stone,bevel=.06)
box('Living TV console',(3.63,1.60,.32),(.37,1.92,.44),oak,bevel=.028)
box('Television',(3.475,1.60,1.39),(.055,1.41,.82),black,bevel=.025)
for i in range(4):
    box('Living upper wardrobe',(5.43+i*.43,4.62,1.37),(.425,.56,2.74),oak)
    bar('Living wardrobe pull',(5.56+i*.43,4.325,1.05),(5.56+i*.43,4.325,1.55),.008)
# Curtains beside, rather than across, the living glazing.
for base in [4.08,6.65]:
    for i in range(8):
        x=base+i*.047
        o=cylinder('Curtain fold',(x,-1.49,1.50),.047,2.92,fabric)
        o.scale.y=.7
def plant(name,x,y,z=0):
    cylinder(name+' planter',(x,y,z+.22),.18,.43,stone)
    for i in range(9):
        a=i*2.4;h=.62+(i%3)*.14
        bar(name+' stem',(x,y,z+.35),(x+math.cos(a)*.20,y+math.sin(a)*.20,z+h),.007,leaf)
        o=sphere(name+' leaf',(x+math.cos(a)*.21,y+math.sin(a)*.21,z+h),(.15,.065,.025),leaf);o.rotation_euler=(.4,a,a)
plant('Living plant',6.96,3.20)

transform_group(before,sx=-1,tx=7.12)
for obj in FURN.objects:
    if obj.name.startswith(('Television', 'Living TV console')):
        obj.location.x -= .20
before=set(bpy.data.objects)
# Bathroom: north-wall bathtub, west-wall basin and WC, washer in south-east.
box('Bathtub apron',(.86,4.68,.31),(1.66,.73,.61),ceramic,bevel=.09)
box('Bathtub inset water shadow',(.86,4.68,.621),(1.40,.51,.025),stone,bevel=.18)
box('Bathtub inner enamel',(.86,4.68,.635),(1.31,.43,.018),ceramic,bevel=.18)
bar('Bath mixer',(.42,5.01,.88),(.62,5.01,.88),.026)
bar('Bath spout',(.52,5.01,.86),(.52,4.86,.86),.018)
bar('Shower rail',(.18,4.89,1.0),(.18,4.89,2.14),.013)
cylinder('Shower head',(.18,4.71,2.15),.10,.025,bronze)
bar('Shower arm',(.18,4.89,2.14),(.18,4.71,2.14),.012)
box('Bathroom oak vanity',(.27,3.95,.56),(.49,.64,.40),oak)
box('Basin counter',(.30,3.95,.80),(.57,.68,.08),ceramic,bevel=.065)
sphere('Basin bowl',(.34,3.95,.83),(.22,.26,.08),ceramic)
bar('Basin tap',(.095,3.95,.85),(.095,3.95,1.04),.014)
bar('Basin spout',(.095,3.95,1.04),(.28,3.95,1.04),.014)
box('Bathroom mirror',(.015,3.95,1.52),(.025,.65,.90),mirror,bevel=.08)
box('Toilet concealed cistern',(.09,3.12,.58),(.16,.59,1.13),stone)
sphere('Toilet ceramic body',(.38,3.12,.33),(.35,.215,.25),ceramic)
sphere('Toilet seat',(.43,3.12,.49),(.32,.22,.032),white)
box('Toilet flush plate',(.177,3.12,.94),(.014,.19,.12),bronze)
box('Washing machine',(1.34,2.93,.43),(.58,.55,.85),white,bevel=.028)
cylinder('Washer porthole',(1.34,3.218,.42),.205,.027,black,(math.pi/2,0,0))
cylinder('Washer glass',(1.34,3.236,.42),.151,.015,mirror,(math.pi/2,0,0))
box('Washer control strip',(1.34,3.216,.74),(.51,.016,.10),white)
for z in [.92,.98]:box('Folded bathroom towel',(1.34,2.95,z),(.41,.33,.05),fabric,bevel=.02)
for z in [.55,1.15,1.75,2.35]:
    box('Bathroom tile horizontal joint',(.005,3.87,z),(.004,2.36,.003),seam,DETAIL,0)
for y in [3.3,3.9,4.5]:box('Bathroom tile vertical joint',(.005,y,1.5),(.004,.003,3),seam,DETAIL,0)

transform_group(before,sx=-1,tx=6.97,sy=.90,ty=.32)
before=set(bpy.data.objects)
# Shallow loggia retains its true compact proportions and only one access.
box('Loggia bench',(2.87,-1.09,.43),(.65,.70,.09),oak,bevel=.045)
for x in [2.65,3.09]:box('Loggia bench side',(x,-1.09,.22),(.055,.61,.42),oak)
box('Loggia bench cushion',(2.87,-1.09,.51),(.61,.64,.08),fabric,bevel=.05)
plant('Loggia plant',.37,-1.10)
cylinder('Loggia side table',(2.09,-1.16,.59),.22,.055,stone)
cylinder('Loggia table stem',(2.09,-1.16,.31),.035,.53,bronze)
cylinder('Loggia table foot',(2.09,-1.16,.035),.17,.05,bronze)

transform_group(before,tx=3.64,ty=-.06)
def area(name,loc,target,power,size,color=(1,.94,.84),shape='DISK',size_y=None):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape=shape;data.size=size;data.color=color
    if size_y is not None:data.size_y=size_y
    o=bpy.data.objects.new(name,data);LIGHT.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    o.visible_camera=False;o.visible_glossy=False;o.visible_transmission=False
    return o
world=bpy.data.worlds.new('Soft daylight world');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.86,1,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65;scene.world=world
area('Living daylight',(1.60,-2.1,1.95),(1.8,2,1.1),530,2.8,(.90,.95,1),'RECTANGLE',2.0)
area('Loggia daylight',(5.3,-2.6,1.9),(5.3,2,1.2),460,2.5,(.90,.95,1),'RECTANGLE',2.0)
for name,x,y,power,size in [('Hall',4.05,4.05,140,1.4),('Bath',6.05,3.85,110,1.1),('Kitchen',5.3,1.7,170,1.8),('Living',1.9,1.8,240,2.6),('Loggia',5.3,-1.18,40,1)]:
    area(name+' ceiling softbox',(x,y,2.94),(x,y,0),power,size)
emit=mat('Warm lamp diffuser',(1,.84,.60),.3)
p=emit.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.83,.61,1);p.inputs['Emission Strength'].default_value=3
for x,y in [(4.2,4.5),(4.3,3.5),(6.1,3.7),(5.4,2.1),(5.4,.6),(1.8,3.4),(1.8,.5),(1.8,-.8),(5.3,-1.15)]:
    cylinder('Recessed downlight trim',(x,y,2.979),.073,.025,bronze)
    cylinder('Downlight luminous face',(x,y,2.962),.057,.010,emit)
def camera(name,loc,target,lens=21,ortho=None):
    d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);CAMS.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    d.lens=lens;d.clip_start=.035;d.clip_end=200
    if ortho:d.type='ORTHO';d.ortho_scale=ortho
    return o
shots=[
    ('01-hallway-entry','Прихожая — от входа',(3.97,4.80,1.62),(4.18,3.05,1.32),17),
    ('02-bathroom','Санузел — ванна и раковина',(5.34,3.39,1.64),(6.15,4.23,1.18),16),
    ('03-living-room','Гостиная — к окну',(3.23,3.27,1.62),(1.42,.74,1.18),21),
    ('04-kitchen','Кухня — к лоджии',(4.32,2.57,1.62),(5.65,.57,1.18),18),
    ('05-loggia','Лоджия — общий вид',(4.02,-.83,1.55),(6.46,-1.20,1.12),18),
    ('06-living-reverse','Гостиная — к прихожей',(.55,-1.04,1.62),(2.26,2.91,1.26),21),
    ('07-kitchen-reverse','Кухня — к прихожей',(4.08,.12,1.63),(5.82,2.30,1.25),18),
    ('08-hallway-reverse','Прихожая — к входу',(3.97,3.40,1.63),(3.82,4.88,1.37),17),
    ('09-bathroom-reverse','Санузел — унитаз и стиральная машина',(5.51,4.10,1.66),(6.06,2.96,1.03),16),
]
for key,label,loc,target,lens in shots:
    camera(key+' | '+label,loc,target,lens)
top=camera('00-plan-top | План сверху',(3.52,1.70,15),(3.52,1.70,0),ortho=8.4)
overview=camera('00-apartment-overview | Общий макет',(12,-11,16),(3.45,1.55,.5),ortho=12.9)
walk=camera('10-walkthrough | Маршрут по квартире',(3.97,4.80,1.62),(4.1,3.2,1.4),20)
# Every change of room explicitly passes through its doorway. Linear position
# interpolation prevents spline overshoot into partitions or furniture.
route=[
    ('Вход',(3.97,4.80,1.62),(4.15,3.3,1.4)),
    ('Прихожая',(3.97,3.74,1.62),(5.9,3.9,1.3)),
    ('Дверь санузла',(5.14,3.74,1.62),(6.1,4.25,1.3)),
    ('Санузел',(5.73,3.86,1.62),(6.1,4.50,1.2)),
    ('Обратный вид санузла',(5.73,3.86,1.62),(6.1,2.96,1.0)),
    ('Выход из санузла',(5.14,3.74,1.62),(4.1,3.8,1.4)),
    ('Через прихожую',(4.0,3.90,1.62),(3.1,3.0,1.4)),
    ('Перед гостиной',(3.17,3.90,1.62),(3.17,2.4,1.4)),
    ('Дверь гостиной',(3.17,3.56,1.62),(1.7,1.2,1.3)),
    ('Гостиная',(2.87,2.60,1.62),(.55,1.4,1.2)),
    ('У окна гостиной',(2.84,-.67,1.62),(1.7,2.3,1.25)),
    ('Назад к двери гостиной',(2.87,2.60,1.62),(3.17,3.9,1.4)),
    ('Выход из гостиной',(3.17,3.56,1.62),(4.1,3.9,1.4)),
    ('Перед гостиной обратно',(3.17,3.90,1.62),(4.2,3.6,1.4)),
    ('Прихожая перед кухней',(4.19,3.63,1.62),(4.2,2.2,1.4)),
    ('Дверь кухни',(4.19,3.09,1.62),(5.5,1.3,1.3)),
    ('Кухня',(4.22,2.43,1.62),(6.65,1.3,1.2)),
    ('Обход стола',(5.94,2.28,1.62),(5.95,.0,1.35)),
    ('Проход вдоль гарнитура',(5.94,.27,1.62),(5.32,-.25,1.4)),
    ('Перед лоджией',(5.32,.27,1.62),(5.32,-1.2,1.4)),
    ('Дверь лоджии',(5.32,-.25,1.62),(5.32,-1.2,1.4)),
    ('Лоджия',(5.32,-.90,1.62),(6.65,-1.2,1.2)),
]
walk.rotation_mode='QUATERNION'
for i,(label,loc,target) in enumerate(route):
    q=(Vector(target)-Vector(loc)).to_track_quat('-Z','Y')
    if i and q.dot(prevq)<0:
        q.negate()
    prevq=q.copy()
    for frame in (1+i*75,21+i*75):
        walk.location=loc
        walk.rotation_quaternion=q
        walk.keyframe_insert(data_path='location',frame=frame)
        walk.keyframe_insert(data_path='rotation_quaternion',frame=frame)
    scene.timeline_markers.new(label,frame=1+i*75)
for layer in walk.animation_data.action.layers:
    for strip in layer.strips:
        for bag in strip.channelbags:
            for curve in bag.fcurves:
                for keyframe in curve.keyframe_points:
                    keyframe.interpolation='LINEAR'
scene.frame_end=21+(len(route)-1)*75
scene.render.fps=30
refpath=ROOT.parent/'plans'/'source-plan.png'
im=bpy.data.images.load(str(refpath))
im.pack()
o=bpy.data.objects.new('Original 39.87 plan — packed reference',None)
REF.objects.link(o)
o.empty_display_type='IMAGE'
o.data=im
o.empty_display_size=im.size[0]*S
o.location=((im.size[0]/2-220)*S,(956-im.size[1]/2)*S,-.17)
REF.hide_render=True
REF.hide_viewport=True
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.cycles.max_bounces=8
scene.cycles.transparent_max_bounces=8
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='METAL'
    prefs.get_devices()
    if any(d.type=='METAL' for d in prefs.devices):
        for d in prefs.devices:
            d.use=d.type=='METAL'
        scene.cycles.device='GPU'
except Exception as error:
    print('CPU fallback:',error,flush=True)
scene.render.resolution_x=1600
scene.render.resolution_y=1100
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGB'
scene.view_settings.view_transform='AgX'
scene.view_settings.exposure=-.1
scene.render.film_transparent=False
scene['Source']='39.87 m²; contours traced from source-plan.png, dimensions approximate.'
scene['Ceiling_height_m']=H
scene['Route']='Entry → hall → bath → hall → living → hall → kitchen → loggia'
scene['Instructions']='See README.md. 01–09 interior cameras; 00 cutaways hide ceilings; 10 animated walkthrough.'
scene.camera=bpy.data.objects[shots[0][0]+' | '+shots[0][1]]
scene.frame_set(1)
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_perspective='PERSP'
            a.spaces.active.region_3d.view_rotation=overview.rotation_euler.to_quaternion()
            a.spaces.active.region_3d.view_location=(3.45,1.55,.5)
            a.spaces.active.region_3d.view_distance=13.5
            a.spaces.active.shading.color_type='MATERIAL'
            a.spaces.active.shading.show_shadows=True
            a.spaces.active.shading.show_cavity=True
            a.spaces.active.overlay.show_extras=False
            a.spaces.active.clip_end=200
CEIL.hide_viewport=True
scene.render.filepath=str(ROOT.parent/'renders'/'01-hallway-entry.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'apartment-39-87.blend'),compress=True)
manifest={'apartment_label_m2':39.87,'source_plan':'../plans/source-plan.png','scale_m_per_pixel':S,'pixel_origin':[220,956],'ceiling_m':H,'rooms':areas,'shots':[{'file':key+'.png','label':label,'camera':key+' | '+label,'position_m':loc,'look_at_m':target,'lens_mm':lens} for key,label,loc,target,lens in shots],'overview_cameras':[{'file':c.name.split(' | ')[0]+'.png','camera':c.name,'position_m':list(c.location),'ortho_scale':c.data.ortho_scale} for c in [top,overview]],'route':[{'frame':1+i*75,'label':label,'position_m':loc,'look_at_m':target} for i,(label,loc,target) in enumerate(route)],'animation':{'fps':30,'frame_end':scene.frame_end,'position_interpolation':'LINEAR'}}
(ROOT/'scene_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('SCENE_SAVED',len(bpy.data.objects),'objects',flush=True)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if '--no-render' not in args:
    preview='--preview' in args
    render_dir=ROOT.parent/('renders/previews' if preview else 'renders')
    render_dir.mkdir(exist_ok=True)
    scene.render.resolution_percentage=50 if preview else 100
    scene.cycles.samples=16 if preview else 48
    only=args[args.index('--only')+1].split(',') if '--only' in args else None
    for key,label,*_ in shots:
        if only and key not in only:
            continue
        scene.camera=bpy.data.objects[key+' | '+label]
        scene.render.filepath=str(render_dir/(key+'.png'))
        print('RENDER_START',key,flush=True)
        bpy.ops.render.render(write_still=True)
    CEIL.hide_render=True
    for o in FURN.objects:
        if o.name.startswith(('Recessed downlight','Downlight luminous')):
            o.hide_render=True
    area('Overview studio fill',(3.5,1.5,9),(3.5,1.5,0),950,7,(1,.96,.90))
    for c,key in [(top,'00-plan-top'),(overview,'00-apartment-overview')]:
        if only and key not in only:
            continue
        scene.camera=c
        scene.render.resolution_x=1600
        scene.render.resolution_y=1500
        scene.render.filepath=str(render_dir/(key+'.png'))
        print('RENDER_START',key,flush=True)
        bpy.ops.render.render(write_still=True)
    print('ALL_RENDERS_COMPLETE',flush=True)
