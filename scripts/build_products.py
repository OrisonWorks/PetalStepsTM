import zipfile, xml.etree.ElementTree as ET, pathlib, json, re, collections
M='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
R='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','xdr':'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
z=zipfile.ZipFile(r'PETAL STEPS - STOCK-TAKE.xlsx')
shared=[]
root=ET.fromstring(z.read('xl/sharedStrings.xml'))
for si in root.findall('m:si',NS):
    shared.append(''.join(t.text or '' for t in si.iter(M+'t')))

def col_letter(ref): return re.match(r'[A-Z]+',ref).group(0)

sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
rows_by_num={}
for row in sheet.iter(M+'row'):
    rn=int(row.get('r'))
    cells={}
    for c in row.findall('m:c',NS):
        col=col_letter(c.get('r')); t=c.get('t'); v=c.find('m:v',NS); isn=c.find('m:is',NS)
        if t=='s' and v is not None: val=shared[int(v.text)]
        elif isn is not None: val=''.join(x.text or '' for x in isn.iter(M+'t'))
        elif v is not None: val=v.text
        else: val=''
        cells[col]=val
    rows_by_num[rn]=cells

# anchors: sheet row -> image file
rels=ET.fromstring(z.read('xl/drawings/_rels/drawing1.xml.rels'))
relmap={r.get('Id'):pathlib.Path(r.get('Target')).name for r in rels}
drawing=ET.fromstring(z.read('xl/drawings/drawing1.xml'))
anchor_by_row={}
for anchor in drawing:
    frm=anchor.find('xdr:from',NS)
    if frm is None: continue
    r=int(frm.find('xdr:row',NS).text)+1
    blip=anchor.find('.//a:blip',NS)
    rid=blip.get(R+'embed')
    anchor_by_row[r]=relmap[rid]
print('anchors',anchor_by_row)

# Walk rows in order, track current group image (image at or before row, closest preceding anchor)
# Group key = (model, color) using columns: B=color C=size D=count E=model (but verify)
groups={}
order=[]
sorted_rows=sorted(rows_by_num.items())
anchor_rows=sorted(anchor_by_row)
def image_for_row(rn):
    cand=[a for a in anchor_rows if a<=rn]
    return anchor_by_row[cand[-1]] if cand else None

total=0
for rn,cells in sorted_rows:
    if rn==1: continue
    color=(cells.get('B') or cells.get('A') or '').strip()
    # detect shifted rows: if B is numeric size, then A=color
    # Normal: A='' or color, B=color, C=size, D=count, E=model
    # Use positions by trying: model is last non-empty
    vals=cells
    # Heuristic: if C looks like count small and D is model? Let's print raw for debug in file
    size_raw=cells.get('C',''); count_raw=cells.get('D',''); model_raw=cells.get('E','')
    # shifted case: B=size, C=count, D=model, A=color
    if size_raw and count_raw and not model_raw:
        # check B numeric
        try:
            float(cells.get('B',''))
            color=(cells.get('A') or '').strip(); size_raw=cells.get('B',''); count_raw=cells.get('C',''); model_raw=cells.get('D','')
        except: pass
    if not color or color=='COLOR' or size_raw=='TOTAL': continue
    try: size=int(float(size_raw)); count=int(float(count_raw))
    except: 
        print('skip row',rn,cells); continue
    model=str(model_raw).strip()
    if model.endswith('.0'): model=model[:-2]
    key=(model,color)
    if key not in groups:
        groups[key]={'model':model,'color':color,'image':image_for_row(rn),'sizes':{},'firstRow':rn}
        order.append(key)
    if count>0: groups[key]['sizes'][size]=groups[key]['sizes'].get(size,0)+count
    total+=max(count,0)
    # update image if anchor exactly at group start? keep first image
print('total in-stock pairs (count>0 sum)',total)
out=[]
for key in order:
    g=groups[key]
    g['sizes']={str(k):v for k,v in sorted(g['sizes'].items())}
    g['total']=sum(g['sizes'].values())
    out.append(g)
    print(g)
pathlib.Path('stock_products.json').write_text(json.dumps(out,indent=1),encoding='utf-8')
print('groups',len(out))
