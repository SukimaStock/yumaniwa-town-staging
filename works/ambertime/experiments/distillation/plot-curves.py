"""Render the fixed experimental curves; no optimization or stop markers."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
root=Path(__file__).resolve().parent
r=json.loads((root/'curves.json').read_text())
font_path=Path('/usr/local/share/fonts/ambertime-qa/NotoSansJP.ttf')
font=FontProperties(fname=str(font_path)) if font_path.exists() else FontProperties()
plt.rcParams.update({'font.family':font.get_name(),'svg.fonttype':'path','axes.facecolor':'#f7f3e9','figure.facecolor':'#f7f3e9','axes.spines.top':False,'axes.spines.right':False,'axes.labelcolor':'#403b33','text.color':'#403b33','xtick.color':'#403b33','ytick.color':'#403b33'})
fig,ax=plt.subplots(2,2,figsize=(12,8.4),layout='constrained')
colors=['#566c70','#a36e3f','#6f7850'];names=['現行','案A','案B']
for m,name,col in zip(r['models'],names,colors):
 p=m['points'];ax[0,0].plot([v['progress'] for v in p],[v['character'] for v in p],label=name,color=col,lw=2)
ax[0,0].set(title='集めた原酒の香り',ylabel='固定0〜1（品質ではない）',ylim=(0,1));ax[0,0].legend()
p=r['models'][0]['points'];xs=[v['progress'] for v in p]
ax[0,1].plot(xs,[v['roughness'] for v in p],color=colors[0],label='刺激');ax[0,1].set(title='3モデル共通の刺激と収量',ylabel='刺激・固定0〜1',ylim=(0,1))
y=ax[0,1].twinx();y.plot(xs,[v['litres'] for v in p],color=colors[1],linestyle='--',label='収量');y.set(ylabel='収量（L）',ylim=(24,40));y.spines['right'].set_visible(True)
ax[0,1].legend(loc='upper left');y.legend(loc='lower right')
p=r['models'][2]['points'];labels=['軽さ','果実','穀物'];families=['light','fruit','grain']
for k,label,col in zip(families,labels,colors):
 ax[1,0].plot(xs,[v['instant']['components'][k] for v in p],color=col,label=label,lw=2)
 ax[1,1].plot(xs,[v['composition'][k] for v in p],color=col,label=label,lw=2)
ax[1,0].set(title='案B：いま出る留分の濃度',ylabel='任意の香り負荷/L（割合ではない）',ylim=(0,3));ax[1,0].legend()
ax[1,1].set(title='案B：24 Lを含む混合後の構成比',ylabel='集めた原酒全体での割合',ylim=(0,1));ax[1,1].legend()
for a in ax.flat:a.set_xlabel('抽出位置（最低停止30〜99）');a.set_xlim(30,99);a.grid(alpha=.15)
fig.suptitle(f'蒸留モデル比較 — 同じシード {r["seed"]} / 同じ収集量',fontproperties=font,fontsize=17)
fig.savefig(root/'curves.svg',metadata={'Description':'Experiment-only fixed-model curves. No ranking or optimum stop position.'})
print(root/'curves.svg')
