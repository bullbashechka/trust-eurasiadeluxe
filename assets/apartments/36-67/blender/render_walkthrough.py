"""Encode the prepared walkthrough directly to an H.264 MP4."""
import bpy, time, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
s=bpy.context.scene
benchmark='--benchmark' in sys.argv
s.render.image_settings.media_type='VIDEO'
s.render.image_settings.file_format='FFMPEG'
s.render.ffmpeg.format='MPEG4'
s.render.ffmpeg.codec='H264'
s.render.ffmpeg.constant_rate_factor='HIGH'
s.render.ffmpeg.ffmpeg_preset='GOOD'
s.render.ffmpeg.audio_codec='NONE'
s.render.ffmpeg.gopsize=48
s.render.ffmpeg.use_max_b_frames=True
s.render.ffmpeg.max_b_frames=2
s.render.filepath=str(ROOT/'video'/('benchmark.mp4' if benchmark else 'apartment-36-67-walkthrough.mp4'))
if benchmark:s.frame_end=24
else:bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'video'/'apartment-walkthrough.blend'),compress=True)
started=time.time()
def progress(scene):
    if scene.frame_current%24==0:
        elapsed=time.time()-started
        print('VIDEO_PROGRESS',scene.frame_current,'/',scene.frame_end,'ELAPSED',round(elapsed,1),'ETA',round(elapsed/scene.frame_current*(scene.frame_end-scene.frame_current),1),flush=True)
bpy.app.handlers.render_post.append(progress)
bpy.ops.render.render(animation=True)
print('VIDEO_COMPLETE',s.render.filepath,'SECONDS',round(time.time()-started,1),flush=True)
