# -*- coding: utf-8 -*-
"""Export the selected Lottie 15-3 contours and pulse timings without runtime Lottie."""
import json,pathlib,shutil
root=pathlib.Path(__file__).resolve().parent.parent
src=root/'design/lottie-loading/motions/15-3.json'
d=json.loads(src.read_text())
def path(sh):
 v=sh['ks']['k']['v']
 return 'M'+'L'.join(f'{x:g},{y:g}' for x,y in v)+('Z' if sh['ks']['k']['c'] else '')
shapes=d['layers'][1]['shapes'][0]['it']
outline=''.join(path(s) for s in shapes if s['ty']=='sh')
vertices=[v for s in shapes if s['ty']=='sh' for v in s['ks']['k']['v']]
xs,ys=zip(*vertices)
viewbox=f'{min(xs)-2:g} {min(ys)-2:g} {max(xs)-min(xs)+4:g} {max(ys)-min(ys)+4:g}'
strokes=[]
for g in d['layers'][0]['shapes']:
 sh,stroke=g['it'][:2]
 keys=stroke['o']['k']
 assert [(k['t'],k['s'][0]) for k in keys] == [(0,0),(25,65),(48,0),(72,100),(110,0),(180,0)]
 strokes.append({'d':path(sh),'width':stroke['w']['k'],'delay':0})
data={'viewBox':viewbox,'outline':outline,'strokes':strokes}
(root/'components/ui/loading-icon-data.json').write_text(json.dumps(data,separators=(',',':')))
shutil.copyfile(src,root/'public/animations/arch-double-pulse.json')
print('Exported exact selected geometry and 3-second pulse timing:',len(strokes),'paths')
