import sys
from PIL import Image, ImageOps, ImageEnhance
source, target, channel, size = sys.argv[1:]
im=Image.open(source).convert('RGB')
if channel.endswith('_atlas'):
    cell=im.width//2
    x,y=(0,0) if channel=='metal_atlas' else (0,cell)
    im=im.crop((x+2,y+2,x+cell-2,y+cell-2))
im.thumbnail((int(size),int(size)), Image.Resampling.LANCZOS)
if channel in ('skin','hair','eye','cloth','metal_atlas','cloth_atlas'):
    im=ImageOps.grayscale(im)
    lo, hi=im.getextrema()
    # Retain the artist's painted shading while making tints independent of the source skin/hair color.
    floor={'skin':155,'hair':95,'eye':55,'cloth':105,'metal_atlas':170,'cloth_atlas':175}[channel]
    im=im.point(lambda p: floor+(p-lo)*(255-floor)/max(hi-lo,1)).convert('RGB')
im.save(target, 'JPEG', quality=88, subsampling=0, optimize=True)
