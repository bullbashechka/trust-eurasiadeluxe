"""Prepare reproducible website media without modifying original assets.

Requires Pillow and ffmpeg (FFMPEG_BINARY, PATH, or imageio-ffmpeg).
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'website/public/media'
SHOT_FILE = ROOT / 'docs/video/shots.json'


def ffmpeg_binary():
    binary = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
    if binary:
        return binary
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        raise SystemExit('Install ffmpeg or set FFMPEG_BINARY; see website/README.md.')


def web_image(source, dest, width=1600, crop=None):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_mtime >= source.stat().st_mtime:
        return
    with Image.open(source) as original:
        img = ImageOps.exif_transpose(original).convert('RGB')
        if crop:
            img = img.crop(crop)
        img.thumbnail((width, width))
        img.save(dest, 'WEBP', quality=87, method=6)


def prepare_images(shots):
    for clip in shots['clips'] + shots['non_ai_clips']:
        source = ROOT / clip['source']
        apartment = source.parts[source.parts.index('apartments') + 1]
        name = source.name[:2]
        web_image(source, OUT / apartment / f'{name}.webp')
    plans = {
        '36-67': 'assets/apartments/36-67/plans/plan-top.jpg',
        '39-87': 'assets/apartments/39-87/renders/00-plan-top.png',
        '79-79': 'assets/apartments/79-79/blender/renders/16-plan-top.png',
    }
    for apartment, path in plans.items():
        web_image(ROOT / path, OUT / apartment / 'plan.webp')
    web_image(ROOT / 'assets/brand/logo-enhanced.png', OUT / 'logo.webp', 500)
    web_image(ROOT / 'assets/brand/site-social-preview.png', OUT / 'social.webp', 1600)
    # Crop only existing screenshot artwork, excluding old prices and social UI.
    building = next((ROOT / 'refs').glob('*5.47.59*'))
    web_image(building, OUT / 'building.webp', 1600, (20, 570, 1216, 1270))


def prepare_clip(job):
    binary, source, dest, width, still = job
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_mtime >= source.stat().st_mtime:
        return
    args = [binary, '-hide_banner', '-loglevel', 'error', '-y']
    if still:
        # High resolution intermediate prevents subpixel jitter in the slow zoom.
        args += ['-i', str(source), '-vf',
                 f"scale=3000:-2,zoompan=z='1+0.05*on/71':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=72:s={width}x{round(width * 1192 / 1736 / 2) * 2}:fps=24", '-t', '3']
    else:
        args += ['-i', str(source), '-vf', f'scale={width}:-2', '-r', '24']
    temporary = dest.with_suffix('.tmp.mp4')
    args += ['-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'fast',
             '-crf', '23' if width > 1000 else '25', '-g', '6', '-keyint_min', '6',
             '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(temporary)]
    subprocess.run(args, check=True)
    temporary.replace(dest)
    print(f'Prepared {dest.relative_to(ROOT)}', flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--images-only', action='store_true')
    args = parser.parse_args()
    shots = json.loads(SHOT_FILE.read_text())
    prepare_images(shots)
    if args.images_only:
        return
    binary = ffmpeg_binary()
    jobs = []
    manifest = []
    for clip in shots['clips'] + shots['non_ai_clips']:
        still = 'received_file' not in clip
        source = ROOT / (clip['source'] if still else clip['received_file'])
        photo = ROOT / clip['source']
        apartment = photo.parts[photo.parts.index('apartments') + 1]
        name = photo.name[:2]
        for width, variant in [(1440, 'desktop'), (864, 'mobile')]:
            dest = OUT / apartment / f'{name}-{variant}.mp4'
            jobs.append((binary, source, dest, width, still))
        manifest.append({'apartment': apartment, 'scene': name,
                         'source': str(source.relative_to(ROOT)), 'still_zoom': still,
                         'duration': 3 if still else 3.04, 'keyframe_interval': 6})
    with ThreadPoolExecutor(max_workers=3) as executor:
        list(executor.map(prepare_clip, jobs))
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'Ready: {len(manifest)} scenes, desktop + mobile.')


if __name__ == '__main__':
    main()
