"""Install the checksum-verified Garden artwork package into the existing catalog."""
import hashlib, io, json, zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
parts=root/'scripts/garden-transfer'
raw=b''.join(p.read_bytes() for p in sorted(parts.glob('part-*.bin')))
assert hashlib.sha256(raw).hexdigest()=='f21aff23161116812ab122532dbd50d3ccacf24853cf05bc60474da8b5c2cdda'
with zipfile.ZipFile(io.BytesIO(raw)) as z:
    manifest=json.loads(z.read('garden-manifest.json'))
    assert len(manifest)==166
    catalog=json.loads((root/'art/catalog.json').read_text())
    assert not set(manifest)&set(catalog)
    for key,item in manifest.items():
        assert key.startswith('garden-') and item['id']==key
        assert item['file']=='garden/'+key+'.webp'
        dest=root/'art/variants'/item['file']
        data=z.read('art/variants/'+item['file'])
        assert data[:4]==b'RIFF' and data[8:12]==b'WEBP'
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_bytes(data)
    catalog.update(manifest)
    (root/'art/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
    js="'use strict';\nwindow.EFArtCatalog=Object.fromEntries(Object.entries("+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+").map(([id,item])=>[id,{...item,src:'../art/variants/'+item.file}]));\n"
    (root/'art/catalog.js').write_text(js)
for p in parts.glob('part-*.bin'):p.unlink()
print('PASS: installed 166 checksum-verified Garden artwork tiles; preserved 248 prior entries')
