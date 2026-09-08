"""Reproducible apartment study. Run with Blender --background --python this_file.
Source plan geometry is traced in pixels and uniformly scaled using the bathroom area.
All dimensions are approximate: the source has no dimension chains.
"""
import bpy, math, os, json, sys, random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
ROOT.mkdir(exist_ok=True)
(ROOT / 'renders').mkdir(exist_ok=True)
random.seed(36)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection': bpy.data.collections.remove(c)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.length_unit = 'METERS'
S = math.sqrt(4.09 / (100 * 136))
H = 3.0
def xy(p): return ((p[0]-198)*S, (934-p[1])*S)
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
    'Hallway':([(308,642),(488,642),(488,725),(384,725),(384,747),(308,747)],stone,5.20),
    'Bathroom':([(198,642),(298,642),(298,778),(198,778)],stone,4.09),
    'Kitchen':([(198,788),(308,788),(308,755),(383,755),(383,934),(198,934)],oak,9.19),
    'Living room':([(394,737),(498,737),(498,679),(620,679),(620,934),(394,934)],oak,16.36),
    'Loggia':([(198,970),(395,970),(395,1032),(198,1032)],stone,3.67),
}
areas={}
for name,(pts,m,target) in rooms.items():
    slab(name+' floor',pts,-.14,.14,m,FLOORS)
    area=abs(sum(pts[i][0]*pts[(i+1)%len(pts)][1]-pts[(i+1)%len(pts)][0]*pts[i][1] for i in range(len(pts))))/2*S*S
    areas[name]={'source_area_m2':target,'traced_clear_floor_m2':round(area,2)}
shell=[(182,626),(504,626),(504,660),(636,660),(636,958),(416,958),(416,1048),(182,1048)]
slab('Continuous structural floor',shell,-.22,.075,stone,FLOORS)
slab('Continuous ceiling',shell,H,.14,white,CEIL)
# Shared thresholds bridge the source plan's wall gaps.
for name,pts in [('Bath threshold',[(298,692),(308,692),(308,741),(298,741)]),('Kitchen threshold',[(320,747),(377,747),(377,755),(320,755)]),('Living threshold',[(398,725),(460,725),(460,737),(398,737)]),('Balcony threshold',[(270,934),(310,934),(310,970),(270,970)])]:
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
# Exterior contour and exact room adjacency from source plan.
wallseg('West exterior',(190,633),(190,1040),.28)
segmented('North exterior',(190,633),(497,633),[(132/307,187/307,0,2.35)],.24)
wallseg('North step',(497,633),(497,668),.22)
wallseg('Living north exterior',(497,668),(628,668),.24)
wallseg('East exterior',(628,668),(628,950),.24)
segmented('Living window wall',(388,950),(628,950),[(70/240,194/240,.57,2.65)],.30)
segmented('Kitchen balcony wall',(190,950),(408,950),[(80/218,126/218,0,2.55),(126/218,190/218,.78,2.55)],.30)
wallseg('Loggia east return',(408,950),(408,1040),.28)
segmented('Loggia front',(190,1040),(408,1040),[(12/218,202/218,.52,2.75)],.20)
segmented('Bathroom east partition',(303,638),(303,783),[(54/145,104/145,0,2.3)],.14)
wallseg('Bathroom south partition',(194,783),(303,783),.14)
segmented('Kitchen entrance partition',(303,751),(388,751),[(16/85,74/85,0,2.3)],.14)
wallseg('Kitchen living partition',(388,751),(388,941),.14)
wallseg('Hall corner',(388,751),(388,730),.14)
segmented('Living entrance partition',(388,730),(492,730),[(10/104,72/104,0,2.3)],.14)
wallseg('Hall wardrobe partition',(492,638),(492,730),.14)

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
doorframe('Entry',xy((349.5,633)),55*S,height=2.35)
box('Entry door closed',(*xy((349.5,633)),1.15),(55*S,.065,2.30),oak,DETAIL)
doorframe('Bathroom',xy((303,717)),50*S,'Y')
openleaf('Bathroom open door',xy((303,692)),50*S,math.pi/4)
doorframe('Kitchen',xy((348,751)),58*S)
openleaf('Kitchen open door',xy((377,755)),58*S,-math.pi/2)
doorframe('Living room',xy((429,730)),62*S)
openleaf('Living room open door',xy((398,737)),62*S,-math.pi/2)
def glazing(name,a,b,sill,top,panels=3):
    a,b=Vector(xy(a)),Vector(xy(b)); mid=(a+b)/2; length=(b-a).length
    for z in [sill,top]:box(name+' horizontal frame',(*mid,z),(length,.08,.06),white,DETAIL,.008)
    for i in range(panels+1):
        p=a+(b-a)*i/panels; box(name+' mullion',(*p,(sill+top)/2),(.055,.08,top-sill),white,DETAIL,.006)
    box(name+' glass',(*mid,(sill+top)/2),(length-.06,.015,top-sill-.06),glass,DETAIL,.002)
glazing('Living window',(458,950),(582,950),.57,2.65,3)
glazing('Loggia facade',(202,1040),(392,1040),.52,2.75,4)
glazing('Kitchen balcony window',(316,950),(380,950),.78,2.55,2)
doorframe('Loggia door',xy((293,950)),46*S,height=2.55)
# An open glazed door along the kitchen-side wall.
glazing('Balcony door leaf',(270,940),(316,940),.08,2.48,1)
for o in list(DETAIL.objects):
    if o.name.startswith('Balcony door leaf'):
        pivot=Vector((*xy((270,940)),0)); o.location=pivot+Vector((-(o.location-pivot).y,(o.location-pivot).x,(o.location-pivot).z));o.rotation_euler.z=math.pi/2

# Skirting on long uninterrupted walls; boards and grout provide scale cues.
for a,b in [((198,642),(298,642)),((198,788),(198,934)),((394,755),(394,934)),((620,679),(620,934)),((308,642),(320,642))]:
    aa,bb=Vector(xy(a)),Vector(xy(b));d=bb-aa;o=box('Ivory skirting',(*( (aa+bb)/2),.055),(d.length,.022,.11),white,DETAIL,.003);o.rotation_euler.z=math.atan2(d.y,d.x)
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
        for j in range(550):
            y=-.01+j*.01;hit=inside(x,y,pts)
            if hit and start is None:start=y
            if not hit and start is not None:ranges.append((start,y));start=None
        for a,b in ranges:box('Oak board joint',(x,(a+b)/2,.001),(.0025,b-a,.001),seam,FLOORS,0)
        for y in [i*1.15+((int(x/.2)%3)*.37) for i in range(5)]:
            if inside(x+.1,y,pts) and inside(x+.195,y,pts):box('Staggered board end',(x+.1,y,.001),(.2,.0025,.001),seam,FLOORS,0)

# Hall wardrobe on the east side of the entrance, as on the drawing.
for i in range(3):
    y=3.72+i*.46
    box('Hall oak wardrobe carcass',(4.72,y,1.4),(.57,.455,2.8),oak)
    box('Hall oak wardrobe front',(4.418,y,1.4),(.025,.445,2.78),oak)
    bar('Hall bronze pull',(4.388,y+.12,.99),(4.388,y+.12,1.59),.009)
box('Hall console',(3.58,4.96,.82),(.68,.22,.16),oak)
box('Hall mirror',(3.58,5.00,1.68),(.68,.028,1.15),mirror)

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
box('Dining tabletop',(2.14,1.15,.76),(.78,1.12,.065),oak,bevel=.14)
for x in [1.88,2.40]:
    for y in [.75,1.55]:bar('Dining table leg',(x,y,.06),(x,y,.73),.032,oak)
def chair(name,x,y,angle=0):
    parts=[]
    parts.append(box(name+' seat',(x,y,.46),(.45,.45,.075),oak,bevel=.065))
    parts.append(box(name+' curved back',(x,y+.20,.73),(.46,.065,.28),oak,bevel=.055))
    for dx in [-.16,.16]:
        for dy in [-.16,.16]:parts.append(bar(name+' leg',(x+dx*1.2,y+dy*1.2,.03),(x+dx,y+dy,.44),.022,oak))
    for o in parts:
        v=o.location-Vector((x,y,0));o.location=(x+v.x*math.cos(angle)-v.y*math.sin(angle),y+v.x*math.sin(angle)+v.y*math.cos(angle),v.z);o.rotation_euler.z+=angle
chair('Dining chair north',2.14,2.00,0)
chair('Dining chair south',2.14,.30,math.pi)
cylinder('Table ceramic bowl',(2.14,1.15,.835),.13,.08,ceramic)

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
    box('Living upper wardrobe',(5.43+i*.43,4.04,1.37),(.425,.56,2.74),oak)
    bar('Living wardrobe pull',(5.56+i*.43,3.745,1.05),(5.56+i*.43,3.745,1.55),.008)
# Curtains beside, rather than across, the living glazing.
for base in [4.46,6.57]:
    for i in range(8):
        x=base+i*.047
        o=cylinder('Curtain fold',(x,-.095,1.50),.047,2.92,fabric)
        o.scale.y=.7
def plant(name,x,y,z=0):
    cylinder(name+' planter',(x,y,z+.22),.18,.43,stone)
    for i in range(9):
        a=i*2.4;h=.62+(i%3)*.14
        bar(name+' stem',(x,y,z+.35),(x+math.cos(a)*.20,y+math.sin(a)*.20,z+h),.007,leaf)
        o=sphere(name+' leaf',(x+math.cos(a)*.21,y+math.sin(a)*.21,z+h),(.15,.065,.025),leaf);o.rotation_euler=(.4,a,a)
plant('Living plant',6.96,3.20)

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

# Shallow loggia retains its true compact proportions and only one access.
box('Loggia bench',(2.87,-1.09,.43),(.65,.70,.09),oak,bevel=.045)
for x in [2.65,3.09]:box('Loggia bench side',(x,-1.09,.22),(.055,.61,.42),oak)
box('Loggia bench cushion',(2.87,-1.09,.51),(.61,.64,.08),fabric,bevel=.05)
plant('Loggia plant',.37,-1.10)
cylinder('Loggia side table',(2.09,-1.16,.59),.22,.055,stone)
cylinder('Loggia table stem',(2.09,-1.16,.31),.035,.53,bronze)
cylinder('Loggia table foot',(2.09,-1.16,.035),.17,.05,bronze)

def area(name,loc,target,power,size,color=(1,.94,.84),shape='DISK',size_y=None):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape=shape;data.size=size;data.color=color
    if size_y is not None:data.size_y=size_y
    o=bpy.data.objects.new(name,data);LIGHT.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    o.visible_camera=False;o.visible_glossy=False;o.visible_transmission=False
    return o
world=bpy.data.worlds.new('Soft daylight world');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.86,1,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65;scene.world=world
area('Living daylight',(5.46,-.50,1.95),(5.3,2,1.1),500,2.5,(.90,.95,1),'RECTANGLE',2.0)
area('Loggia daylight',(1.7,-2.4,1.9),(1.7,2,1.2),400,2.5,(.90,.95,1),'RECTANGLE',2.0)
for name,x,y,power,size in [('Hall',3.13,4.24,140,1.6),('Bath',.85,3.85,110,1.15),('Kitchen',1.67,1.7,160,2),('Living',5.48,2.1,200,2.6),('Loggia',1.7,-1.12,40,1)]:
    area(name+' ceiling softbox',(x,y,2.94),(x,y,0),power,size)
emit=mat('Warm lamp diffuser',(1,.84,.60),.3)
p=emit.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.83,.61,1);p.inputs['Emission Strength'].default_value=3
for x,y in [(2.6,4.65),(3.4,3.8),(.85,3.5),(1.4,2.3),(1.4,.7),(5.3,2.8),(5.3,.6),(1.7,-1.1)]:
    cylinder('Recessed downlight trim',(x,y,2.979),.073,.025,bronze)
    cylinder('Downlight luminous face',(x,y,2.962),.057,.010,emit)
def camera(name,loc,target,lens=21,ortho=None):
    d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);CAMS.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    d.lens=lens;d.clip_start=.035;d.clip_end=200
    if ortho:d.type='ORTHO';d.ortho_scale=ortho
    return o
shots=[
 ('01-hallway-entry','Прихожая — от входа',(2.63,4.94,1.62),(2.92,3.10,1.35),18),
 ('02-bathroom','Санузел — от двери',(1.57,3.56,1.68),(.60,4.05,1.13),16),
 ('03-living-room','Гостиная — общий вид',(3.93,3.25,1.62),(5.58,1.10,1.26),21),
 ('04-kitchen','Кухня — к лоджии',(2.67,2.91,1.61),(1.32,.75,1.27),19),
 ('05-loggia','Лоджия — общий вид',(.48,-.73,1.56),(2.76,-1.13,1.20),19),
 ('06-living-reverse','Гостиная — обратный вид',(6.76,.20,1.60),(4.24,2.85,1.29),21),
 ('07-kitchen-reverse','Кухня — к прихожей',(2.79,.12,1.60),(1.14,2.32,1.28),19),
 ('08-hallway-reverse','Прихожая — к входной двери',(2.60,3.24,1.62),(3.20,4.85,1.35),18),
 ('09-bathroom-reverse','Санузел — техника и унитаз',(1.53,4.33,1.65),(.76,2.94,.98),16),
]
for idx,(key,label,loc,target,lens) in enumerate(shots):
    c=camera(key+' | '+label,loc,target,lens)
    scene.timeline_markers.new(label,frame=1+idx*40)
top=camera('00-plan-top | План сверху',(3.7,1.6,14),(3.7,1.6,0),ortho=9.1)
overview=camera('00-apartment-overview | Общий макет',(11,-10,15),(3.55,1.65,.3),ortho=12.4)
# Walking camera: keyframed tour with pauses inside each room.
walk=camera('10-walkthrough | Маршрут по квартире',(2.63,4.94,1.62),(2.85,3.5,1.45),20)
route=[((2.63,4.94,1.62),(2.8,3.25,1.5)),((2.52,3.72,1.62),(.7,3.9,1.3)),((1.5,3.72,1.62),(.55,4.48,1.2)),((2.5,3.72,1.62),(4.0,3.8,1.45)),((4.0,3.82,1.62),(4.1,2.8,1.4)),((4.03,3.18,1.62),(5.8,1.4,1.3)),((4.68,2.26,1.62),(6.3,1.0,1.3)),((4.03,3.18,1.62),(4.0,4.0,1.45)),((4.0,3.82,1.62),(2.6,3.65,1.45)),((2.6,3.67,1.62),(2.5,2.0,1.4)),((2.55,2.62,1.62),(1.3,.8,1.3)),((2.82,1.1,1.62),(1.64,-.8,1.4)),((1.66,.09,1.62),(1.66,-1.1,1.4)),((1.66,-.88,1.62),(2.9,-1.15,1.3))]
walk.rotation_mode='QUATERNION'
route[-2:-2]=[((2.82,-.055,1.62),(1.66,-.055,1.4))]
for i,(loc,target) in enumerate(route):
    q=(Vector(target)-Vector(loc)).to_track_quat('-Z','Y')
    if i and q.dot(prevq)<0:q.negate()
    prevq=q.copy()
    for frame in [1+i*90,31+i*90]:
        walk.location=loc;walk.rotation_quaternion=q;walk.keyframe_insert(data_path='location',frame=frame);walk.keyframe_insert(data_path='rotation_quaternion',frame=frame)
scene.frame_end=31+(len(route)-1)*90
scene.render.fps=30
# Source reference plane is an image empty, visible only when explicitly enabled.
refpath=ROOT.parent/'source-plan (фон удален).png'
im=bpy.data.images.load(str(refpath));im.pack()
o=bpy.data.objects.new('Original apartment plan — packed image',None);REF.objects.link(o);o.empty_display_type='IMAGE';o.data=im;o.empty_display_size=im.size[0]*S
o.location=((im.size[0]/2-198)*S,(934-im.size[1]/2)*S,-.17)
REF.hide_render=True;REF.hide_viewport=True
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.cycles.max_bounces=8;scene.cycles.transparent_max_bounces=8
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
    devices=[d for d in prefs.devices if d.type=='METAL']
    if devices:
        for d in prefs.devices:d.use=d.type=='METAL'
        scene.cycles.device='GPU'
    print('RENDER_DEVICES',[(d.name,d.type,d.use) for d in prefs.devices],flush=True)
except Exception as e:print('CPU render fallback',e,flush=True)
scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.1
scene.render.film_transparent=False
scene['Source']='36.67 m² apartment plan; source areas are labels, traced geometry is approximate.'
scene['Ceiling_height_m']=3.0
scene['Route']='Entry → hallway → bathroom → hallway → living → hallway → kitchen → loggia'
scene['Instructions']='Interior cameras 01–09; plan/overview require ceilings hidden. Camera 10 has an animated route. See README.md.'
scene.camera=bpy.data.objects[shots[0][0]+' | '+shots[0][1]]
scene.frame_set(1)
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_perspective='PERSP'
            a.spaces.active.region_3d.view_rotation=overview.rotation_euler.to_quaternion()
            a.spaces.active.region_3d.view_location=(3.55,1.65,.4)
            a.spaces.active.region_3d.view_distance=13.5
            a.spaces.active.shading.color_type='MATERIAL'
            a.spaces.active.shading.show_shadows=True
            a.spaces.active.shading.show_cavity=True
            a.spaces.active.overlay.show_extras=False
            a.spaces.active.clip_end=200
CEIL.hide_viewport=True
scene.render.filepath=str(ROOT/'renders'/'01-hallway-entry.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'apartment-36-67.blend'),compress=True)
(ROOT/'scene_manifest.json').write_text(json.dumps({'scale_m_per_pixel':S,'ceiling_m':H,'rooms':areas,'shots':[{'file':key+'.png','label':label,'camera':key+' | '+label,'position_m':loc,'look_at_m':target,'lens_mm':lens} for key,label,loc,target,lens in shots]},ensure_ascii=False,indent=2))
print('SCENE_SAVED',len(bpy.data.objects),'objects',flush=True)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if '--no-render' not in args:
    for key,label,*_ in shots:
        if '--preview' in args:
            scene.render.resolution_percentage=50;scene.cycles.samples=16
        scene.camera=bpy.data.objects[key+' | '+label]
        scene.render.filepath=str(ROOT/'renders'/(key+'.png'))
        print('RENDER_START',key,flush=True);bpy.ops.render.render(write_still=True)
    CEIL.hide_render=True
    for o in FURN.objects:
        if o.name.startswith(('Recessed downlight','Downlight luminous')):o.hide_render=True
    # Open top cutaway views preserve the walls and the complete room arrangement.
    for c,key in [(top,'00-plan-top'),(overview,'00-apartment-overview')]:
        scene.camera=c;scene.render.resolution_x=1600;scene.render.resolution_y=1500
        area('Overview studio fill',(3.5,1.5,9),(3.5,1.5,0),950,7,(1,.96,.90))
        scene.render.filepath=str(ROOT/'renders'/(key+'.png'))
        bpy.ops.render.render(write_still=True)
    print('ALL_RENDERS_COMPLETE',flush=True)
