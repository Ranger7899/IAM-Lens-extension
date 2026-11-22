"""Assemble docs/article/images/search.gif from the frames written by e2e/article-shots.spec.ts.
Frames are named NNN_<hold>.png; <hold> is the display time in units of 100 ms.
Usage: python3 scripts/article-gif.py [frames_dir] [out.gif]   (needs Pillow)"""
import sys, glob, os
from PIL import Image

frames_dir = sys.argv[1] if len(sys.argv) > 1 else "test-results-w14-frames"
out = sys.argv[2] if len(sys.argv) > 2 else "docs/article/images/search.gif"
files = sorted(glob.glob(os.path.join(frames_dir, "*.png")))
imgs, durs = [], []
for f in files:
    hold = int(os.path.basename(f).split("_")[1].split(".")[0])
    imgs.append(Image.open(f).convert("RGB").quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))
    durs.append(hold * 100 if hold > 1 else 100)
imgs[0].save(out, save_all=True, append_images=imgs[1:], duration=durs, loop=0, optimize=True, disposal=1)
print(out, os.path.getsize(out), "bytes", sum(durs) / 1000, "s")
