"""Rebuild the editable hero drawing traced from the approved 845px reference."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "website/src/assets/company-blueprint.svg"
parts = []


def path(d, **attrs):
    properties = " ".join(f'{key.replace("_", "-")}="{value}"' for key, value in attrs.items())
    parts.append(f'    <path d="{d}" {properties}/>')


def group(name, attrs=""):
    parts.append(f'  <g id="{name}" data-blueprint-layer="{name}" {attrs}>')


def end():
    parts.append("  </g>")


def line(x1, y1, x2, y2, **attrs):
    path(f"M{x1:g} {y1:g}L{x2:g} {y2:g}", **attrs)


def polygon(points, **attrs):
    path("M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in points) + "Z", **attrs)


def recessed_window(left, right, top, bottom, name, *, transom=False, mullion=True, cross_fraction=.71):
    """An opening in the wall with four reveals and a separate inset frame.

    Width-dependent depth preserves the reference's perspective: the nearer,
    wider openings show more of the left reveal. Glazing is opaque so facade
    construction seams cannot read as mullions through a filled opening.
    """
    width = right - left
    depth = min(4.5, max(1.65, width * .15))
    inner_left, inner_right = left + depth, right - max(.7, width * .035)
    inner_top = lambda x: top(x) + 2.1
    inner_bottom = lambda x: bottom(x) - 1.05
    a, b = (left, top(left)), (right, top(right))
    c, d = (right, bottom(right)), (left, bottom(left))
    e, f = (inner_left, inner_top(inner_left)), (inner_right, inner_top(inner_right))
    g, h = (inner_right, inner_bottom(inner_right)), (inner_left, inner_bottom(inner_left))
    parts.append(f'    <g id="{name}" data-window="recessed">')
    polygon([a, b, c, d], fill="#93948f", stroke="#777873", stroke_width=".65")
    polygon([a, d, h, e], fill="#deded8", stroke="#a1a29d", stroke_width=".35", data_window_part="left-reveal")
    polygon([a, b, f, e], fill="#9b9c98", stroke="none", data_window_part="head-reveal")
    polygon([b, c, g, f], fill="#abaca7", stroke="none", data_window_part="right-reveal")
    polygon([d, c, g, h], fill="#e7e6de", stroke="#8f918b", stroke_width=".35", data_window_part="sill")
    polygon([e, f, g, h], fill="url(#blueprint-recessed-glass)", stroke="#757672", stroke_width=".65", data_window_part="glazing")
    # The darkest edges belong inside the opening, away from the wall surface.
    line(*e, *h, stroke="#6a6d68", stroke_width="1.1", opacity=".85")
    line(*e, *f, stroke="#686b66", stroke_width="1.2", opacity=".9")
    middle = (inner_left + inner_right) / 2
    if mullion:
        line(middle, inner_top(middle), middle, inner_bottom(middle), stroke="#737570", stroke_width="1.2")
    cross = lambda x: inner_top(x) + (inner_bottom(x) - inner_top(x)) * cross_fraction
    line(inner_left, cross(inner_left), inner_right, cross(inner_right), stroke="#71736e", stroke_width="1.55")
    if transom:
        line(inner_left, inner_top(inner_left) + 9, inner_right, inner_top(inner_right) + 9, stroke="#6c6e68", stroke_width="1.45")
    # A fine highlight separates the frame from the lit side reveal.
    line(inner_left + .65, inner_top(inner_left) + 1, inner_left + .65, inner_bottom(inner_left) - .5, stroke="#d5d7cf", stroke_width=".35")
    parts.append('    </g>')


parts.append('''<svg xmlns="http://www.w3.org/2000/svg" width="520" height="443" viewBox="305 59 520 443" fill="none" role="img" aria-labelledby="blueprint-title blueprint-desc">
  <title id="blueprint-title">Архитектурный чертёж Траст Строй</title>
  <desc id="blueprint-desc">Ступенчатый фасад здания, строительные оси, большая дуга и две терракотовые плоскости.</desc>
  <defs>
    <clipPath id="blueprint-base-clip"><path d="M305 59H825V487H305Z"/></clipPath>
    <linearGradient id="blueprint-terracotta" x1="0" x2="1"><stop stop-color="#9e472f"/><stop offset="1" stop-color="#a24b34"/></linearGradient>
    <linearGradient id="blueprint-glass" x1="0" x2="1"><stop stop-color="#b6b6b2" stop-opacity=".57"/><stop offset="1" stop-color="#92938f" stop-opacity=".39"/></linearGradient>
    <linearGradient id="blueprint-recessed-glass" x1="0" x2="1"><stop stop-color="#afafab"/><stop offset=".18" stop-color="#bcbcb8"/><stop offset=".55" stop-color="#c2c2be"/><stop offset="1" stop-color="#b8b8b4"/></linearGradient>
  </defs>''')
group("construction", 'stroke="#777774" stroke-width=".7" opacity=".75"')
for coords in [(386.5,80,623,80),(413,72,413,501),(562,80,562,501),(623,80,623,198),(356,162,356,493),(356,486,723,486),(723,60,723,487),(733,85.5,760,85.5),(723,222.5,815,222.5),(723,354.5,815,354.5),(477,450,477,501),(654,273,654,501)]:
    line(*coords)
path("M513 59V303H305M543 71V487M723 303H772V393", stroke_dasharray="3 2", opacity=".6")
end()
group("rear-accent")
path("M593 60H654V144L593 180Z", fill="url(#blueprint-terracotta)")
path("M593 80H623V162", stroke="#673d30", stroke_width=".7", opacity=".65")
end()
group("rear-volume", 'stroke="#7a7a76" stroke-width=".85" stroke-linejoin="round"')
path("M562 198L723 98L733 105M562 214L723 113L733 120M723 98V303L733 309", opacity=".9")
path("M623 160V247L723 303V113", fill="#f4f3ef", fill_opacity=".25")
recessed_window(686, 704, lambda x: 136 - (x - 686) * 11 / 18, lambda x: 270 + (x - 686) * 10 / 18, "rear-window", mullion=False, cross_fraction=.15)
path("M686 175L704 164M686 223L704 213M686 265L704 255", opacity=".65")
path("M649 145V261M675 129V274M704 111V292M733 96V303", stroke_width=".5", opacity=".7")
path("M623 222L723 165M648 260L723 205", stroke_width=".65")
for x in [575,596,617,638,659,680,701]:
    top = 198 - (x - 562) * 100 / 161
    line(x, top, x, top + 15, stroke_width=".5", opacity=".65")
end()
group("facade", 'stroke="#777873" stroke-width=".8" stroke-linejoin="round" clip-path="url(#blueprint-base-clip)"')
path("M389 376L534 307V230L614 191L723 248V487H390Z", fill="#f2f0eb")
path("M534 239L614 198L723 254M534 230L614 191L723 248", stroke_width="1")
path("M387 354L543 275M387 377L614 271M387 375L614 269", stroke_width=".85")
path("M614 191V487M611 193V486M534 230V487M539 227V487", opacity=".8")
path("M534 272L614 231L723 283M614 271L650 286", stroke_width=".85")
path("M365 430L615 335L654 350M373 443L615 364L650 374M389 476L615 424L651 432M406 487L615 445L651 452", stroke_width=".9")
for x in [393,403,421,441,460,477,489,519,545,562,576,598]:
    top = 376 - (x - 390) * 105 / 224
    if x >= 534:
        top = 230 - (x - 534) * 39 / 80
    line(x, top, x, 488, stroke_width=".55", opacity=".8")
for x in [402,423,441,460,479,497,516]:
    top = 354 - (x - 387) * 79 / 156
    line(x, top, x, top + 22, stroke_width=".55", opacity=".65")
path("M648 209V486M651 211V486M685 228V277M704 238V277", stroke_width=".65")
end()
group("windows", 'stroke="#747571" stroke-width=".9" clip-path="url(#blueprint-base-clip)"')
rows = [(376, .466, 419, .373), (441, .335, 478, .244), (489, .181, 519, .14)]
for row, (top_start, top_slope, bottom_start, bottom_slope) in enumerate(rows):
    for column, (left, right) in enumerate([(393,403),(417,429),(447,477),(507,532),(563,591)]):
        top = lambda x: top_start - (x - 390) * top_slope
        bottom = lambda x: bottom_start - (x - 390) * bottom_slope
        recessed_window(left, right, top, bottom, f"window-{row + 1}-{column + 1}", transom=row == 0 and column == 3)
end()
group("arc", 'stroke="#70716f" stroke-width=".85"')
path("M513 106C406 106 314 193 314 300C314 397 380 470 477 486")
end()
group("front-accent")
path("M636 278H705V487H636Z", fill="url(#blueprint-terracotta)")
path("M636 273V487M654 280V487M636 279L654 284M636 342L654 350", stroke="#733f30", stroke_width=".7", opacity=".75")
end()
group("registration", 'fill="#676865"')
for x, y in [(356,162),(356,486),(623,80),(513,106),(723,486),(733,222),(760,85.5)]:
    parts.append(f'    <circle cx="{x}" cy="{y}" r=".8"/>')
end()
group("annotations", 'fill="#292930" font-family="Arial, sans-serif" font-size="8.7" letter-spacing=".5"')
for x, y, rows in [(429,205,["ПРОСТРАНСТВА","КОТОРЫЕ","ВДОХНОВЛЯЮТ"]),(760,109,["БОЛЬШЕ","ЧЕМ ПРОСТО","ДОМ"]),(746,427,["СОВРЕМЕННЫЕ","РЕШЕНИЯ","ДЛЯ ЛУЧШЕГО","ЗАВТРА"])]:
    parts.append(f'    <text x="{x}" y="{y}">' + ''.join(f'<tspan x="{x}" dy="{0 if i == 0 else 13.5}">{text}</tspan>' for i, text in enumerate(rows)) + '</text>')
path("M429 250H458M760 149H787M746 485.5H773", stroke="#303039", stroke_width="1")
end()
parts.append('</svg>')
DEST.parent.mkdir(parents=True, exist_ok=True)
DEST.write_text('\n'.join(parts) + '\n', encoding='utf-8')
print(DEST)
