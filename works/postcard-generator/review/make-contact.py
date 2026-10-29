"""Create a review contact sheet from the recorded seed PNGs; Pillow only."""
from PIL import Image, ImageDraw
from pathlib import Path
import json

folder = Path(__file__).resolve().parent
records = json.loads((folder / 'metrics.json').read_text())
width, height = 210, 286
sheet = Image.new('RGB', (width * 6, height * 6), (245, 242, 232))
draw = ImageDraw.Draw(sheet)
for index, record in enumerate(records):
    with Image.open(folder / (record['seed'] + '.png')) as source:
        thumb = source.convert('RGB').resize((200, 250))
    x, y = (index % 6) * width + 5, (index // 6) * height + 5
    sheet.paste(thumb, (x, y))
    draw.text((x, y + 254), record['seed'] + ' ' + record['composition'], fill=(40, 45, 45))
    draw.text((x, y + 267), record['palette'], fill=(80, 85, 85))
sheet.save(folder / 'contact-36.png')
