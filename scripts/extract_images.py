import zipfile, xml.etree.ElementTree as ET, pathlib, json, re
z=zipfile.ZipFile(r'PETAL STEPS - STOCK-TAKE.xlsx')
out=pathlib.Path('public/products'); out.mkdir(parents=True, exist_ok=True)
# extract media
media={}
for n in z.namelist():
    if n.startswith('xl/media/'):
        p=out/pathlib.Path(n).name
        p.write_bytes(z.read(n))
        media[pathlib.Path(n).name]=str(p)
print('media', sorted(media))
# drawings
NS={'xdr':'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
for dname in ['xl/drawings/drawing1.xml','xl/drawings/drawing2.xml']:
    if dname not in z.namelist(): continue
    rels_name=dname.replace('xl/drawings/','xl/drawings/_rels/')+'.rels'
    relmap={}
    if rels_name in z.namelist():
        rels=ET.fromstring(z.read(rels_name))
        for r in rels: relmap[r.get('Id')]=r.get('Target')
    root=ET.fromstring(z.read(dname))
    print('---',dname, relmap)
    for anchor in root:
        # find from col/row and embed id
        frm=anchor.find('xdr:from',NS)
        col=frm.find('xdr:col',NS).text if frm is not None and frm.find('xdr:col',NS) is not None else '?'
        row=frm.find('xdr:row',NS).text if frm is not None and frm.find('xdr:row',NS) is not None else '?'
        blip=anchor.find('.//a:blip',NS)
        rid=blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed') if blip is not None else '?'
        target=relmap.get(rid,'?')
        print(f'anchor col={col} row={row} (sheet row {int(row)+1 if str(row).isdigit() else row}) -> {target}')
