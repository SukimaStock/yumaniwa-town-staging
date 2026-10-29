"""Build exact rendered sample contact sheets with Pillow, not AI imagery."""
from PIL import Image, ImageDraw
from pathlib import Path
import json
folder=Path(__file__).resolve().parent
records=json.loads((folder/'metrics.json').read_text())
main=[r for r in records if r['id'].split('-')[0] in ['waterfront','closeup','street','square','hillside']]
variations=[r for r in records if r not in main]
def contact(rows,name,cols):
    w,h=190,270
    sheet=Image.new('RGB',(w*cols,h*((len(rows)+cols-1)//cols)),(245,242,232))
    draw=ImageDraw.Draw(sheet)
    for i,r in enumerate(rows):
        x,y=(i%cols)*w+5,(i//cols)*h+5
        with Image.open(folder/(r['id']+'.png')) as source: thumb=source.convert('RGB').resize((180,225))
        sheet.paste(thumb,(x,y))
        draw.text((x,y+229),r['id'],fill=(35,60,70))
        draw.text((x,y+245),r['palette'],fill=(75,95,95))
    sheet.quantize(colors=128).save(folder/name,optimize=True)
contact(main,'contact-40.png',8)
contact(variations,'patterns-contact.png',6)

# Same-seed before/after samples, not different-seed cherry picking.
pairs=[]
for sample in ['closeup-003','color-tonal','color-accent']:
    row=next(r for r in records if r['id']==sample)
    pairs.extend([{**row,'id':'before/'+sample},{**row,'id':sample}])
contact(pairs,'before-after.png',6)
