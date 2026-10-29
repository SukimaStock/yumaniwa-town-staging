"""Recreate comparison.png from results.json; matplotlib only, no network."""
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

root=Path(__file__).resolve().parent
d=json.loads((root/'results.json').read_text())
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False,'axes.titleweight':'bold','figure.facecolor':'#faf8f1','axes.facecolor':'#faf8f1','savefig.facecolor':'#faf8f1'})
fig,axs=plt.subplots(2,2,figsize=(13,8.6),layout='constrained')
variants=['baseline','salience','soft','guarded'];names=['v01','A: retain axes','B: narrow focus','C: adopted'];colors=['#7b8987','#53827b','#bc7d4f','#37644b'];x=np.arange(4)
ax=axs[0,0]
for offset,key,label,color in [(-.19,'support','Broad support','#7b8987'),(.19,'strong','Strong support','#b6853b')]:
 values=[100*d['wins'][v][key]['balanced']/d['wins'][v]['groups'] for v in variants]
 bars=ax.bar(x+offset,values,width=.36,color=color,label=label)
 ax.bar_label(bars,fmt='%.1f%%',fontsize=9,padding=3)
ax.set(xticks=x,xticklabels=names,ylim=(0,110),ylabel='Matched sets won by balanced sample (%)',title='1  Balanced-sample concentration / 30 seeds')
ax.legend(loc='upper right',frameon=False,fontsize=9);ax.grid(axis='y',alpha=.15)
ax=axs[0,1]
values=[100*d['aggregate'][v]['cappedConditions']/d['aggregate'][v]['n'] for v in variants]
bars=ax.bar(names,values,color=colors);ax.bar_label(bars,fmt='%.1f%%',padding=3)
ax.set(ylim=(0,max(values)+8),ylabel='Conditions with at least one score = 1 (%)',title='2  Hard-ceiling collisions / 30 seeds')
ax.text(.02,.95,'C retains raw scores; soft compression is a scale change,\nnot evidence of better taste or stronger sales.',transform=ax.transAxes,va='top',fontsize=9,color='#44534d');ax.grid(axis='y',alpha=.15)
ax=axs[1,0]
for variant,color,name in [('baseline',colors[0],'v01'),('guarded',colors[-1],'C')]:
 rows=[r for r in d['curveAge'] if r['variant']==variant and r['aging']=='fixed' and r['shop']=='bar' and r['sample']=='sweet']
 rows=sorted(rows,key=lambda r:r['years'])
 for metric,style,label in [('support','-','support'),('strong','--','strong')]:ax.plot([r['years'] for r in rows],[100*r[metric] for r in rows],style,marker='o',color=color,label=f'{name}: {label}')
ax.set(xticks=[1,3,6,10,15,20],xlabel='Displayed age (years); 6-year flavor held fixed',ylabel='People (%)',title='3  Sweet aroma / bar / curve B / seed 20261029',ylim=(0,65));ax.legend(frameon=False,ncols=2,fontsize=9);ax.grid(alpha=.15)
ax=axs[1,1];columns=d['columns'];idx={k:i for i,k in enumerate(columns)};samples=['sweet','smoke','deep','balanced']
for offset,variant,color,name in [(-.19,'baseline',colors[0],'v01'),(.19,'guarded',colors[-1],'C')]:
 values=[]
 for sample in samples:
  rs=[r[idx['strong']] for r in d['rows'] if r[idx['variant']]==variant and r[idx['sample']]==sample and r[idx['shop']]=='specialist' and r[idx['years']]==20 and r[idx['aging']]=='actual' and r[idx['model']]=='B']
  values.append(100*sum(rs)/len(rs))
 bars=ax.bar(np.arange(4)+offset,values,width=.36,label=name,color=color);ax.bar_label(bars,fmt='%.1f',padding=3,fontsize=9)
ax.set(xticks=np.arange(4),xticklabels=['Sweet aroma','Smoke','Body','Balanced'],ylabel='Strong supporters (%)',title='4  Specialist / actual 20y / B / original 5 seeds',ylim=(0,45));ax.legend(frameon=False);ax.grid(axis='y',alpha=.15)
fig.suptitle('AmberTime whisky evaluation 0.1.1 — same bottles, seeds and people',fontsize=15,fontweight='bold')
fig.savefig(root/'comparison.png',dpi=160)
print(root/'comparison.png')
