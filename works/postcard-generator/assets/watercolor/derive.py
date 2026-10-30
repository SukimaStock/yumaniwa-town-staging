from PIL import Image,ImageFilter,ImageOps
import numpy as np,base64,hashlib,json,pathlib,sys
root=pathlib.Path(__file__).resolve().parents[2];dest=root/'assets/watercolor'
src=pathlib.Path(sys.argv[1]);im=Image.open(src).convert('L').resize((512,512),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(5));a=np.asarray(im,float);lo,hi=np.percentile(a,[2,98]);v=np.clip((a-lo)/(hi-lo),0,1)
items={}
for name,alpha in [('wash-light',22+v*82),('wash-density',(1-v)*70)]:
 rgba=np.empty((512,512,4),dtype='uint8');rgba[:,:,:3]=255;rgba[:,:,3]=alpha.astype('uint8');out=Image.fromarray(rgba);p=dest/(name+'.png');out.save(p,optimize=True);data=p.read_bytes();items[name]='data:image/png;base64,'+base64.b64encode(data).decode();print(name,len(data),hashlib.sha256(data).hexdigest())
(root/'watercolor-assets.mjs').write_text('// Derived from Jonas Voland / Voxel Core Lab Water_02.png, CC0-1.0. See assets/watercolor/SOURCES.md.\nexport const washLight='+json.dumps(items['wash-light'])+';\nexport const washDensity='+json.dumps(items['wash-density'])+';\n')
print('source',hashlib.sha256(src.read_bytes()).hexdigest())
