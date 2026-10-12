"""Always retain actual raw JPEGs in individually bounded cloud evidence chunks."""
import hashlib,json,pathlib,tarfile

def partition(items,cap):
    chunks=[]; current=[]; size=0
    for item in items:
        if item[1]>cap:raise ValueError('single raw frame exceeds chunk cap')
        if current and size+item[1]>cap:chunks.append(current);current=[];size=0
        current.append(item);size+=item[1]
    if current:chunks.append(current)
    return chunks

if __name__=='__main__':
    out=pathlib.Path('share-artifacts');dest=pathlib.Path('raw-chunks');dest.mkdir(exist_ok=True)
    frames=sorted(out.glob('raw-*/*.jpg'))
    manifest=[{'file':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in frames]
    (dest/'raw-hashes.json').write_text(json.dumps(manifest,indent=2))
    for i,chunk in enumerate(partition([(p,p.stat().st_size) for p in frames],38*1024**2)):
        target=dest/f'part-{i:02d}.tar'
        with tarfile.open(target,'w') as tar:
            for p,_ in chunk:tar.add(p,arcname=str(p))
        assert target.stat().st_size<40*1024**2
    print(json.dumps({'rawFrames':len(frames),'rawBytes':sum(p.stat().st_size for p in frames),'chunks':len(list(dest.glob('part-*.tar')))}))
