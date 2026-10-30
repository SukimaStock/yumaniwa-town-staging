from PIL import Image,ImageFilter,ImageOps
import numpy as np,base64,hashlib,json,pathlib,sys
root=pathlib.Path(__file__).resolve().parents[2]; dest=root/'assets/materials';dest.mkdir(parents=True,exist_ok=True)
src=pathlib.Path(sys.argv[1]);im=Image.open(src).convert('L').crop((300,400,2100,2200)).resize((768,768),Image.Resampling.LANCZOS)
a=np.asarray(im,dtype=float); low=np.asarray(im.filter(ImageFilter.GaussianBlur(18)),dtype=float); detail=low-a
# Preserve real scanned fiber relief while removing lighting/scanner color.
paper=np.clip(detail*4+9,0,55).astype('uint8');ink=np.clip((detail-1.4)*26,0,210).astype('uint8')
items={}
for name,alpha in [('paper-grain',paper),('ink-break',ink)]:
 rgba=np.empty((768,768,4),dtype='uint8');rgba[:,:,:3]=255 if name=='ink-break' else 0;rgba[:,:,3]=alpha
 out=Image.fromarray(rgba).quantize(colors=64,method=Image.Quantize.FASTOCTREE);path=dest/(name+'.png');out.save(path,optimize=True)
 data=path.read_bytes();items[name]='data:image/png;base64,'+base64.b64encode(data).decode();print(name,len(data),hashlib.sha256(data).hexdigest())
(root/'material-assets.mjs').write_text('// Derived from UrsaFrank A4 Paper Scans, CC0-1.0. See assets/materials/SOURCES.md.\nexport const paperGrain='+json.dumps(items['paper-grain'])+';\nexport const inkBreak='+json.dumps(items['ink-break'])+';\n')
print('source',hashlib.sha256(src.read_bytes()).hexdigest())
