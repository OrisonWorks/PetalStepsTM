import zipfile, xml.etree.ElementTree as ET, json, collections, pathlib
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
M='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
R='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
z=zipfile.ZipFile(r'PETAL STEPS - STOCK-TAKE.xlsx')
shared=[]
if 'xl/sharedStrings.xml' in z.namelist():
    root=ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in root.findall('m:si',NS):
        shared.append(''.join(t.text or '' for t in si.iter(M+'t')))
wb=ET.fromstring(z.read('xl/workbook.xml'))
rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
relmap={r.get('Id'):r.get('Target') for r in rels}
out=[]
for sh in wb.find('m:sheets',NS):
    name=sh.get('name'); rid=sh.get(R+'id'); target=relmap[rid]
    path='xl/'+target if not target.startswith('/') else target[1:]
    root=ET.fromstring(z.read(path))
    rows=[]
    for row in root.iter(M+'row'):
        vals=[]
        for c in row.findall('m:c',NS):
            t=c.get('t'); v=c.find('m:v',NS); isn=c.find('m:is',NS)
            if t=='s' and v is not None: vals.append(shared[int(v.text)])
            elif isn is not None: vals.append(''.join(x.text or '' for x in isn.iter(M+'t')))
            elif v is not None: vals.append(v.text)
            else: vals.append('')
        if any(str(x).strip() for x in vals): rows.append(vals)
    out.append({'sheet':name,'rows':rows})
pathlib.Path('stock_dump.json').write_text(json.dumps(out,indent=1),encoding='utf-8')
for s in out:
    print(s['sheet'], len(s['rows']),'rows')
    for r in s['rows'][:15]: print(r)
