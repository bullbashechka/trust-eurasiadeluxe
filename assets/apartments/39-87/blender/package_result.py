"""Build offline galleries and a portable archive from the checked Blender output."""
import hashlib
import html
import json
import math
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'scene_manifest.json').read_text())
font_path = Path('/System/Library/Fonts/Helvetica.ttc')

def font(size):
    if font_path.exists():
        return ImageFont.truetype(str(font_path),size)
    try:
        return ImageFont.truetype('DejaVuSans.ttf',size)
    except OSError:
        return ImageFont.load_default()

shots = [
    ('00-plan-top.png','План сверху'),
    ('00-apartment-overview.png','Общий объёмный вид'),
] + [(s['file'],s['label']) for s in manifest['shots']]
for filename, _ in shots:
    path = ROOT / 'renders' / filename
    with Image.open(path) as im:
        im.verify()
assert len(list((ROOT/'renders').glob('*.png'))) == 11
assert json.loads((ROOT/'validation.json').read_text())['passed']

def contact(items, output, columns, width):
    cell_h = round(width * .69) + 46
    rows = math.ceil(len(items)/columns)
    sheet = Image.new('RGB',(columns*width,rows*cell_h+75),'#f4f0e8')
    draw = ImageDraw.Draw(sheet)
    draw.text((20,20),'EURASIA DE LUXE  /  39,87 м²',font=font(27),fill='#3f3831')
    for i,(path,label) in enumerate(items):
        x,y = (i%columns)*width,(i//columns)*cell_h+75
        with Image.open(path) as im:
            thumb = ImageOps.contain(im.convert('RGB'),(width-16,cell_h-54))
        sheet.paste(thumb,(x+(width-thumb.width)//2,y+(cell_h-54-thumb.height)//2))
        draw.text((x+10,y+cell_h-40),label,font=font(16),fill='#3f3831')
    sheet.save(ROOT/output,quality=92)

contact([(ROOT/'renders'/name,label) for name,label in shots],'gallery.jpg',3,520)
route_files = sorted((ROOT/'route-preview').glob('*.png'))
assert len(route_files) == len(manifest['route'])
contact([(p,f'{i+1:02d}. {m["label"]}') for i,(p,m) in enumerate(zip(route_files,manifest['route']))],'route-contact.jpg',4,400)
cards = '\n'.join(
    f'<figure><a href="renders/{name}"><img src="renders/{name}" alt="{html.escape(label)}" loading="lazy"></a><figcaption>{html.escape(label)}<small>{name}</small></figcaption></figure>'
    for name,label in shots)
route_cards = '\n'.join(
    f'<figure><a href="route-preview/{p.name}"><img src="route-preview/{p.name}" alt="{html.escape(m["label"])}" loading="lazy"></a><figcaption>{i+1:02d} · {html.escape(m["label"])}<small>Кадр {m["frame"]} · {(m["frame"]-1)/30:.1f} с</small></figcaption></figure>'
    for i,(p,m) in enumerate(zip(route_files,manifest['route'])))
page = '''<!doctype html>
<html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>39,87 м² — Eurasia De Luxe</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f0e8;color:#38332d;font:16px/1.6 system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:48px 24px}header{max-width:900px;margin-bottom:36px}.brand{font-size:13px;letter-spacing:.18em;color:#866749}h1{font-size:clamp(34px,5vw,64px);font-weight:450;line-height:1.15;margin:18px 0}h2{font-weight:500;margin-top:48px}p{color:#625b53}a{color:#775739;text-underline-offset:4px}nav{display:flex;gap:12px 24px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}figure{margin:0;background:#fffdf8;border:1px solid #e2d9cb;border-radius:10px;overflow:hidden}img{display:block;width:100%;aspect-ratio:16/11;object-fit:contain;background:#e8e3db}figcaption{padding:15px 20px}small{display:block;color:#82786c;font-size:12px}.route{grid-template-columns:repeat(3,minmax(0,1fr))}footer{margin-top:40px;border-top:1px solid #d9cfc0;padding-top:20px;color:#82786c;font-size:13px}@media(max-width:750px){.grid,.route{grid-template-columns:1fr}main{padding:28px 16px}}
</style>
<main><header><div class="brand">EURASIA DE LUXE · ТЁПЛЫЙ СОВРЕМЕННЫЙ</div><h1>Квартира 39,87 м²</h1><p>Демонстрационный макет по исходному плану. Потолки 3 м. Все 11 ракурсов — одна сцена с кремовыми стенами, светлым дубом и бронзовыми деталями.</p><nav><a href="apartment-39-87.blend">Сцена Blender</a><a href="README.md">Инструкция</a><a href="../source-plan.png">Исходный план</a><a href="gallery.jpg">Все ракурсы одним листом</a><a href="#route">Маршрут камеры</a></nav></header>
<div class="grid">CARDS</div><h2 id="route">Маршрут через все помещения</h2><p>53,2 секунды · 22 позиции · анимированная камера 10 в файле Blender. Вход → прихожая → санузел → прихожая → гостиная → прихожая → кухня → лоджия. Изображения ниже показывают ключевые кадры маршрута.</p><div class="grid route">ROUTE_CARDS</div><footer>Размеры восстановлены приблизительно. Это вариант интерьера для визуализации; расхождения площадей и принятые допущения приведены в инструкции. Нажмите на изображение, чтобы открыть полный размер.</footer></main></html>'''
(ROOT/'gallery.html').write_text(page.replace('ROUTE_CARDS',route_cards).replace('CARDS',cards))
# Include the source plan outside blender/ so rebuild scripts remain portable.
files = [ROOT.parent/'source-plan.png']
files += sorted(p for p in ROOT.iterdir() if p.is_file() and p.suffix in {'.py','.md','.json','.html','.jpg','.blend'} and p.name != 'checksums.json')
files += sorted((ROOT/'renders').glob('*.png'))
files += route_files
checksums = {str(p.relative_to(ROOT.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
(ROOT/'checksums.json').write_text(json.dumps(checksums,indent=2,ensure_ascii=False))
files.append(ROOT/'checksums.json')
archive = ROOT/'apartment-39-87-package.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in files:
        z.write(p,Path('39-87')/p.relative_to(ROOT.parent))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if '/renders/' in n]) == 11
print(f'Packaged {len(files)} files: {archive} ({archive.stat().st_size/1024/1024:.1f} MiB)')
